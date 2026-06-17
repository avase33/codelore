import mongoose from 'mongoose';

const fileNodeSchema = new mongoose.Schema(
  {
    path: String,
    name: String,
    type: { type: String, enum: ['file', 'directory'] },
    language: String,
    size: Number,
    linesOfCode: Number,
    complexity: Number, // cyclomatic complexity score
    functions: [{ name: String, startLine: Number, endLine: Number, description: String }],
    imports: [String],
    exports: [String],
  },
  { _id: false }
);

const commitSummarySchema = new mongoose.Schema(
  {
    sha: String,
    message: String,
    author: String,
    date: Date,
    filesChanged: Number,
    additions: Number,
    deletions: Number,
    summary: String, // AI-generated commit summary
  },
  { _id: false }
);

const repositorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // GitHub info
    githubRepoId: { type: String, sparse: true },
    githubOwner: { type: String, required: true },
    githubName: { type: String, required: true },
    githubUrl: String,
    defaultBranch: { type: String, default: 'main' },
    description: String,
    isPrivate: { type: Boolean, default: false },
    language: String, // primary language
    topics: [String],
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },

    // Analysis status
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'ready', 'error', 'stale'],
      default: 'pending',
    },
    lastAnalyzedAt: Date,
    analyzeJobId: String,
    errorMessage: String,

    // Code structure
    fileTree: [fileNodeSchema],
    totalFiles: { type: Number, default: 0 },
    totalLinesOfCode: { type: Number, default: 0 },
    languages: [{ name: String, percentage: Number, lines: Number }],

    // Git history summary
    recentCommits: [commitSummarySchema],
    contributorCount: { type: Number, default: 0 },
    totalCommits: { type: Number, default: 0 },

    // AI-generated insights
    architectureOverview: String,
    setupGuide: String,
    designDecisions: [{ title: String, rationale: String }],
    glossary: [{ term: String, definition: String }],

    // Tracking
    webhookSecret: String,
    webhookId: String,
    autoSync: { type: Boolean, default: true },
    syncIntervalHours: { type: Number, default: 24 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

repositorySchema.index({ owner: 1, githubName: 1 }, { unique: true });
repositorySchema.index({ status: 1 });

repositorySchema.virtual('fullName').get(function () {
  return `${this.githubOwner}/${this.githubName}`;
});

repositorySchema.virtual('isReady').get(function () {
  return this.status === 'ready';
});

export const Repository = mongoose.model('Repository', repositorySchema);
