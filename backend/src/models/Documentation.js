import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    content: String, // Markdown content
    order: Number,
    type: {
      type: String,
      enum: [
        'overview',
        'architecture',
        'setup',
        'api_reference',
        'contributing',
        'changelog',
        'decision_log',
        'glossary',
        'custom',
      ],
    },
    lastGeneratedAt: Date,
    generationTokensUsed: Number,
    userEdited: { type: Boolean, default: false },
  },
  { _id: false }
);

const documentationSchema = new mongoose.Schema(
  {
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    slug: { type: String, required: true }, // URL-friendly
    description: String,

    // Branch/commit the docs were generated from
    branch: { type: String, default: 'main' },
    commitSha: String,

    // Generation state
    status: {
      type: String,
      enum: ['draft', 'generating', 'published', 'error', 'outdated'],
      default: 'draft',
    },
    generationProgress: { type: Number, default: 0, min: 0, max: 100 },
    totalTokensUsed: { type: Number, default: 0 },
    lastGeneratedAt: Date,
    generationError: String,

    // Content sections
    sections: [sectionSchema],

    // Settings
    includePrivate: { type: Boolean, default: false },
    autoRegenerate: { type: Boolean, default: true },
    regenerateOnPush: { type: Boolean, default: true },

    // Visibility
    isPublic: { type: Boolean, default: false },
    publishedUrl: String,

    // Engagement
    views: { type: Number, default: 0 },
    lastViewedAt: Date,

    // Version history
    version: { type: Number, default: 1 },
    previousVersions: [
      {
        version: Number,
        commitSha: String,
        generatedAt: Date,
        summary: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

documentationSchema.index({ repository: 1, slug: 1 }, { unique: true });
documentationSchema.index({ owner: 1, status: 1 });
documentationSchema.index({ isPublic: 1, status: 1 });

documentationSchema.methods.incrementViews = function () {
  this.views += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

documentationSchema.methods.getSectionByType = function (type) {
  return this.sections.find((s) => s.type === type);
};

export const Documentation = mongoose.model('Documentation', documentationSchema);
