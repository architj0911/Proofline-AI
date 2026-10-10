import { Router, Request, Response } from 'express';
import { HealthCheckResponse } from '../../src/types';
import { aiService } from '../services/ai-service';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response<HealthCheckResponse>) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    mockMode: aiService.isMock(),
    activeProvider: aiService.getProviderType(),
    fallbackProvider: aiService.getFallbackProviderType(),
    model: aiService.getActiveModel(),
    fallbackModel: aiService.getFallbackModel(),
    service: 'Proofline AI Engine',
    version: '0.1.0',
  });
});
