import Bull from 'bull';
import config from '../config/index.js';
import { analyzeRepository } from '../services/analysisService.js';

export const analysisQueue = new Bull('repo-analysis', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

analysisQueue.process(2, async (job) => {
  const { repositoryId, githubToken } = job.data;
  console.log(`[Queue] Processing analysis for repo ${repositoryId}`);

  const result = await analyzeRepository(repositoryId, githubToken);
  console.log(`[Queue] Analysis complete for repo ${repositoryId}`);
  return result;
});

analysisQueue.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} failed:`, err.message);
});

analysisQueue.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} completed`);
});

export async function enqueueAnalysis(repositoryId, githubToken) {
  const job = await analysisQueue.add(
    { repositoryId: repositoryId.toString(), githubToken },
    { jobId: `analyze-${repositoryId}` }
  );
  return job.id;
}
