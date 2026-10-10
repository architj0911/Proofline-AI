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

export interface OpenRouterProviderOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class OpenRouterProvider {
  private apiKey: string | undefined;
  private model: string;
  private endpoint: string;
  private fetchFn: typeof fetch;
  private timeoutMs: number;

  constructor(options?: OpenRouterProviderOptions) {
    this.apiKey = options?.apiKey ?? process.env.OPENROUTER_API_KEY;
    this.model =
      options?.model ??
      process.env.OPENROUTER_MODEL ??
      'meta-llama/llama-3.3-70b-instruct';
    this.endpoint =
      options?.endpoint ?? 'https://openrouter.ai/api/v1/chat/completions';
    this.fetchFn = options?.fetchFn ?? globalThis.fetch;
    this.timeoutMs = options?.timeoutMs ?? 40000;
  }

  getApiKey(): string | undefined {
    return this.apiKey ?? process.env.OPENROUTER_API_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim() !== '' && !key.includes('your_openrouter_api_key');
  }

  getModel(): string {
    return (
      this.model ||
      process.env.OPENROUTER_MODEL ||
      'meta-llama/llama-3.3-70b-instruct'
    );
  }

  private ensureConfigured(): string {
    if (!this.isConfigured()) {
      throw new Error(
        'OpenRouter API key is not configured. Please supply OPENROUTER_API_KEY in .env.'
      );
    }
    return this.getApiKey()!;
  }

  async callOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 2500
  ): Promise<string> {
    const apiKey = this.ensureConfigured();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://proofline.ai',
          'X-Title': 'Proofline AI Interview Defense',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.0,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `OpenRouter authentication failed (HTTP ${response.status}). Check OPENROUTER_API_KEY in .env.`
        );
      }

      if (response.status === 429) {
        throw new Error(
          'OpenRouter rate limit or quota exceeded (HTTP 429). Please retry in a few moments.'
        );
      }

      if (response.status >= 500) {
        throw new Error(
          `OpenRouter upstream service error (HTTP ${response.status}). Please try again shortly.`
        );
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`OpenRouter API error (HTTP ${response.status}): ${errText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content || content.trim() === '') {
        throw new Error('Empty response received from OpenRouter AI provider.');
      }

      return content;
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new Error(
          `OpenRouter request timed out after ${this.timeoutMs / 1000} seconds.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Extracts structured claims and candidate profile using OpenRouter with strict JSON schema.
   */
  async extractClaims(
    resumeText: string
  ): Promise<{ claims: ResumeClaim[]; profile?: ResumeProfile }> {
    const systemPrompt = buildExtractionSystemPrompt();
    const userPrompt = buildExtractionUserPrompt(resumeText);

    const rawJson = await this.callOpenRouter(systemPrompt, userPrompt, 2500);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Failed to parse OpenRouter response as valid JSON.');
    }

    let parsedObj = parsed as Record<string, unknown>;
    if (Array.isArray(parsed)) {
      parsedObj = { claims: parsed };
    }

    const validated = StructuredResumeExtractionSchema.parse(parsedObj);
    return formatExtractedClaimsAndProfile(validated, 'openrouter');
  }

  /**
   * Evaluates candidate's answer against the specific question asked.
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
    if (!claim) throw new Error(`Claim not found: ${claimId}`);

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

    const rawJson = await this.callOpenRouter(systemPrompt, userPrompt, 1500);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Malformed JSON received when evaluating answer.');
    }

    const validated = EvaluateAnswerSchema.parse(parsed);
    const evaluation = formatEvaluationResult(validated);

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

export const openRouterProvider = new OpenRouterProvider();
