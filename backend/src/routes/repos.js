import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { Repository } from '../models/Repository.js';
import { Documentation } from '../models/Documentation.js';
import { enqueueAnalysis } from '../jobs/analysisQueue.js';
import { listUserRepos } from '../services/githubService.js';

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
// GET /repos — list user's connected repos
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const repos = await Repository.find({ owner: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ repos, total: repos.length });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /repos/github — list user's GitHub repos (from GitHub API)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/github', authenticate, async (req, res, next) => {
  try {
    if (!req.user.githubToken) {
      return res.status(400).json({ error: 'GitHub account not connected. Use GitHub OAuth to connect.' });
    }
    const page = parseInt(req.query.page || '1', 10);
    const repos = await listUserRepos(req.user.githubToken, page, 30);

    // Mark which ones are already connected
    const connected = await Repository.find({ owner: req.user._id }).select('githubRepoId').lean();
    const connectedIds = new Set(connected.map((r) => r.githubRepoId));

    const result = repos.map((r) => ({ ...r, connected: connectedIds.has(r.id) }));
    res.json({ repos: result, page });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /repos — connect a repo and trigger analysis
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  [
    body('githubOwner').notEmpty().trim(),
    body('githubName').notEmpty().trim(),
    body('autoSync').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      if (!req.user.githubToken) {
        return res.status(400).json({ error: 'GitHub account not connected' });
      }

      const { githubOwner, githubName, autoSync = true } = req.body;

      // Check already connected
      const existing = await Repository.findOne({
        owner: req.user._id,
        githubOwner,
        githubName,
      });
      if (existing) {
        return res.status(409).json({ error: 'Repository already connected', repo: existing });
      }

      const repo = await Repository.create({
        owner: req.user._id,
        githubOwner,
        githubName,
        status: 'pending',
        autoSync,
      });

      // Enqueue analysis
      const jobId = await enqueueAnalysis(repo._id, req.user.githubToken);
      repo.analyzeJobId = jobId;
      await repo.save();

      // Increment user counter
      req.user.reposConnected += 1;
      await req.user.save();

      res.status(202).json({ repo, jobId, message: 'Analysis enqueued' });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /repos/:id — get repo details
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.id, owner: req.user._id });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    res.json({ repo });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /repos/:id/reanalyze — trigger re-analysis
// ──────────────────────────────────────────────────────────────────────────────
router.post('/:id/reanalyze', authenticate, async (req, res, next) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.id, owner: req.user._id });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    if (!req.user.githubToken) {
      return res.status(400).json({ error: 'GitHub account not connected' });
    }

    if (repo.status === 'analyzing') {
      return res.status(409).json({ error: 'Analysis already in progress' });
    }

    repo.status = 'pending';
    repo.errorMessage = undefined;
    await repo.save();

    const jobId = await enqueueAnalysis(repo._id, req.user.githubToken);
    repo.analyzeJobId = jobId;
    await repo.save();

    res.json({ message: 'Re-analysis enqueued', jobId });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /repos/:id — update settings
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  authenticate,
  [
    body('autoSync').optional().isBoolean(),
    body('syncIntervalHours').optional().isInt({ min: 1, max: 168 }),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const repo = await Repository.findOne({ _id: req.params.id, owner: req.user._id });
      if (!repo) return res.status(404).json({ error: 'Repository not found' });

      const { autoSync, syncIntervalHours } = req.body;
      if (autoSync !== undefined) repo.autoSync = autoSync;
      if (syncIntervalHours !== undefined) repo.syncIntervalHours = syncIntervalHours;
      await repo.save();

      res.json({ repo });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /repos/:id — disconnect repo
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const repo = await Repository.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    // Clean up docs
    await Documentation.deleteMany({ repository: repo._id });

    req.user.reposConnected = Math.max(0, req.user.reposConnected - 1);
    await req.user.save();

    res.json({ message: 'Repository disconnected' });
  } catch (err) {
    next(err);
  }
});

export default router;
