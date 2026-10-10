import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { claimsRouter } from './routes/claims';
import { defenseRouter } from './routes/defense';
import { errorHandler } from './middleware/error-handler';
import { aiService } from './services/ai-service';

const app = express();
const port = process.env.PORT || 3001;

// Global middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/defense', defenseRouter);

// Root fallback / informational endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'Proofline AI API Engine',
    version: '0.1.0',
    endpoints: {
      health: 'GET /api/health',
      extractClaims: 'POST /api/claims/extract',
      defaultClaims: 'GET /api/claims/default',
      startDefense: 'POST /api/defense/start',
      submitAnswer: 'POST /api/defense/answer',
      finishDefense: 'POST /api/defense/finish',
      getSession: 'GET /api/defense/session/:id',
    },
    mockMode: aiService.isMock(),
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server only when run directly as the main process
const isDirectRun =
  process.argv[1]?.endsWith('server/index.ts') ||
  process.argv[1]?.endsWith('server\\index.ts') ||
  process.argv[1]?.endsWith('dist-server/index.js') ||
  process.argv[1]?.endsWith('dist-server\\index.js');

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[Proofline AI] Server listening on http://localhost:${port}`);
    console.log(`[Proofline AI] Active Provider: ${aiService.getProviderType()} (Model: ${aiService.getActiveModel()})`);
  });
}

export default app;
