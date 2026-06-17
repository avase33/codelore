import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { issueTokenPair, verifyRefreshToken, signAccessToken } from '../services/tokenService.js';
import { fetchGitHubUser, exchangeGitHubCode } from '../services/githubService.js';
import config from '../config/index.js';

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', errors: errors.array() });
    return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /auth/register
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isAlphanumeric().isLength({ min: 3, max: 32 }),
    body('password').isLength({ min: 8 }),
    body('fullName').optional().isLength({ max: 128 }),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const { email, username, password, fullName } = req.body;

      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) {
        return res.status(409).json({
          error: exists.email === email ? 'Email already registered' : 'Username taken',
        });
      }

      const user = new User({ email, username, fullName, passwordHash: password });
      await user.save();

      const tokens = issueTokenPair(user._id);
      res.status(201).json({ user, ...tokens });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /auth/login
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      const tokens = issueTokenPair(user._id);
      res.json({ user, ...tokens });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh
// ──────────────────────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ accessToken: signAccessToken(user._id), tokenType: 'Bearer' });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /auth/github — redirect to GitHub OAuth
// ──────────────────────────────────────────────────────────────────────────────
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    scope: 'read:user user:email repo',
    redirect_uri: `${req.protocol}://${req.get('host')}/api/v1/auth/github/callback`,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /auth/github/callback
// ──────────────────────────────────────────────────────────────────────────────
router.get('/github/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing OAuth code' });

    const token = await exchangeGitHubCode(
      code,
      config.github.clientId,
      config.github.clientSecret
    );
    const ghUser = await fetchGitHubUser(token);

    let user = await User.findOne({ githubId: ghUser.id });
    if (!user) {
      // Try to link to existing email
      user = await User.findOne({ email: ghUser.email });
      if (user) {
        user.githubId = ghUser.id;
        user.githubToken = token;
        user.githubUsername = ghUser.login;
        user.avatarUrl = user.avatarUrl || ghUser.avatarUrl;
      } else {
        // Create new user
        const username = await generateUniqueUsername(ghUser.login);
        user = new User({
          email: ghUser.email || `${ghUser.login}@github.noemail`,
          username,
          fullName: ghUser.name,
          avatarUrl: ghUser.avatarUrl,
          bio: ghUser.bio,
          githubId: ghUser.id,
          githubToken: token,
          githubUsername: ghUser.login,
          emailVerified: !!ghUser.email,
        });
      }
      await user.save();
    } else {
      // Update token
      user.githubToken = token;
      user.avatarUrl = ghUser.avatarUrl;
      await user.save();
    }

    const tokens = issueTokenPair(user._id);
    // Redirect to frontend with tokens
    const frontendUrl = config.cors.origins[0];
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  } catch (err) {
    next(err);
  }
});

async function generateUniqueUsername(base) {
  let username = base.replace(/[^a-zA-Z0-9]/g, '');
  let exists = await User.findOne({ username });
  if (!exists) return username;
  let i = 1;
  while (exists) {
    username = `${base}${i}`;
    exists = await User.findOne({ username });
    i++;
  }
  return username;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /auth/me
// ──────────────────────────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /auth/me
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  '/me',
  authenticate,
  [
    body('fullName').optional().isLength({ max: 128 }),
    body('bio').optional().isLength({ max: 512 }),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const { fullName, bio, avatarUrl } = req.body;
      const user = req.user;
      if (fullName !== undefined) user.fullName = fullName;
      if (bio !== undefined) user.bio = bio;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      await user.save();
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
