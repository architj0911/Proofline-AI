import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai-service';
import { sessionStore } from '../services/session-store';
import {
  StartDefenseResponse,
  AnswerDefenseResponse,
  FinishDefenseResponse,
} from '../../src/types';
import { authenticateToken } from '../middleware/auth';
import { defenseRateLimiter } from '../middleware/rate-limiter';

export const defenseRouter = Router();

// Apply token extraction middleware across defense endpoints
defenseRouter.use(authenticateToken);

const StartDefenseInput = z.object({
  claimIds: z
    .array(z.string().min(1, 'Claim ID cannot be empty'))
    .min(1, 'At least one claim ID must be selected')
    .max(20, 'Cannot select more than 20 claims simultaneously'),
  claims: z.array(z.any()).optional(),
});

const AnswerDefenseInput = z.object({
  sessionId: z.string().min(1, 'Session ID is required').max(100),
  claimId: z.string().min(1, 'Claim ID is required').max(100),
  questionId: z.string().min(1, 'Question ID is required').max(100),
  answerText: z
    .string()
    .min(1, 'Answer text cannot be empty')
    .max(5000, 'Answer text cannot exceed 5,000 characters'),
});

const FinishDefenseInput = z.object({
  sessionId: z.string().min(1, 'Session ID is required').max(100),
});

// Helper for verifying session ownership
function checkSessionOwnership(
  sessionUserId: string | null | undefined,
  currentUserId: string | undefined,
  res: Response
): boolean {
  if (sessionUserId) {
    if (!currentUserId) {
      res.status(401).json({
        error: 'Authentication required. This defense session is owned by a registered user.',
      });
      return false;
    }
    if (sessionUserId !== currentUserId) {
      res.status(403).json({
        error: 'Access denied. You do not have permission to access or modify this defense session.',
      });
      return false;
    }
  }
  return true;
}

// POST /api/defense/start
defenseRouter.post(
  '/start',
  async (req: Request, res: Response<StartDefenseResponse>, next: NextFunction) => {
    try {
      const { claimIds, claims } = StartDefenseInput.parse(req.body);
      const { session, firstQuestion } = await aiService.startDefense(claimIds, claims);

      // Track session owner if caller is authenticated
      session.userId = req.user ? req.user.id : null;

      await sessionStore.save(session);

      res.status(201).json({
        session,
        firstQuestion,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/defense/answer
defenseRouter.post(
  '/answer',
  defenseRateLimiter,
  async (req: Request, res: Response<AnswerDefenseResponse>, next: NextFunction) => {
    try {
      const { sessionId, claimId, questionId, answerText } = AnswerDefenseInput.parse(req.body);

      const session = await sessionStore.get(sessionId);
      if (!session) {
        res.status(404).json({ error: `Defense session not found: ${sessionId}` } as any);
        return;
      }

      // Check session ownership
      if (!checkSessionOwnership(session.userId, req.user?.id, res)) {
        return;
      }

      // State machine validation: completed session cannot accept new answers
      if (session.status === 'completed') {
        res.status(400).json({
          error: 'This defense session is already completed. No further answers can be submitted.',
        } as any);
        return;
      }

      // Validate claim belongs to this session
      const targetClaim = session.claims.find((c) => c.id === claimId);
      if (!targetClaim) {
        res.status(400).json({
          error: `Claim '${claimId}' is not part of this defense session.`,
        } as any);
        return;
      }

      const { evaluation, updatedClaim, nextQuestion, sessionComplete } =
        await aiService.evaluateAnswer(session, claimId, questionId, answerText);

      // Record student answer with timestamp and evaluation
      session.answers.push({
        claimId,
        questionId,
        answerText,
        answeredAt: new Date().toISOString(),
        evaluation,
      });

      session.currentQuestion = nextQuestion;
      if (sessionComplete) {
        session.status = 'completed';
      }

      await sessionStore.save(session);

      res.json({
        evaluation,
        updatedClaim,
        nextQuestion,
        sessionComplete,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/defense/finish
defenseRouter.post(
  '/finish',
  async (req: Request, res: Response<FinishDefenseResponse>, next: NextFunction) => {
    try {
      const { sessionId } = FinishDefenseInput.parse(req.body);

      const session = await sessionStore.get(sessionId);
      if (!session) {
        res.status(404).json({ error: `Defense session not found: ${sessionId}` } as any);
        return;
      }

      // Check session ownership
      if (!checkSessionOwnership(session.userId, req.user?.id, res)) {
        return;
      }

      const result = await aiService.finishDefense(session);
      await sessionStore.save(result.session);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/defense/session/:id
defenseRouter.get(
  '/session/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const session = await sessionStore.get(sessionId);
      if (!session) {
        res.status(404).json({ error: `Session not found: ${sessionId}` });
        return;
      }

      // Check session ownership
      if (!checkSessionOwnership(session.userId, req.user?.id, res)) {
        return;
      }

      res.json({ session });
    } catch (err) {
      next(err);
    }
  }
);
