process.env.NODE_ENV = 'test';
process.env.USE_MOCK_AI = 'true';

import http from 'http';
import app from './index';
import {
  HealthCheckResponse,
  ExtractClaimsResponse,
  StartDefenseResponse,
  AnswerDefenseResponse,
  FinishDefenseResponse,
} from '../src/types';

async function runTests() {
  console.log('--- Starting Proofline AI Backend Smoke & Contract Tests ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3001;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health check
    console.log('[Test 1] Testing GET /api/health...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);
    const healthData = (await healthRes.json()) as HealthCheckResponse;
    console.log(`[PASS] Health check: status="${healthData.status}", mockMode=${healthData.mockMode}`);

    // 2. Default Claims
    console.log('[Test 2] Testing GET /api/claims/default...');
    const claimsRes = await fetch(`${baseUrl}/api/claims/default`);
    if (!claimsRes.ok) throw new Error(`Claims default failed: ${claimsRes.status}`);
    const claimsData = (await claimsRes.json()) as ExtractClaimsResponse;
    console.log(`[PASS] Default claims loaded: ${claimsData.claims.length} claims found.`);
    const sampleClaim = claimsData.claims[0];
    console.log(`       Claim 1: "${sampleClaim.originalStatement}" (Status: ${sampleClaim.status})`);

    // 3. Claims Extract
    console.log('[Test 3] Testing POST /api/claims/extract...');
    const extractRes = await fetch(`${baseUrl}/api/claims/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: 'Built a Spring Boot microservices banking application with JWT.' }),
    });
    if (!extractRes.ok) throw new Error(`Claims extract failed: ${extractRes.status}`);
    const extractData = (await extractRes.json()) as ExtractClaimsResponse;
    console.log(`[PASS] Claims extract: returned ${extractData.claims.length} claims.`);

    // 4. Start Defense Session
    console.log('[Test 4] Testing POST /api/defense/start...');
    const startRes = await fetch(`${baseUrl}/api/defense/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimIds: [claimsData.claims[0].id, claimsData.claims[1].id] }),
    });
    if (!startRes.ok) throw new Error(`Start defense failed: ${startRes.status}`);
    const startData = (await startRes.json()) as StartDefenseResponse;
    console.log(`[PASS] Defense session created: sessionId="${startData.session.id}"`);
    console.log(`       First Question: "${startData.firstQuestion.questionText}"`);

    // 5. Answer Question
    console.log('[Test 5] Testing POST /api/defense/answer...');
    const answerRes = await fetch(`${baseUrl}/api/defense/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: startData.session.id,
        claimId: startData.firstQuestion.claimId,
        questionId: startData.firstQuestion.id,
        answerText:
          'I decomposed the banking system into an account service and transaction service using REST APIs and decoupled data stores. For transactions, we used the Saga pattern with compensating transactions.',
      }),
    });
    if (!answerRes.ok) throw new Error(`Answer question failed: ${answerRes.status}`);
    const answerData = (await answerRes.json()) as AnswerDefenseResponse;
    console.log(`[PASS] Answer evaluated: score=${answerData.evaluation.score}/100, updated status="${answerData.updatedClaim.status}"`);
    console.log(`       Feedback: "${answerData.evaluation.feedback}"`);

    // 6. Finish Defense Session
    console.log('[Test 6] Testing POST /api/defense/finish...');
    const finishRes = await fetch(`${baseUrl}/api/defense/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: startData.session.id }),
    });
    if (!finishRes.ok) throw new Error(`Finish defense failed: ${finishRes.status}`);
    const finishData = (await finishRes.json()) as FinishDefenseResponse;
    console.log(`[PASS] Defense session finished: readiness=${finishData.report.overallReadiness}%`);
    console.log(`       Generated ${finishData.defensePlan.length} defense plan items.`);
    console.log(`       Top plan item: Priority=${finishData.defensePlan[0].priority}, Milestone="${finishData.defensePlan[0].targetMilestone}"`);

    console.log('\n--- All 6 Backend Contract & Mock Provider Tests Passed! ---');
  } finally {
    server.closeAllConnections?.();
    server.close(() => {
      process.exit(0);
    });
  }
}

runTests().catch((err) => {
  console.error('[FAILED] Test suite failure:', err);
  process.exit(1);
});
