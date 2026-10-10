/**
 * Proofline AI — Milestone 6: Offline Gemini + OpenRouter Fallback Test Suite
 * Fully mocks HTTP responses using dependency injection.
 * ZERO live network calls or provider quota consumed.
 */
process.env.NODE_ENV = 'test';

import { GeminiProvider } from './services/gemini-provider';
import { OpenRouterProvider } from './services/openrouter-provider';
import { AIService } from './services/ai-service';
import {
  StructuredResumeExtractionSchema,
  EvaluateAnswerSchema,
  parseModelJson,
} from './services/ai-schemas';
import { DefenseSession } from '../src/types';

// Mock Extraction Output Structure
const validExtractionResponseObj = {
  candidateName: 'Jane Doe',
  contactEmail: 'jane.doe@cloud.dev',
  contactPhone: '+1-555-0144',
  headlineOrObjective: 'Cloud Infrastructure Architect',
  education: [{ institution: 'State University', degree: 'B.S. CS', year: '2022' }],
  technicalSkills: ['Go', 'Kubernetes', 'Terraform', 'PostgreSQL'],
  nonTechnicalSkills: ['System Design', 'Agile'],
  workExperience: [
    {
      role: 'Staff DevOps Engineer',
      company: 'CloudScale Inc',
      period: '2022 - Present',
      summary: 'Maintained EKS clusters and Terraform modules.',
      sourceSnippet: 'Maintained multi-region EKS clusters.',
    },
  ],
  projects: [
    {
      name: 'Global Cluster Orchestration',
      description: 'Zero-downtime multi-region Kubernetes deployments.',
      technologies: ['Kubernetes', 'Terraform', 'Go'],
      responsibilities: ['Architected EKS infrastructure'],
      quantifiedAchievements: ['99.99% availability achieved'],
      sourceSnippet: 'Architected EKS infrastructure with 99.99% availability.',
    },
  ],
  claims: [
    {
      originalStatement: 'Architected multi-region Kubernetes clusters on AWS EKS using Terraform.',
      category: 'DevOps & Cloud Architecture',
      projectName: 'Global Cluster Orchestration',
      relatedTechnologies: ['Kubernetes', 'Terraform', 'AWS'],
      sourceSnippet: 'Architected multi-region Kubernetes clusters on AWS EKS using Terraform.',
      groundingType: 'supported_by_snippet',
      interviewQuestions: [
        {
          difficulty: 'basic',
          questionText: 'How do you handle state locking in Terraform when multiple engineers deploy?',
          probingObjective: 'Verify Terraform state file concurrency mechanisms',
          expectedConcepts: ['S3 backend', 'DynamoDB state lock'],
        },
        {
          difficulty: 'intermediate',
          questionText: 'Walk me through your multi-region failover strategy for Kubernetes ingress.',
          probingObjective: 'Evaluate DNS routing and ingress controller setup',
          expectedConcepts: ['Route53 latency routing', 'ExternalDNS', 'Ingress controller'],
        },
      ],
    },
  ],
};

// Mock Gemini API Response Envelope
function makeGeminiSuccessResponse(jsonBody: object) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(jsonBody) }],
          role: 'model',
        },
        finishReason: 'STOP',
      },
    ],
  };
}

// Mock OpenRouter API Response Envelope
function makeOpenRouterSuccessResponse(jsonBody: object) {
  return {
    id: 'mock-or-12345',
    choices: [
      {
        message: {
          role: 'assistant',
          content: JSON.stringify(jsonBody),
        },
        finish_reason: 'stop',
      },
    ],
  };
}

// Mock Evaluation Output Structure
const validEvaluationResponseObj = {
  score: 85,
  feedback: 'Excellent explanation of DynamoDB state locking and state isolation.',
  correctConceptsDemonstrated: ['DynamoDB locking', 'Remote S3 backend'],
  strengths: ['Clear explanation of race condition prevention'],
  weaknesses: [],
  missingConcepts: [],
  technicalInaccuracies: [],
  suggestedImprovements: ['Mention state encryption with KMS'],
  gapsIdentified: [],
  recommendedStatus: 'Demonstrated understanding',
};

const mockSession: DefenseSession = {
  id: 'session-offline-test-1',
  title: 'Offline Defense Test Session',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  claims: [
    {
      id: 'claim-1',
      originalStatement: 'Architected multi-region Kubernetes clusters on AWS EKS using Terraform.',
      category: 'DevOps & Cloud Architecture',
      relatedTechnologies: ['Kubernetes', 'Terraform'],
      status: 'Unverified',
      knowledgeGaps: [],
      confidenceScore: 0,
      evidenceReferences: [],
      interviewQuestions: [
        {
          id: 'q-1',
          claimId: 'claim-1',
          difficulty: 'basic',
          questionText: 'How do you handle state locking in Terraform?',
          probingObjective: 'State concurrency',
          expectedConcepts: ['DynamoDB state lock'],
        },
      ],
    },
  ],
  currentClaimId: 'claim-1',
  currentQuestion: {
    id: 'q-1',
    claimId: 'claim-1',
    difficulty: 'basic',
    questionText: 'How do you handle state locking in Terraform?',
    probingObjective: 'State concurrency',
    expectedConcepts: ['DynamoDB state lock'],
  },
  answers: [],
  status: 'in_progress',
};

async function runOfflineTests() {
  console.log('================================================================');
  console.log('  Proofline AI — Milestone 6: Gemini + OpenRouter Fallback Tests ');
  console.log('  (14 Offline Mocked Tests — Zero Provider Quota Consumed)       ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
    passedTests++;
    console.log(`  ✓ [Test ${totalTests}] ${testName}`);
  }

  // -------------------------------------------------------------
  // Test 1: Successful Gemini Request
  // -------------------------------------------------------------
  {
    const mockFetch = async () =>
      new Response(JSON.stringify(makeGeminiSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      model: 'gemini-2.5-flash',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await gemini.extractClaims('Architected Kubernetes clusters with Terraform');
    assert(
      res.claims.length === 1 &&
        res.claims[0].originalStatement.includes('Kubernetes') &&
        res.profile?.candidateName === 'Jane Doe',
      'Successful Gemini request extracts claims and candidate profile'
    );
  }

  // -------------------------------------------------------------
  // Test 2: Successful OpenRouter Request
  // -------------------------------------------------------------
  {
    const mockFetch = async () =>
      new Response(JSON.stringify(makeOpenRouterSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      model: 'meta-llama/llama-3.3-70b-instruct',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await openRouter.extractClaims('Architected Kubernetes clusters with Terraform');
    assert(
      res.claims.length === 1 &&
        res.claims[0].groundingType === 'supported_by_snippet' &&
        res.profile?.candidateName === 'Jane Doe',
      'Successful OpenRouter request extracts compatible grounded claims'
    );
  }

  // -------------------------------------------------------------
  // Test 3: Gemini Rate Limit (HTTP 429) Triggering OpenRouter Fallback
  // -------------------------------------------------------------
  {
    let geminiCalled = false;
    let openRouterCalled = false;

    const geminiFetch = async () => {
      geminiCalled = true;
      return new Response(JSON.stringify({ error: { code: 429, message: 'Resource exhausted' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
      });
    };

    const openRouterFetch = async () => {
      openRouterCalled = true;
      return new Response(JSON.stringify(makeOpenRouterSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: geminiFetch as unknown as typeof fetch,
    });
    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: openRouterFetch as unknown as typeof fetch,
    });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });
    const res = await service.extractClaims('Sample resume text');

    assert(
      geminiCalled && openRouterCalled && res.claims.length === 1,
      'Gemini HTTP 429 rate limit seamlessly triggers OpenRouter fallback'
    );
  }

  // -------------------------------------------------------------
  // Test 4: Gemini Timeout Triggering Fallback
  // -------------------------------------------------------------
  {
    let geminiTimedOut = false;
    let fallbackExecuted = false;

    const geminiFetch = async () => {
      geminiTimedOut = true;
      const abortErr = new Error('The operation was aborted');
      (abortErr as { name: string }).name = 'AbortError';
      throw abortErr;
    };

    const openRouterFetch = async () => {
      fallbackExecuted = true;
      return new Response(JSON.stringify(makeOpenRouterSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: geminiFetch as unknown as typeof fetch,
    });
    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: openRouterFetch as unknown as typeof fetch,
    });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });
    const res = await service.extractClaims('Sample resume text');

    assert(
      geminiTimedOut && fallbackExecuted && res.claims.length === 1,
      'Gemini request timeout triggers automatic OpenRouter fallback'
    );
  }

  // -------------------------------------------------------------
  // Test 5: Gemini Temporary Server Error (HTTP 503) Triggering Fallback
  // -------------------------------------------------------------
  {
    let serverErrorTriggered = false;
    let fallbackExecuted = false;

    const geminiFetch = async () => {
      serverErrorTriggered = true;
      return new Response(
        JSON.stringify({ error: { code: 503, message: 'The model is overloaded. Please try again later.' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const openRouterFetch = async () => {
      fallbackExecuted = true;
      return new Response(JSON.stringify(makeOpenRouterSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: geminiFetch as unknown as typeof fetch,
    });
    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: openRouterFetch as unknown as typeof fetch,
    });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });
    const res = await service.extractClaims('Sample resume text');

    assert(
      serverErrorTriggered && fallbackExecuted && res.claims.length === 1,
      'Gemini temporary 503 server error triggers OpenRouter fallback'
    );
  }

  // -------------------------------------------------------------
  // Test 6: Malformed Gemini Output Triggering Safe Fallback
  // -------------------------------------------------------------
  {
    let malformedCaught = false;
    let fallbackExecuted = false;

    const geminiFetch = async () => {
      malformedCaught = true;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: '{ "broken_json": true, missing_closing_bracket: ' }] },
              finishReason: 'STOP',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const openRouterFetch = async () => {
      fallbackExecuted = true;
      return new Response(JSON.stringify(makeOpenRouterSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: geminiFetch as unknown as typeof fetch,
    });
    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: openRouterFetch as unknown as typeof fetch,
    });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });
    const res = await service.extractClaims('Sample resume text');

    assert(
      malformedCaught && fallbackExecuted && res.claims.length === 1,
      'Malformed Gemini JSON safely caught and triggers OpenRouter fallback'
    );
  }

  // -------------------------------------------------------------
  // Test 7: OpenRouter Failure After Gemini Failure (Both Fail)
  // -------------------------------------------------------------
  {
    const geminiFetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Gemini 429' } }), { status: 429 });

    const openRouterFetch = async () =>
      new Response(JSON.stringify({ error: { message: 'OpenRouter 500 error' } }), { status: 500 });

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: geminiFetch as unknown as typeof fetch,
    });
    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: openRouterFetch as unknown as typeof fetch,
    });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });

    let bothFailedCaught = false;
    try {
      await service.extractClaims('Sample resume text');
    } catch (err: unknown) {
      bothFailedCaught = true;
      assert(
        err instanceof Error &&
          err.message.includes('All configured real AI providers are unavailable') &&
          err.message.includes('Primary (gemini)') &&
          err.message.includes('Fallback (openrouter)'),
        'OpenRouter failure after Gemini failure reports structured multi-provider error'
      );
    }
    assert(bothFailedCaught, 'Exception cleanly thrown when all configured providers fail');
  }

  // -------------------------------------------------------------
  // Test 8: Missing Gemini Credentials Triggering OpenRouter Fallback
  // -------------------------------------------------------------
  {
    const openRouterFetch = async () =>
      new Response(JSON.stringify(makeOpenRouterSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const gemini = new GeminiProvider({
      apiKey: '', // unconfigured
    });
    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: openRouterFetch as unknown as typeof fetch,
    });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });
    const res = await service.extractClaims('Sample resume text');

    assert(
      res.claims.length === 1 && res.profile?.candidateName === 'Jane Doe',
      'Missing Gemini key triggers automatic fallback to configured OpenRouter provider'
    );
  }

  // -------------------------------------------------------------
  // Test 9: Missing OpenRouter Credentials Handled Safely
  // -------------------------------------------------------------
  {
    const geminiFetch = async () =>
      new Response(JSON.stringify(makeGeminiSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: geminiFetch as unknown as typeof fetch,
    });
    const openRouter = new OpenRouterProvider({
      apiKey: '', // unconfigured
    });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });
    const res = await service.extractClaims('Sample resume text');

    assert(
      res.claims.length === 1 && res.profile?.candidateName === 'Jane Doe',
      'Primary Gemini provider succeeds independently when OpenRouter is unconfigured'
    );
  }

  // -------------------------------------------------------------
  // Test 10: Both Providers Unavailable (No Keys or Both Down)
  // -------------------------------------------------------------
  {
    const gemini = new GeminiProvider({ apiKey: '' });
    const openRouter = new OpenRouterProvider({ apiKey: '' });

    const service = new AIService({ geminiProvider: gemini, openRouterProvider: openRouter });

    let bothUnavailable = false;
    try {
      await service.extractClaims('Sample resume text');
    } catch (err: unknown) {
      bothUnavailable = true;
      assert(
        err instanceof Error && err.message.includes('unavailable') || err instanceof Error && err.message.includes('not configured'),
        'Clear error returned when both Gemini and OpenRouter are unconfigured'
      );
    }
    assert(bothUnavailable, 'Prevents proceeding when all live providers are unconfigured');
  }

  // -------------------------------------------------------------
  // Test 11: Zod Schema Validation Catches Incomplete Structures
  // -------------------------------------------------------------
  {
    const invalidObj = { candidateName: 123, claims: [{ invalidField: true }] };
    const parseResult = StructuredResumeExtractionSchema.safeParse(invalidObj);
    assert(!parseResult.success, 'Zod schema validation correctly catches invalid response structures');

    const validParse = StructuredResumeExtractionSchema.safeParse(validExtractionResponseObj);
    assert(validParse.success, 'Zod schema validation verifies valid structured extraction');
  }

  // -------------------------------------------------------------
  // Test 12: Confirmation That Provider Errors NEVER Silently Produce Fake Mock Results
  // -------------------------------------------------------------
  {
    const failingGemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: (async () => new Response(JSON.stringify({ error: 'fail' }), { status: 500 })) as unknown as typeof fetch,
    });
    const failingOpenRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: (async () => new Response(JSON.stringify({ error: 'fail' }), { status: 500 })) as unknown as typeof fetch,
    });

    const service = new AIService({
      geminiProvider: failingGemini,
      openRouterProvider: failingOpenRouter,
    });

    let mockSubstituted = false;
    try {
      const res = await service.extractClaims('Candidate resume text');
      // If benchmark claims returned, mock substitution occurred!
      if (res.claims.some((c) => c.originalStatement.includes('Spring Boot microservices banking'))) {
        mockSubstituted = true;
      }
    } catch {
      // Expected to throw!
    }

    assert(
      !mockSubstituted,
      'Provider errors NEVER silently substitute hardcoded benchmark demo claims'
    );
  }

  // -------------------------------------------------------------
  // Test 13: Confirmation That Resume Data and Sessions Remain Isolated
  // -------------------------------------------------------------
  {
    const candidateDataX = {
      ...validExtractionResponseObj,
      candidateName: 'Candidate X',
      claims: [
        {
          originalStatement: 'Implemented Rust asynchronous actors using Tokio.',
          category: 'Systems Architecture',
          relatedTechnologies: ['Rust', 'Tokio'],
          sourceSnippet: 'Implemented Rust asynchronous actors using Tokio.',
          groundingType: 'supported_by_snippet' as const,
          interviewQuestions: [
            {
              difficulty: 'basic' as const,
              questionText: 'Explain Tokio event loops.',
              probingObjective: 'Async runtimes',
              expectedConcepts: ['MIO', 'Event Loop'],
            },
          ],
        },
      ],
    };

    const candidateDataY = {
      ...validExtractionResponseObj,
      candidateName: 'Candidate Y',
      claims: [
        {
          originalStatement: 'Built Swift iOS offline-first database sync using CoreData.',
          category: 'Mobile Engineering',
          relatedTechnologies: ['Swift', 'CoreData'],
          sourceSnippet: 'Built Swift iOS offline-first database sync using CoreData.',
          groundingType: 'supported_by_snippet' as const,
          interviewQuestions: [
            {
              difficulty: 'basic' as const,
              questionText: 'How do you handle merge conflicts in CoreData?',
              probingObjective: 'Database conflict resolution',
              expectedConcepts: ['NSMergePolicy', 'Object ID'],
            },
          ],
        },
      ],
    };

    let fetchCount = 0;
    const mockFetch = async () => {
      fetchCount++;
      const payload = fetchCount === 1 ? candidateDataX : candidateDataY;
      return new Response(JSON.stringify(makeGeminiSuccessResponse(payload)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const resX = await gemini.extractClaims('Rust Tokio resume');
    const resY = await gemini.extractClaims('Swift CoreData resume');

    assert(
      resX.profile?.candidateName === 'Candidate X' &&
        resY.profile?.candidateName === 'Candidate Y' &&
        !resX.claims[0].originalStatement.includes('Swift') &&
        !resY.claims[0].originalStatement.includes('Rust'),
      'Resume data and candidate extractions remain strictly isolated across calls'
    );
  }

  // -------------------------------------------------------------
  // Test 14: Confirmation That Both Providers Preserve the Exact Same Application Output Contracts
  // -------------------------------------------------------------
  {
    const geminiFetch = async () =>
      new Response(JSON.stringify(makeGeminiSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const openRouterFetch = async () =>
      new Response(JSON.stringify(makeOpenRouterSuccessResponse(validExtractionResponseObj)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const gemini = new GeminiProvider({
      apiKey: 'mock-gemini-key',
      fetchFn: geminiFetch as unknown as typeof fetch,
    });

    const openRouter = new OpenRouterProvider({
      apiKey: 'mock-openrouter-key',
      fetchFn: openRouterFetch as unknown as typeof fetch,
    });

    const resGemini = await gemini.extractClaims('Identical resume text');
    const resOpenRouter = await openRouter.extractClaims('Identical resume text');

    // Compare contract shapes
    const geminiKeys = Object.keys(resGemini.claims[0]).sort();
    const openRouterKeys = Object.keys(resOpenRouter.claims[0]).sort();
    const geminiProfileKeys = Object.keys(resGemini.profile!).sort();
    const openRouterProfileKeys = Object.keys(resOpenRouter.profile!).sort();

    assert(
      JSON.stringify(geminiKeys) === JSON.stringify(openRouterKeys) &&
        JSON.stringify(geminiProfileKeys) === JSON.stringify(openRouterProfileKeys),
      'Both Gemini and OpenRouter preserve identical application output schemas and domain contracts'
    );
  }

  // -------------------------------------------------------------
  // Test 15: Provider JSON wrappers are recovered without accepting partial output
  // -------------------------------------------------------------
  {
    const fenced = parseModelJson('```json\n{"claims": []}\n```') as { claims: unknown[] };
    const prefixed = parseModelJson('Structured response:\n{"claims": []}\nComplete.') as {
      claims: unknown[];
    };
    let rejectedIncomplete = false;
    try {
      parseModelJson('{"claims": [');
    } catch {
      rejectedIncomplete = true;
    }

    assert(
      fenced.claims.length === 0 && prefixed.claims.length === 0 && rejectedIncomplete,
      'Complete JSON wrappers are recovered while incomplete JSON remains rejected'
    );
  }

  console.log('\n================================================================');
  console.log(`  🎉 ALL ${passedTests}/${totalTests} OFFLINE GEMINI + OPENROUTER TESTS PASSED!`);
  console.log('================================================================\n');
}

runOfflineTests().catch((err) => {
  console.error('\n❌ Unhandled test failure:', err);
  process.exit(1);
});
