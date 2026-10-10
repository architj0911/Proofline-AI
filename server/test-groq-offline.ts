import { GroqProvider } from './services/groq-provider';
import { mockAIProvider } from './services/mock-provider';
import { DefenseSession } from '../src/types';

async function runOfflineGroqTests() {
  console.log('--- Starting GroqProvider Offline Unit Tests (Mocked HTTP) ---');
  let passedCount = 0;

  // Helper to create mock Response
  function createMockResponse(status: number, body: unknown, statusText: string = 'OK') {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(bodyStr, {
      status,
      statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Successful Groq response & valid structured output (Claims Extraction)
  {
    console.log('[Test 1] Testing Successful Groq Response & Valid Extraction Schema...');
    const mockClaimsResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              claims: [
                {
                  originalStatement: 'Built a Spring Boot banking microservice.',
                  category: 'Backend Architecture',
                  relatedTechnologies: ['Spring Boot', 'Java 17'],
                  interviewQuestions: [
                    {
                      difficulty: 'basic',
                      questionText: 'How are services decomposed?',
                      probingObjective: 'Verify boundaries',
                      expectedConcepts: ['REST', 'Microservices'],
                    },
                  ],
                },
              ],
            }),
          },
        },
      ],
    };

    const mockFetch = async () => createMockResponse(200, mockClaimsResponse);
    const provider = new GroqProvider({
      apiKey: 'test-key-mock',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const { claims } = await provider.extractClaims('Built a Spring Boot banking microservice.');
    if (claims.length !== 1 || claims[0].status !== 'Unverified') {
      throw new Error('Test 1 failed: claims shape or status incorrect');
    }
    console.log(`[PASS] Test 1: Extracted ${claims.length} claim with status='${claims[0].status}'`);
    passedCount++;
  }

  // 2. Successful Groq response & valid structured output (Answer Evaluation)
  {
    console.log('[Test 2] Testing Valid Answer Evaluation Schema...');
    const mockEvalResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 85,
              feedback: 'Thorough explanation of saga orchestration.',
              strengths: ['Clear explanation of compensating transactions'],
              weaknesses: ['Did not mention idempotency keys'],
              gapsIdentified: ['Idempotent consumers'],
              recommendedStatus: 'Demonstrated understanding',
            }),
          },
        },
      ],
    };

    const mockFetch = async () => createMockResponse(200, mockEvalResponse);
    const provider = new GroqProvider({
      apiKey: 'test-key-mock',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const dummySession: DefenseSession = {
      id: 'test-session',
      title: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      claims: [
        {
          id: 'claim-1',
          originalStatement: 'Implemented Saga pattern',
          category: 'Distributed Systems',
          relatedTechnologies: ['Kafka', 'Spring'],
          status: 'Unverified',
          knowledgeGaps: [],
          evidenceReferences: [],
          interviewQuestions: [
            {
              id: 'q-1',
              claimId: 'claim-1',
              difficulty: 'intermediate',
              questionText: 'How does the saga pattern recover from failed steps?',
              probingObjective: 'Distributed consistency',
              expectedConcepts: ['Compensating transactions'],
            },
          ],
        },
      ],
      answers: [],
      status: 'in_progress',
    };

    const result = await provider.evaluateAnswer(
      dummySession,
      'claim-1',
      'q-1',
      'We use compensating transactions dispatched asynchronously via Kafka.'
    );

    if (
      result.evaluation.score !== 85 ||
      result.updatedClaim.status !== 'Demonstrated understanding'
    ) {
      throw new Error('Test 2 failed: evaluation result mismatch');
    }
    console.log(`[PASS] Test 2: Evaluation score=${result.evaluation.score}, status='${result.updatedClaim.status}'`);
    passedCount++;
  }

  // 3. Malformed JSON handling
  {
    console.log('[Test 3] Testing Malformed JSON handling...');
    const mockFetch = async () =>
      createMockResponse(200, {
        choices: [{ message: { content: 'Not valid json at all { unclosed object...' } }],
      });
    const provider = new GroqProvider({
      apiKey: 'test-key-mock',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    let caught = false;
    try {
      await provider.extractClaims('some text');
    } catch (err: unknown) {
      caught = true;
      if (!(err as Error).message.includes('Malformed JSON')) {
        throw new Error(`Test 3 failed: unexpected error message: ${(err as Error).message}`);
      }
    }
    if (!caught) throw new Error('Test 3 failed: expected error was not thrown');
    console.log('[PASS] Test 3: Malformed JSON safely caught with clear error');
    passedCount++;
  }

  // 4. Zod validation failure handling
  {
    console.log('[Test 4] Testing Zod validation failure...');
    const invalidSchemaResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              claims: [
                {
                  // Missing required originalStatement and category
                  relatedTechnologies: 'not-an-array',
                },
              ],
            }),
          },
        },
      ],
    };
    const mockFetch = async () => createMockResponse(200, invalidSchemaResponse);
    const provider = new GroqProvider({
      apiKey: 'test-key-mock',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    let caught = false;
    try {
      await provider.extractClaims('some text');
    } catch (err: unknown) {
      caught = true;
      if ((err as { name?: string }).name !== 'ZodError') {
        throw new Error(`Test 4 failed: expected ZodError but got ${(err as Error).name}`);
      }
    }
    if (!caught) throw new Error('Test 4 failed: Zod validation error not triggered');
    console.log('[PASS] Test 4: Zod validation error correctly caught on invalid structure');
    passedCount++;
  }

  // 5. HTTP 401 Unauthorized handling
  {
    console.log('[Test 5] Testing HTTP 401 handling...');
    const mockFetch = async () => createMockResponse(401, 'Unauthorized', 'Unauthorized');
    const provider = new GroqProvider({
      apiKey: 'invalid-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    let caught = false;
    try {
      await provider.extractClaims('some text');
    } catch (err: unknown) {
      caught = true;
      if (!(err as Error).message.includes('401')) {
        throw new Error(`Test 5 failed: expected 401 in error message: ${(err as Error).message}`);
      }
    }
    if (!caught) throw new Error('Test 5 failed: 401 error not handled');
    console.log('[PASS] Test 5: HTTP 401 handled with clear authentication error');
    passedCount++;
  }

  // 6. HTTP 429 Rate Limit / Quota Exceeded handling
  {
    console.log('[Test 6] Testing HTTP 429 handling...');
    const mockFetch = async () => createMockResponse(429, 'Rate limit exceeded', 'Too Many Requests');
    const provider = new GroqProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    let caught = false;
    try {
      await provider.extractClaims('some text');
    } catch (err: unknown) {
      caught = true;
      if (!(err as Error).message.includes('429')) {
        throw new Error(`Test 6 failed: expected 429 in error message: ${(err as Error).message}`);
      }
    }
    if (!caught) throw new Error('Test 6 failed: 429 error not handled');
    console.log('[PASS] Test 6: HTTP 429 handled with clear rate limit error (no infinite retry loop)');
    passedCount++;
  }

  // 7. HTTP 5xx Server Error handling
  {
    console.log('[Test 7] Testing HTTP 5xx handling...');
    const mockFetch = async () => createMockResponse(503, 'Service Unavailable', 'Service Unavailable');
    const provider = new GroqProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    let caught = false;
    try {
      await provider.extractClaims('some text');
    } catch (err: unknown) {
      caught = true;
      if (!(err as Error).message.includes('503')) {
        throw new Error(`Test 7 failed: expected 503 in error message: ${(err as Error).message}`);
      }
    }
    if (!caught) throw new Error('Test 7 failed: 5xx error not handled');
    console.log('[PASS] Test 7: HTTP 5xx handled with clear upstream service error');
    passedCount++;
  }

  // 8. Timeout or Network Failure handling
  {
    console.log('[Test 8] Testing Timeout & Network Failure...');
    const mockFetch = async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    };
    const provider = new GroqProvider({
      apiKey: 'test-key',
      fetchFn: mockFetch as unknown as typeof fetch,
      timeoutMs: 1000,
    });

    let caught = false;
    try {
      await provider.extractClaims('some text');
    } catch (err: unknown) {
      caught = true;
      if (!(err as Error).message.includes('timed out')) {
        throw new Error(`Test 8 failed: expected timeout error message: ${(err as Error).message}`);
      }
    }
    if (!caught) throw new Error('Test 8 failed: timeout error not handled');
    console.log('[PASS] Test 8: Request timeout handled gracefully');
    passedCount++;
  }

  // 9. Missing API Key handling
  {
    console.log('[Test 9] Testing Missing API Key handling...');
    const provider = new GroqProvider({ apiKey: '' });

    let caught = false;
    try {
      await provider.extractClaims('some text');
    } catch (err: unknown) {
      caught = true;
      if (!(err as Error).message.includes('not configured')) {
        throw new Error(`Test 9 failed: expected 'not configured' message: ${(err as Error).message}`);
      }
    }
    if (!caught) throw new Error('Test 9 failed: missing key error not thrown');
    console.log('[PASS] Test 9: Missing API key detected and prevented unauthorized request');
    passedCount++;
  }

  // 10. Mock Provider Still Working Without Live Key
  {
    console.log('[Test 10] Testing Mock Provider Fallback...');
    const { claims } = await mockAIProvider.extractClaims('');
    if (claims.length !== 4) {
      throw new Error(`Test 10 failed: expected 4 benchmark claims, got ${claims.length}`);
    }
    const sessionRes = await mockAIProvider.startDefense([claims[0].id]);
    const answerRes = await mockAIProvider.evaluateAnswer(
      sessionRes.session,
      claims[0].id,
      sessionRes.firstQuestion.id,
      'We separated account and transfer services using Spring Boot REST endpoints.'
    );
    if (!answerRes.evaluation || typeof answerRes.evaluation.score !== 'number') {
      throw new Error('Test 10 failed: mock evaluation output malformed');
    }
    console.log(`[PASS] Test 10: Mock provider operates cleanly (score=${answerRes.evaluation.score}, claims=${claims.length})`);
    passedCount++;
  }

  console.log(`\n--- All ${passedCount}/10 Offline Groq Unit Tests Passed! ---`);
}

runOfflineGroqTests().catch((err) => {
  console.error('[FAILED] Offline test suite failed:', err);
  process.exit(1);
});
