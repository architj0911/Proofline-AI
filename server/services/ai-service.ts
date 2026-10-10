import { mockAIProvider, MockAIProvider } from './mock-provider';
import { openRouterProvider, OpenRouterProvider } from './openrouter-provider';
import { groqProvider, GroqProvider } from './groq-provider';
import { geminiProvider, GeminiProvider } from './gemini-provider';
import {
  ResumeClaim,
  DefenseSession,
  InterviewQuestion,
  DefenseEvaluationResult,
  DefenseSessionReport,
  DefensePlanItem,
  ResumeProfile,
} from '../../src/types';

export type AIProviderType = 'mock' | 'gemini' | 'openrouter' | 'groq';

export interface AIServiceInterface {
  getProviderType(): AIProviderType;
  getFallbackProviderType(): AIProviderType | 'none';
  isMock(): boolean;
  getActiveModel(): string;
  getFallbackModel(): string;
  extractClaims(resumeText: string): Promise<{ claims: ResumeClaim[]; profile?: ResumeProfile }>;
  startDefense(
    claimIds: string[],
    providedClaims?: ResumeClaim[]
  ): Promise<{ session: DefenseSession; firstQuestion: InterviewQuestion }>;
  evaluateAnswer(
    session: DefenseSession,
    claimId: string,
    questionId: string,
    answerText: string
  ): Promise<{
    evaluation: DefenseEvaluationResult;
    updatedClaim: ResumeClaim;
    nextQuestion?: InterviewQuestion;
    sessionComplete: boolean;
  }>;
  finishDefense(session: DefenseSession): Promise<{
    session: DefenseSession;
    report: DefenseSessionReport;
    defensePlan: DefensePlanItem[];
  }>;
}

export interface AIServiceOptions {
  geminiProvider?: GeminiProvider;
  openRouterProvider?: OpenRouterProvider;
  groqProvider?: GroqProvider;
  mockProvider?: MockAIProvider;
}

interface CommonAIProvider {
  getModel(): string;
  isConfigured(): boolean;
  extractClaims(resumeText: string): Promise<{ claims: ResumeClaim[]; profile?: ResumeProfile }>;
  evaluateAnswer(
    session: DefenseSession,
    claimId: string,
    questionId: string,
    answerText: string
  ): Promise<{
    evaluation: DefenseEvaluationResult;
    updatedClaim: ResumeClaim;
    nextQuestion?: InterviewQuestion;
    sessionComplete: boolean;
  }>;
}

function classifyError(err: unknown): {
  category: 'rate_limit' | 'timeout' | 'server_error' | 'malformed_output' | 'auth_error' | 'model_unavailable' | 'network_error' | 'client_error';
  isRetryable: boolean;
  message: string;
} {
  const cause = (err as { cause?: { message?: string; code?: string } })?.cause;
  const causeDetail = cause ? ` (${cause.code || ''} ${cause.message || ''})`.trim() : '';
  const rawMsg = err instanceof Error ? `${err.message}${causeDetail ? ` [${causeDetail}]` : ''}` : String(err);
  const msg = rawMsg
    .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[a-zA-Z0-9-_]{20,}/g, '[REDACTED_KEY]');
  const lower = (msg + ' ' + (cause?.message || '') + ' ' + (cause?.code || '')).toLowerCase();

  if (
    msg.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('resource exhausted') ||
    lower.includes('resource_exhausted')
  ) {
    return { category: 'rate_limit', isRetryable: true, message: msg };
  }

  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    (err as { name?: string })?.name === 'AbortError'
  ) {
    return { category: 'timeout', isRetryable: true, message: msg };
  }

  if (
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('socket') ||
    lower.includes('tls')
  ) {
    return { category: 'network_error', isRetryable: true, message: msg };
  }

  if (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    lower.includes('service error') ||
    lower.includes('service temporarily unavailable') ||
    lower.includes('internal server error')
  ) {
    return { category: 'server_error', isRetryable: true, message: msg };
  }

  if (
    lower.includes('malformed json') ||
    lower.includes('failed to parse') ||
    lower.includes('validation failed') ||
    lower.includes('empty response')
  ) {
    return { category: 'malformed_output', isRetryable: true, message: msg };
  }

  if (
    lower.includes('not configured') ||
    lower.includes('authentication failed') ||
    lower.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('403')
  ) {
    return { category: 'auth_error', isRetryable: true, message: msg };
  }

  if (
    msg.includes('404') ||
    lower.includes('not found') ||
    lower.includes('no longer available') ||
    lower.includes('deprecated')
  ) {
    return { category: 'model_unavailable', isRetryable: true, message: msg };
  }

  return { category: 'client_error', isRetryable: false, message: msg };
}

export class AIService implements AIServiceInterface {
  private gemini: GeminiProvider;
  private openRouter: OpenRouterProvider;
  private groq: GroqProvider;
  private mock: MockAIProvider;

  constructor(options?: AIServiceOptions) {
    this.gemini = options?.geminiProvider ?? geminiProvider;
    this.openRouter = options?.openRouterProvider ?? openRouterProvider;
    this.groq = options?.groqProvider ?? groqProvider;
    this.mock = options?.mockProvider ?? mockAIProvider;
  }

  /**
   * Resolves active primary provider:
   * 1. If USE_MOCK_AI === 'true', always mock.
   * 2. If AI_PROVIDER is explicitly set: 'gemini', 'openrouter', 'groq', 'mock'.
   * 3. Default: 'gemini' (Milestone 6 primary).
   */
  getProviderType(): AIProviderType {
    if (process.env.USE_MOCK_AI === 'true') {
      return 'mock';
    }

    const requested = process.env.AI_PROVIDER?.toLowerCase().trim();
    if (requested === 'openrouter') return 'openrouter';
    if (requested === 'groq') return 'groq';
    if (requested === 'mock') return 'mock';

    // Default primary provider
    return 'gemini';
  }

  /**
   * Resolves configured fallback provider:
   * - If primary is Gemini, fallback is OpenRouter.
   * - If primary is Groq, fallback is OpenRouter.
   * - If primary is OpenRouter, fallback is Gemini (if configured).
   * - If mock, fallback is none.
   */
  getFallbackProviderType(primary?: AIProviderType): AIProviderType | 'none' {
    const current = primary ?? this.getProviderType();
    if (current === 'mock') return 'none';
    if (current === 'gemini') return 'openrouter';
    if (current === 'groq') return 'openrouter';
    if (current === 'openrouter') {
      return this.gemini.isConfigured() ? 'gemini' : 'none';
    }
    return 'none';
  }

  isMock(): boolean {
    return this.getProviderType() === 'mock';
  }

  getActiveModel(): string {
    const provider = this.getProviderType();
    if (provider === 'gemini') return this.gemini.getModel();
    if (provider === 'openrouter') return this.openRouter.getModel();
    if (provider === 'groq') return this.groq.getModel();
    return 'deterministic-mock-v1';
  }

  getFallbackModel(): string {
    const fallback = this.getFallbackProviderType();
    if (fallback === 'openrouter') return this.openRouter.getModel();
    if (fallback === 'gemini') return this.gemini.getModel();
    if (fallback === 'groq') return this.groq.getModel();
    return 'none';
  }

  private getProviderInstance(type: AIProviderType): CommonAIProvider {
    switch (type) {
      case 'gemini':
        return this.gemini;
      case 'openrouter':
        return this.openRouter;
      case 'groq':
        return this.groq;
      case 'mock':
      default:
        return this.mock;
    }
  }

  async extractClaims(
    resumeText: string
  ): Promise<{ claims: ResumeClaim[]; profile?: ResumeProfile }> {
    if (this.isMock()) {
      return this.mock.extractClaims(resumeText);
    }

    const primaryType = this.getProviderType();
    const primary = this.getProviderInstance(primaryType);
    const fallbackType = this.getFallbackProviderType(primaryType);
    const fallback =
      fallbackType !== 'none' ? this.getProviderInstance(fallbackType) : null;

    const startTime = Date.now();
    console.log(
      `[Proofline AI] [Provider: ${primaryType}] [Model: ${primary.getModel()}] Starting resume claim extraction...`
    );

    try {
      const result = await primary.extractClaims(resumeText);
      const latency = Date.now() - startTime;
      console.log(
        `[Proofline AI] [Provider: ${primaryType}] [Model: ${primary.getModel()}] Extraction completed successfully in ${latency}ms (Extracted ${result.claims.length} claims)`
      );
      return result;
    } catch (primaryErr: unknown) {
      const latency = Date.now() - startTime;
      const { category, isRetryable, message } = classifyError(primaryErr);
      console.warn(
        `[Proofline AI] [Provider: ${primaryType}] Extraction failed (${category}) after ${latency}ms: ${message}`
      );

      if (!isRetryable || !fallback) {
        throw new Error(
          `AI extraction failed with provider (${primaryType}): ${message}`
        );
      }

      console.log(
        `[Proofline AI] [Fallback: ${fallbackType}] [Model: ${fallback.getModel()}] Initiating automatic fallback for resume extraction...`
      );
      const fallbackStart = Date.now();

      try {
        const fallbackResult = await fallback.extractClaims(resumeText);
        const fallbackLatency = Date.now() - fallbackStart;
        console.log(
          `[Proofline AI] [Fallback: ${fallbackType}] Fallback succeeded for resume extraction in ${fallbackLatency}ms (Extracted ${fallbackResult.claims.length} claims)`
        );
        return fallbackResult;
      } catch (fallbackErr: unknown) {
        const fallbackLatency = Date.now() - fallbackStart;
        const fallbackClass = classifyError(fallbackErr);
        console.error(
          `[Proofline AI] [Fallback: ${fallbackType}] Fallback failed (${fallbackClass.category}) after ${fallbackLatency}ms: ${fallbackClass.message}`
        );

        throw new Error(
          `All configured real AI providers are unavailable. Primary (${primaryType}) error: ${message}. Fallback (${fallbackType}) error: ${fallbackClass.message}`
        );
      }
    }
  }

  async startDefense(
    claimIds: string[],
    providedClaims?: ResumeClaim[]
  ): Promise<{ session: DefenseSession; firstQuestion: InterviewQuestion }> {
    // Session initialization connects verified claims deterministically
    return this.mock.startDefense(claimIds, providedClaims);
  }

  async evaluateAnswer(
    session: DefenseSession,
    claimId: string,
    questionId: string,
    answerText: string
  ): Promise<{
    evaluation: DefenseEvaluationResult;
    updatedClaim: ResumeClaim;
    nextQuestion?: InterviewQuestion;
    sessionComplete: boolean;
  }> {
    if (this.isMock()) {
      return this.mock.evaluateAnswer(session, claimId, questionId, answerText);
    }

    const primaryType = this.getProviderType();
    const primary = this.getProviderInstance(primaryType);
    const fallbackType = this.getFallbackProviderType(primaryType);
    const fallback =
      fallbackType !== 'none' ? this.getProviderInstance(fallbackType) : null;

    const startTime = Date.now();
    console.log(
      `[Proofline AI] [Provider: ${primaryType}] [Model: ${primary.getModel()}] Evaluating technical answer (claim: ${claimId}, question: ${questionId})...`
    );

    try {
      const result = await primary.evaluateAnswer(
        session,
        claimId,
        questionId,
        answerText
      );
      const latency = Date.now() - startTime;
      console.log(
        `[Proofline AI] [Provider: ${primaryType}] Answer evaluated successfully in ${latency}ms (Score: ${result.evaluation.score}/100, Status: ${result.evaluation.recommendedStatus})`
      );
      return result;
    } catch (primaryErr: unknown) {
      const latency = Date.now() - startTime;
      const { category, isRetryable, message } = classifyError(primaryErr);
      console.warn(
        `[Proofline AI] [Provider: ${primaryType}] Answer evaluation failed (${category}) after ${latency}ms: ${message}`
      );

      if (!isRetryable || !fallback) {
        throw new Error(
          `Answer evaluation failed with provider (${primaryType}): ${message}`
        );
      }

      console.log(
        `[Proofline AI] [Fallback: ${fallbackType}] [Model: ${fallback.getModel()}] Initiating automatic fallback for answer evaluation...`
      );
      const fallbackStart = Date.now();

      try {
        const fallbackResult = await fallback.evaluateAnswer(
          session,
          claimId,
          questionId,
          answerText
        );
        const fallbackLatency = Date.now() - fallbackStart;
        console.log(
          `[Proofline AI] [Fallback: ${fallbackType}] Fallback succeeded for answer evaluation in ${fallbackLatency}ms (Score: ${fallbackResult.evaluation.score}/100)`
        );
        return fallbackResult;
      } catch (fallbackErr: unknown) {
        const fallbackLatency = Date.now() - fallbackStart;
        const fallbackClass = classifyError(fallbackErr);
        console.error(
          `[Proofline AI] [Fallback: ${fallbackType}] Fallback failed (${fallbackClass.category}) after ${fallbackLatency}ms: ${fallbackClass.message}`
        );

        throw new Error(
          `All configured real AI providers are unavailable. Primary (${primaryType}) error: ${message}. Fallback (${fallbackType}) error: ${fallbackClass.message}`
        );
      }
    }
  }

  async finishDefense(session: DefenseSession): Promise<{
    session: DefenseSession;
    report: DefenseSessionReport;
    defensePlan: DefensePlanItem[];
  }> {
    // Defense report compilation and milestone prioritization
    return this.mock.finishDefense(session);
  }
}

export const aiService = new AIService();
