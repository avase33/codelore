import { Octokit } from '@octokit/rest';

/**
 * Build an Octokit client for a user (using their stored GitHub token)
 * or an unauthenticated one for public repos.
 */
export function getOctokit(token) {
  return new Octokit({ auth: token });
}

/**
 * Fetch basic repo metadata.
 */
export async function fetchRepoMeta(octokit, owner, repo) {
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    githubRepoId: String(data.id),
    githubOwner: data.owner.login,
    githubName: data.name,
    githubUrl: data.html_url,
    defaultBranch: data.default_branch,
    description: data.description,
    isPrivate: data.private,
    language: data.language,
    topics: data.topics || [],
    stars: data.stargazers_count,
    forks: data.forks_count,
  };
}

/**
 * Recursively fetch the file tree from the GitHub tree API.
 * Returns flat array of { path, type, size }.
 */
export async function fetchFileTree(octokit, owner, repo, branch = 'main') {
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: 'true',
  });

  return data.tree
    .filter((node) => ['blob', 'tree'].includes(node.type))
    .map((node) => ({
      path: node.path,
      name: node.path.split('/').pop(),
      type: node.type === 'blob' ? 'file' : 'directory',
      size: node.size || 0,
    }));
}

/**
 * Fetch raw file content (decoded from base64).
 */
export async function fetchFileContent(octokit, owner, repo, path, ref = 'main') {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return data.content;
  } catch {
    return null;
  }
}

/**
 * Fetch recent commits from the default branch.
 */
export async function fetchRecentCommits(octokit, owner, repo, perPage = 30) {
  const { data } = await octokit.repos.listCommits({ owner, repo, per_page: perPage });
  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name || c.author?.login || 'Unknown',
    date: new Date(c.commit.author?.date),
    filesChanged: 0, // populated separately for performance
    additions: 0,
    deletions: 0,
  }));
}

/**
 * Fetch commit stats for a single commit sha.
 */
export async function fetchCommitStats(octokit, owner, repo, sha) {
  const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha });
  return {
    filesChanged: data.files?.length || 0,
    additions: data.stats?.additions || 0,
    deletions: data.stats?.deletions || 0,
  };
}

/**
 * Fetch contributor count.
 */
export async function fetchContributorCount(octokit, owner, repo) {
  try {
    const { data } = await octokit.repos.listContributors({ owner, repo, per_page: 1, anon: '1' });
    // Total is in the link header; use data length as minimum
    return data.length;
  } catch {
    return 0;
  }
}

/**
 * Exchange a GitHub OAuth code for an access token.
 */
export async function exchangeGitHubCode(code, clientId, clientSecret) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

/**
 * Fetch authenticated GitHub user profile.
 */
export async function fetchGitHubUser(token) {
  const octokit = getOctokit(token);
  const { data } = await octokit.users.getAuthenticated();
  return {
    id: String(data.id),
    login: data.login,
    name: data.name || data.login,
    email: data.email,
    avatarUrl: data.avatar_url,
    bio: data.bio,
  };
}

/**
 * List user's GitHub repos (paginated, sorted by recently pushed).
 */
export async function listUserRepos(token, page = 1, perPage = 30) {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'pushed',
    direction: 'desc',
    per_page: perPage,
    page,
  });
  return data.map((r) => ({
    id: String(r.id),
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    isPrivate: r.private,
    stars: r.stargazers_count,
    updatedAt: r.updated_at,
    defaultBranch: r.default_branch,
  }));
}

/**
 * Detect primary language and language breakdown from file tree.
 */
export function detectLanguages(fileNodes) {
  const extMap = {
    js: 'JavaScript', ts: 'TypeScript', jsx: 'JavaScript', tsx: 'TypeScript',
    py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
    cpp: 'C++', c: 'C', cs: 'C#', php: 'PHP', swift: 'Swift',
    kt: 'Kotlin', scala: 'Scala', hs: 'Haskell', ex: 'Elixir',
    sh: 'Shell', bash: 'Shell', md: 'Markdown', html: 'HTML', css: 'CSS',
    scss: 'SCSS', yaml: 'YAML', yml: 'YAML', json: 'JSON',
  };

  const counts = {};
  for (const node of fileNodes) {
    if (node.type !== 'file') continue;
    const ext = node.name.split('.').pop()?.toLowerCase();
    const lang = extMap[ext];
    if (lang) counts[lang] = (counts[lang] || 0) + 1;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, lines]) => ({ name, lines, percentage: Math.round((lines / total) * 100) }));
}
