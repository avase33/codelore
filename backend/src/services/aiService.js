import OpenAI from 'openai';
import config from '../config/index.js';

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

async function chat(systemPrompt, userPrompt, maxTokens = config.openai.maxTokens) {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.4,
  });
  return {
    content: response.choices[0].message.content,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

/**
 * Generate an architecture overview section from the repo's file tree and README.
 */
export async function generateArchitectureOverview(repoMeta, fileTree, readmeContent) {
  const fileList = fileTree
    .filter((f) => f.type === 'file')
    .slice(0, 200)
    .map((f) => f.path)
    .join('\n');

  const systemPrompt = `You are a senior software architect writing clear, concise technical documentation.
Write in Markdown. Be concrete and specific. Avoid generic filler phrases.
Focus on what makes this project unique architecturally.`;

  const userPrompt = `Generate an Architecture Overview for a GitHub repository.

**Repository:** ${repoMeta.githubOwner}/${repoMeta.githubName}
**Description:** ${repoMeta.description || 'Not provided'}
**Primary Language:** ${repoMeta.language || 'Unknown'}
**Topics:** ${repoMeta.topics?.join(', ') || 'None'}

**File Structure (first 200 files):**
\`\`\`
${fileList}
\`\`\`

**README (truncated to 2000 chars):**
${(readmeContent || '').slice(0, 2000)}

Write a 400-600 word architecture overview covering:
1. What the project does (2-3 sentences)
2. High-level architecture (layers, major components)
3. Key design patterns used
4. Data flow
5. External dependencies and why they were chosen

Use markdown headers and a mermaid diagram if appropriate.`;

  return chat(systemPrompt, userPrompt, 1200);
}

/**
 * Generate a setup / getting started guide.
 */
export async function generateSetupGuide(repoMeta, fileTree, readmeContent) {
  const hasDocker = fileTree.some(
    (f) => f.name === 'Dockerfile' || f.name === 'docker-compose.yml'
  );
  const hasMakefile = fileTree.some((f) => f.name === 'Makefile');
  const packageFiles = fileTree
    .filter((f) => ['package.json', 'requirements.txt', 'Pipfile', 'go.mod', 'Cargo.toml'].includes(f.name))
    .map((f) => f.path);

  const systemPrompt = `You are a developer advocate writing a crystal-clear setup guide.
Write step-by-step instructions that a developer unfamiliar with this project can follow.
Be very concrete. Include exact commands. Use Markdown code blocks.`;

  const userPrompt = `Generate a Setup & Getting Started guide for:

**Repo:** ${repoMeta.githubOwner}/${repoMeta.githubName}
**Language:** ${repoMeta.language}
**Has Docker:** ${hasDocker}
**Has Makefile:** ${hasMakefile}
**Package/dependency files:** ${packageFiles.join(', ') || 'none detected'}

**README excerpt:**
${(readmeContent || '').slice(0, 3000)}

Generate a setup guide with these sections:
## Prerequisites
## Installation
## Configuration (environment variables)
## Running Locally
${hasDocker ? '## Running with Docker' : ''}
## Running Tests
## Common Issues

Be specific. Use exact commands. Max 600 words.`;

  return chat(systemPrompt, userPrompt, 1200);
}

/**
 * Generate API reference documentation from route files.
 */
export async function generateApiReference(routeFilesContent) {
  if (!routeFilesContent || routeFilesContent.length === 0) {
    return { content: '> No route files detected.', tokensUsed: 0 };
  }

  const systemPrompt = `You are a technical writer creating API reference documentation.
Analyze the route/controller code and produce clear endpoint documentation.
Use Markdown tables and code blocks.`;

  const userPrompt = `Generate API Reference documentation from these route files:

${routeFilesContent.slice(0, 4000)}

For each endpoint document:
- Method + path
- Description
- Request params/body (with types)
- Response format
- Example request (curl)
- Authentication required (yes/no)

Group endpoints by resource/tag.`;

  return chat(systemPrompt, userPrompt, 2000);
}

/**
 * Generate summaries for recent commits.
 */
export async function summarizeCommits(commits) {
  if (!commits || commits.length === 0) return [];

  const systemPrompt = `You are a developer writing concise, informative commit summaries.
Each summary should be 1-2 sentences explaining WHAT changed and WHY (if inferable).`;

  const results = [];
  // Batch 5 commits at a time to save tokens
  const batches = [];
  for (let i = 0; i < Math.min(commits.length, 15); i += 5) {
    batches.push(commits.slice(i, i + 5));
  }

  for (const batch of batches) {
    const userPrompt = batch
      .map(
        (c, i) =>
          `Commit ${i + 1}: "${c.message}"\nFiles changed: ${c.filesChanged}, +${c.additions} -${c.deletions}`
      )
      .join('\n\n');

    const prompt = `Summarize each of these commits in 1-2 sentences:\n\n${userPrompt}\n\nReturn as a JSON array of strings, one per commit.`;

    try {
      const { content, tokensUsed } = await chat(systemPrompt, prompt, 400);
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      for (let i = 0; i < batch.length; i++) {
        results.push({ sha: batch[i].sha, summary: parsed[i] || batch[i].message, tokensUsed });
      }
    } catch {
      for (const c of batch) {
        results.push({ sha: c.sha, summary: c.message, tokensUsed: 0 });
      }
    }
  }

  return results;
}

/**
 * Generate a glossary of project-specific terms from code and README.
 */
export async function generateGlossary(repoMeta, fileTree, readmeContent) {
  const systemPrompt = `You are a technical writer creating a project glossary.
Extract domain-specific terms, acronyms, and concepts from the codebase.
Explain each in simple, clear language.`;

  const userPrompt = `Create a glossary for the ${repoMeta.githubOwner}/${repoMeta.githubName} project.

**README:**
${(readmeContent || '').slice(0, 2000)}

**Key files:** ${fileTree
    .filter((f) => f.type === 'file')
    .slice(0, 30)
    .map((f) => f.name)
    .join(', ')}

Return a JSON array of {"term": "...", "definition": "..."} objects. Include 8-15 terms.
Focus on project-specific terms, not generic programming concepts.`;

  try {
    const { content, tokensUsed } = await chat(systemPrompt, userPrompt, 800);
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
    return { terms: parsed, tokensUsed };
  } catch {
    return { terms: [], tokensUsed: 0 };
  }
}

/**
 * Infer design decisions from git history and architecture.
 */
export async function inferDesignDecisions(repoMeta, commits, readmeContent) {
  const systemPrompt = `You are a software architect reconstructing the "why" behind code decisions.
Based on the commit history and project context, infer the key design decisions made.`;

  const commitMessages = commits
    .slice(0, 20)
    .map((c) => `- ${c.message}`)
    .join('\n');

  const userPrompt = `Identify key design decisions for ${repoMeta.githubOwner}/${repoMeta.githubName}.

**Recent commit messages:**
${commitMessages}

**README excerpt:**
${(readmeContent || '').slice(0, 1500)}

Return a JSON array of {"title": "...", "rationale": "..."} objects. 4-7 decisions.
Each rationale should explain what trade-offs were considered.`;

  try {
    const { content, tokensUsed } = await chat(systemPrompt, userPrompt, 600);
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
    return { decisions: parsed, tokensUsed };
  } catch {
    return { decisions: [], tokensUsed: 0 };
  }
}
