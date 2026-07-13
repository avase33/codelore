// Documentation routes -- 2026-07-13 17:37:48
import { Router } from 'express';
import { DocModel } from '../models/Document';
import { analyzeFile } from '../utils/ast';
import { generateMarkdown } from '../services/docGenerator';

const router = Router();

router.get('/repos/:repoId/docs', async (req, res) => {
  try {
    const docs = await DocModel.find({ repoId: req.params.repoId }).select('-content');
    res.json({ docs, count: docs.length });
  } catch { res.status(500).json({ error: 'Failed to fetch docs' }); }
});

router.post('/repos/:repoId/generate', async (req, res) => {
  try {
    const { filePath, sourceCode, commitSha } = req.body;
    const analysis = analyzeFile(filePath, sourceCode);
    const doc = generateMarkdown(analysis);
    await DocModel.findOneAndUpdate(
      { repoId: req.params.repoId, filePath },
      { content: doc.markdown, linesOfCode: doc.linesOfCode, functionCount: doc.functionCount, lastCommitSha: commitSha, outdated: false, generatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, functionCount: doc.functionCount, linesOfCode: doc.linesOfCode });
  } catch (err) { res.status(400).json({ error: 'Failed to generate doc' }); }
});

router.get('/repos/:repoId/docs/:filePath', async (req, res) => {
  try {
    const doc = await DocModel.findOne({ repoId: req.params.repoId, filePath: decodeURIComponent(req.params.filePath) });
    if (!doc) return res.status(404).json({ error: 'Doc not found' });
    res.json(doc);
  } catch { res.status(500).json({ error: 'Failed to fetch doc' }); }
});

export default router;