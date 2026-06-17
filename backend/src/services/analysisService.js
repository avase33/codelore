import {
  getOctokit,
  fetchRepoMeta,
  fetchFileTree,
  fetchFileContent,
  fetchRecentCommits,
  fetchCommitStats,
  fetchContributorCount,
  detectLanguages,
} from './githubService.js';
import {
  generateArchitectureOverview,
  generateSetupGuide,
  generateApiReference,
  summarizeCommits,
  generateGlossary,
  inferDesignDecisions,
} from './aiService.js';
import { Repository } from '../models/Repository.js';
import { Documentation } from '../models/Documentation.js';

/**
 * Full repository analysis pipeline.
 * Called by the Bull job worker.
 */
export async function analyzeRepository(repositoryId, githubToken) {
  const repo = await Repository.findById(repositoryId);
  if (!repo) throw new Error(`Repository ${repositoryId} not found`);

  const octokit = getOctokit(githubToken);

  try {
    // 1. Update status
    repo.status = 'analyzing';
    await repo.save();

    // 2. Fetch repo metadata
    const meta = await fetchRepoMeta(octokit, repo.githubOwner, repo.githubName);
    Object.assign(repo, meta);

    // 3. Fetch file tree
    const rawTree = await fetchFileTree(octokit, repo.githubOwner, repo.githubName, meta.defaultBranch);
    const languages = detectLanguages(rawTree);
    repo.fileTree = rawTree.slice(0, 1000); // cap at 1000 nodes stored
    repo.totalFiles = rawTree.filter((n) => n.type === 'file').length;
    repo.languages = languages;

    // 4. Fetch README
    const readmeContent = await fetchFileContent(
      octokit,
      repo.githubOwner,
      repo.githubName,
      'README.md',
      meta.defaultBranch
    );

    // 5. Fetch recent commits
    const commits = await fetchRecentCommits(octokit, repo.githubOwner, repo.githubName, 20);

    // Enrich top 5 commits with stats
    for (let i = 0; i < Math.min(commits.length, 5); i++) {
      try {
        const stats = await fetchCommitStats(octokit, repo.githubOwner, repo.githubName, commits[i].sha);
        Object.assign(commits[i], stats);
      } catch {
        // Non-fatal
      }
    }
    repo.recentCommits = commits;
    repo.totalCommits = commits.length;
    repo.contributorCount = await fetchContributorCount(octokit, repo.githubOwner, repo.githubName);

    // 6. AI generation — architecture overview
    const archResult = await generateArchitectureOverview(meta, rawTree, readmeContent);
    repo.architectureOverview = archResult.content;

    // 7. AI — setup guide
    const setupResult = await generateSetupGuide(meta, rawTree, readmeContent);
    repo.setupGuide = setupResult.content;

    // 8. AI — design decisions
    const decisionsResult = await inferDesignDecisions(meta, commits, readmeContent);
    repo.designDecisions = decisionsResult.decisions;

    // 9. AI — glossary
    const glossaryResult = await generateGlossary(meta, rawTree, readmeContent);
    repo.glossary = glossaryResult.terms;

    // 10. AI — commit summaries
    const commitSummaries = await summarizeCommits(commits);
    for (const summary of commitSummaries) {
      const c = repo.recentCommits.find((rc) => rc.sha === summary.sha);
      if (c) c.summary = summary.summary;
    }

    // 11. Find route files for API reference
    const routeFiles = rawTree.filter(
      (f) =>
        f.type === 'file' &&
        (f.path.includes('/routes/') ||
          f.path.includes('/controllers/') ||
          f.path.includes('/api/') ||
          f.name.endsWith('.routes.js') ||
          f.name.endsWith('.router.js'))
    );

    let apiRefContent = '';
    if (routeFiles.length > 0) {
      const routeContents = await Promise.all(
        routeFiles.slice(0, 5).map((f) =>
          fetchFileContent(octokit, repo.githubOwner, repo.githubName, f.path, meta.defaultBranch)
        )
      );
      apiRefContent = routeContents.filter(Boolean).join('\n\n// ---\n\n');
    }

    // 12. Create/update Documentation record
    let doc = await Documentation.findOne({ repository: repo._id });
    if (!doc) {
      const slug = `${repo.githubOwner}-${repo.githubName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      doc = new Documentation({
        repository: repo._id,
        owner: repo.owner,
        title: `${repo.githubName} Documentation`,
        slug,
        branch: meta.defaultBranch,
        commitSha: commits[0]?.sha,
      });
    }

    doc.status = 'generating';
    doc.generationProgress = 50;
    await doc.save();

    // Build sections
    const sections = [
      {
        id: 'overview',
        title: 'Architecture Overview',
        content: archResult.content,
        order: 1,
        type: 'architecture',
        lastGeneratedAt: new Date(),
        generationTokensUsed: archResult.tokensUsed,
        userEdited: false,
      },
      {
        id: 'setup',
        title: 'Setup & Getting Started',
        content: setupResult.content,
        order: 2,
        type: 'setup',
        lastGeneratedAt: new Date(),
        generationTokensUsed: setupResult.tokensUsed,
        userEdited: false,
      },
    ];

    if (apiRefContent) {
      const apiRefResult = await generateApiReference(apiRefContent);
      sections.push({
        id: 'api',
        title: 'API Reference',
        content: apiRefResult.content,
        order: 3,
        type: 'api_reference',
        lastGeneratedAt: new Date(),
        generationTokensUsed: apiRefResult.tokensUsed,
        userEdited: false,
      });
    }

    if (decisionsResult.decisions.length > 0) {
      const decisionContent = decisionsResult.decisions
        .map((d) => `### ${d.title}\n\n${d.rationale}`)
        .join('\n\n---\n\n');
      sections.push({
        id: 'decisions',
        title: 'Design Decisions',
        content: `# Design Decision Log\n\n${decisionContent}`,
        order: 4,
        type: 'decision_log',
        lastGeneratedAt: new Date(),
        generationTokensUsed: decisionsResult.tokensUsed,
        userEdited: false,
      });
    }

    if (glossaryResult.terms.length > 0) {
      const glossaryContent = glossaryResult.terms
        .map((t) => `**${t.term}** — ${t.definition}`)
        .join('\n\n');
      sections.push({
        id: 'glossary',
        title: 'Glossary',
        content: `# Glossary\n\n${glossaryContent}`,
        order: 5,
        type: 'glossary',
        lastGeneratedAt: new Date(),
        generationTokensUsed: glossaryResult.tokensUsed,
        userEdited: false,
      });
    }

    doc.sections = sections;
    doc.totalTokensUsed = sections.reduce((acc, s) => acc + (s.generationTokensUsed || 0), 0);
    doc.status = 'published';
    doc.generationProgress = 100;
    doc.lastGeneratedAt = new Date();
    await doc.save();

    // 13. Mark repo ready
    repo.status = 'ready';
    repo.lastAnalyzedAt = new Date();
    await repo.save();

    return { repositoryId: repo._id, documentationId: doc._id };
  } catch (err) {
    repo.status = 'error';
    repo.errorMessage = err.message;
    await repo.save();
    throw err;
  }
}
