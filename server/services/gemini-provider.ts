import {
  ResumeClaim,
  DefenseSession,
  InterviewQuestion,
  DefenseEvaluationResult,
  ResumeProfile,
} from '../../src/types';
import {
  StructuredResumeExtractionSchema,
  EvaluateAnswerSchema,
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
  buildEvaluationSystemPrompt,
  buildEvaluationUserPrompt,
  formatExtractedClaimsAndProfile,
  formatEvaluationResult,
} from './ai-schemas';

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class GeminiProvider {
  private apiKey: string | undefined;
  private model: string;
  private endpoint: string;
  private fetchFn: typeof fetch;
  private timeoutMs: number;

  constructor(options?: GeminiProviderOptions) {
    this.apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY;
    this.model = options?.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    this.endpoint =
      options?.endpoint ??
      'https://generativelanguage.googleapis.com/v1beta/models';
    this.fetchFn = options?.fetchFn ?? globalThis.fetch;
    this.timeoutMs = options?.timeoutMs ?? 15000;
  }

  getApiKey(): string | undefined {
    return this.apiKey ?? process.env.GEMINI_API_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim() !== '' && !key.includes('your_gemini_api_key');
  }

  getModel(): string {
    return this.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  private ensureConfigured(): string {
    if (!this.isConfigured()) {
      throw new Error(
        'Gemini API key is not configured. Please supply GEMINI_API_KEY in .env.'
      );
    }
    return this.getApiKey()!;
  }

  /**
   * Calls Google Gemini generateContent with native JSON response mode.
   */
  async callGemini(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 2500
  ): Promise<string> {
    const apiKey = this.ensureConfigured();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const modelSlug = this.model.startsWith('models/')
      ? this.model.replace('models/', '')
      : this.model;
    const url = `${this.endpoint}/${modelSlug}:generateContent`;

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.0,
            maxOutputTokens: maxTokens,
          },
        }),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Gemini authentication failed (HTTP ${response.status}). Ensure GEMINI_API_KEY is valid.`
        );
      }
      if (response.status === 429) {
        throw new Error(
          'Gemini rate limit or quota exceeded (HTTP 429). Resource exhausted.'
        );
      }
      if (response.status >= 500) {
        throw new Error(
          `Gemini upstream service error (HTTP ${response.status}). Service temporarily unavailable.`
        );
      }
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `Gemini API request failed (HTTP ${response.status}): ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
          finishReason?: string;
        }>;
      };

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content || content.trim() === '') {
        const finishReason = data.candidates?.[0]?.finishReason;
        throw new Error(
          `Empty or filtered response from Gemini AI provider (finishReason: ${finishReason || 'unknown'}).`
        );
      }

      return content;
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new Error(
          `Gemini request timed out after ${this.timeoutMs / 1000} seconds.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Extracts real resume profile metadata and grounded technical claims.
   */
  async extractClaims(
    resumeText: string
  ): Promise<{ claims: ResumeClaim[]; profile?: ResumeProfile }> {
    const systemPrompt = buildExtractionSystemPrompt();
    const userPrompt = buildExtractionUserPrompt(resumeText);

    const rawJson = await this.callGemini(systemPrompt, userPrompt, 2500);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Malformed JSON received from Gemini during resume extraction.');
    }

    let parsedObj = parsed as Record<string, unknown>;
    if (Array.isArray(parsed)) {
      parsedObj = { claims: parsed };
    }

    const validated = StructuredResumeExtractionSchema.parse(parsedObj);
    return formatExtractedClaimsAndProfile(validated, 'gemini');
  }

  /**
   * Evaluates student's technical answer using fair, question-targeted rubric.
   */
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
    const claim = session.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error(`Claim not found with ID: ${claimId}`);

    const question =
      claim.interviewQuestions.find((q) => q.id === questionId) ||
      session.currentQuestion;

    const systemPrompt = buildEvaluationSystemPrompt();
    const userPrompt = buildEvaluationUserPrompt(
      claim.originalStatement,
      claim.category,
      claim.relatedTechnologies,
      question?.questionText || 'Explain your technical implementation',
      question?.probingObjective || 'Evaluate technical depth',
      question?.expectedConcepts || claim.relatedTechnologies,
      answerText
    );

    const rawJson = await this.callGemini(systemPrompt, userPrompt, 1500);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Malformed JSON received from Gemini during answer evaluation.');
    }

    const validated = EvaluateAnswerSchema.parse(parsed);
    const evaluation = formatEvaluationResult(validated);

    // Update claim state
    claim.status = evaluation.recommendedStatus;
    claim.confidenceScore = evaluation.score;
    if (evaluation.gapsIdentified.length > 0) {
      claim.knowledgeGaps = Array.from(
        new Set([...claim.knowledgeGaps, ...evaluation.gapsIdentified])
      );
    }

    const answeredIds = new Set(session.answers.map((a) => a.questionId));
    answeredIds.add(questionId);

    const nextInSameClaim = claim.interviewQuestions.find(
      (q) => !answeredIds.has(q.id)
    );
    let nextQuestion: InterviewQuestion | undefined = nextInSameClaim;

    if (!nextQuestion) {
      const nextClaim = session.claims.find((c) =>
        c.interviewQuestions.some((q) => !answeredIds.has(q.id))
      );
      if (nextClaim) {
        nextQuestion = nextClaim.interviewQuestions.find(
          (q) => !answeredIds.has(q.id)
        );
        session.currentClaimId = nextClaim.id;
      }
    }

    return {
      evaluation,
      updatedClaim: claim,
      nextQuestion,
      sessionComplete: !nextQuestion,
    };
  }
}

export const geminiProvider = new GeminiProvider();
