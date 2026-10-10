import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { aiService } from '../services/ai-service';
import { DocumentParser } from '../services/document-parser';
import { ExtractClaimsResponse } from '../../src/types';
import { INITIAL_MOCK_CLAIMS } from '../../src/data/mock-data';
import { authenticateToken } from '../middleware/auth';
import { extractRateLimiter } from '../middleware/rate-limiter';

export const claimsRouter = Router();

// Optional authentication across claims routes
claimsRouter.use(authenticateToken);

// Configure in-memory upload storage with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
});

const ExtractClaimsInput = z.object({
  resumeText: z
    .string()
    .min(1, 'Resume text cannot be empty')
    .max(50000, 'Resume text exceeds maximum limit of 50,000 characters'),
});

// POST /api/claims/extract - Parse and extract claims from text
claimsRouter.post(
  '/extract',
  extractRateLimiter,
  async (
    req: Request,
    res: Response<ExtractClaimsResponse>,
    next: NextFunction
  ) => {
    try {
      const { resumeText } = ExtractClaimsInput.parse(req.body);
      const { claims, profile } = await aiService.extractClaims(resumeText);

      res.json({
        claims,
        profile,
        message: `Extracted ${claims.length} technical claims from resume text.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/claims/upload - Ingest PDF, DOCX, or TXT file and extract claims
claimsRouter.post(
  '/upload',
  extractRateLimiter,
  upload.single('file'),
  async (req: Request, res: Response<ExtractClaimsResponse>, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({
          claims: [],
          message: 'No file uploaded. Please upload a PDF, DOCX, or TXT file.',
        });
        return;
      }

      const parsedDoc = await DocumentParser.parseBuffer(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const { claims, profile } = await aiService.extractClaims(parsedDoc.text);

      res.json({
        claims,
        profile,
        message: `Successfully processed ${parsedDoc.fileName} (${parsedDoc.fileType.toUpperCase()}) and extracted ${claims.length} claims.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Convenience endpoint explicitly for benchmark demo mode
claimsRouter.get('/default', (_req: Request, res: Response<ExtractClaimsResponse>) => {
  res.json({
    claims: JSON.parse(JSON.stringify(INITIAL_MOCK_CLAIMS)),
    message: 'Loaded default benchmark resume claims.',
  });
});
