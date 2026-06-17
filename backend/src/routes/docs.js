import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { Documentation } from '../models/Documentation.js';
import { Repository } from '../models/Repository.js';

const router = Router();

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', errors: errors.array() });
    return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /docs — list user's documentation pages
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { owner: req.user._id };
    if (status) filter.status = status;

    const docs = await Documentation.find(filter)
      .populate('repository', 'githubOwner githubName language stars status')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Documentation.countDocuments(filter);
    res.json({ docs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /docs/public — browse public docs
// ──────────────────────────────────────────────────────────────────────────────
router.get('/public', optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const docs = await Documentation.find({ isPublic: true, status: 'published' })
      .populate('repository', 'githubOwner githubName language stars description')
      .populate('owner', 'username avatarUrl')
      .sort({ views: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Documentation.countDocuments({ isPublic: true, status: 'published' });
    res.json({ docs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /docs/:id — get a documentation page
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const doc = await Documentation.findById(req.params.id)
      .populate('repository', 'githubOwner githubName language stars description topics defaultBranch')
      .populate('owner', 'username fullName avatarUrl');

    if (!doc) return res.status(404).json({ error: 'Documentation not found' });

    // Access control: private docs require ownership
    if (!doc.isPublic) {
      if (!req.user || doc.owner._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Increment views asynchronously
    doc.incrementViews().catch(() => {});

    res.json({ doc });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /docs/repo/:repoId — get docs for a repo
// ──────────────────────────────────────────────────────────────────────────────
router.get('/repo/:repoId', authenticate, async (req, res, next) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    const doc = await Documentation.findOne({ repository: repo._id })
      .populate('repository', 'githubOwner githubName language');
    if (!doc) return res.status(404).json({ error: 'No documentation generated yet' });

    res.json({ doc });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /docs/:id — update doc settings or edit a section
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  authenticate,
  [
    body('isPublic').optional().isBoolean(),
    body('title').optional().isLength({ min: 1, max: 200 }),
    body('description').optional().isLength({ max: 500 }),
    body('autoRegenerate').optional().isBoolean(),
    body('section').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const doc = await Documentation.findOne({ _id: req.params.id, owner: req.user._id });
      if (!doc) return res.status(404).json({ error: 'Documentation not found' });

      const { isPublic, title, description, autoRegenerate, section } = req.body;
      if (isPublic !== undefined) doc.isPublic = isPublic;
      if (title !== undefined) doc.title = title;
      if (description !== undefined) doc.description = description;
      if (autoRegenerate !== undefined) doc.autoRegenerate = autoRegenerate;

      // Edit individual section content
      if (section) {
        const existing = doc.sections.find((s) => s.id === section.id);
        if (existing) {
          if (section.content !== undefined) {
            existing.content = section.content;
            existing.userEdited = true;
          }
          if (section.title !== undefined) existing.title = section.title;
        }
      }

      await doc.save();
      res.json({ doc });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /docs/:id — delete documentation
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const doc = await Documentation.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Documentation not found' });
    res.json({ message: 'Documentation deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
