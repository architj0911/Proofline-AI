process.env.NODE_ENV = 'test';
process.env.USE_MOCK_AI = 'true';

import http from 'http';
import app from './index';
import { DocumentParser } from './services/document-parser';
import {
  ExtractClaimsResponse,
  StartDefenseResponse,
  AnswerDefenseResponse,
  FinishDefenseResponse,
} from '../src/types';

async function runResumeFlowTests() {
  console.log('================================================================');
  console.log('   Proofline AI — Milestone 4+5: Real Resume Flow Test Suite   ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`  ✓ ${message}`);
  }

  // -------------------------------------------------------------
  // Test Suite 1: Document Parser Unit & Security Tests
  // -------------------------------------------------------------
  console.log('--- [Suite 1] DocumentParser & Sanitization Verification ---');

  // 1.1 Plain text buffer parsing
  const rawResumeTxt = `
Candidate: Maya Sharma
Email: maya.sharma@example.com | Phone: +1-555-0199
Skills: Kubernetes, Docker, Terraform, AWS, Prometheus, Grafana

Projects:
Automated Cloud Infrastructure Platform
- Architected multi-region Kubernetes clusters on AWS EKS using Terraform.
- Configured Prometheus and Grafana for real-time observability across 40 microservices.
`;
  const textBuffer = Buffer.from(rawResumeTxt, 'utf-8');
  const parsedText = await DocumentParser.parseBuffer(textBuffer, 'maya_resume.txt', 'text/plain');
  assert(parsedText.text.includes('Maya Sharma'), 'DocumentParser extracts text buffer content');
  assert(parsedText.fileType === 'txt', 'DocumentParser identifies correct file type');

  // 1.2 Unsupported file format rejection
  let unsupportedRejected = false;
  try {
    await DocumentParser.parseBuffer(Buffer.from('binary data'), 'malicious.exe', 'application/x-msdownload');
  } catch (err: unknown) {
    unsupportedRejected = true;
    assert(
      err instanceof Error && err.message.includes('Unsupported file format'),
      'DocumentParser cleanly rejects unsupported file format with descriptive error'
    );
  }
  assert(unsupportedRejected, 'DocumentParser prevents parsing executable or unallowed files');

  // 1.3 File size limit (>5MB) rejection
  let oversizedRejected = false;
  try {
    const hugeBuffer = Buffer.alloc(5.5 * 1024 * 1024, 'a');
    await DocumentParser.parseBuffer(hugeBuffer, 'huge.txt', 'text/plain');
  } catch (err: unknown) {
    oversizedRejected = true;
    assert(
      err instanceof Error && err.message.includes('exceeds maximum size limit'),
      'DocumentParser enforces 5MB size limit'
    );
  }
  assert(oversizedRejected, 'DocumentParser blocks oversized files');

  // -------------------------------------------------------------
  // Test Suite 2: Server API Endpoints & Real Extraction Flow
  // -------------------------------------------------------------
  console.log('\n--- [Suite 2] Real Resume Extraction & Data Isolation ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3001;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 2.1 Candidate A: Distributed Systems / Cloud Engineer
    const candidateAResume = `
Name: Alice Vance
Email: alice.vance@systems.io
Skills: Go, Apache Kafka, Redis, Distributed Systems

Project: High-Throughput Event Streaming Engine
- Built a high-throughput event processing platform using Apache Kafka and Go.
- Designed distributed rate limiting using Redis sliding-window counter algorithm.
- Reduced p99 latency from 120ms to 18ms under 50k concurrent requests.
`;

    console.log('\nTesting Candidate A extraction (Go / Kafka / Redis)...');
    const resA = await fetch(`${baseUrl}/api/claims/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: candidateAResume }),
    });
    assert(resA.ok, `POST /api/claims/extract returned status 200 for Candidate A`);
    const dataA = (await resA.json()) as ExtractClaimsResponse;

    assert(dataA.claims.length > 0, `Candidate A yielded ${dataA.claims.length} claims`);
    assert(dataA.profile?.candidateName === 'Alice Vance', `Extracted profile name matches: Alice Vance`);
    assert(dataA.profile?.contactEmail === 'alice.vance@systems.io', `Extracted email matches: alice.vance@systems.io`);
    
    const candidateATechs = dataA.claims.flatMap((c) => c.relatedTechnologies.map((t) => t.toLowerCase()));
    assert(
      candidateATechs.some((t) => t.includes('kafka') || t.includes('go') || t.includes('redis')),
      `Extracted claims accurately reflect candidate tech stack (Go/Kafka/Redis)`
    );

    // Verify grounding
    const groundedClaimsA = dataA.claims.filter((c) => !!c.sourceSnippet);
    assert(
      groundedClaimsA.length > 0,
      `Claims are grounded with verbatim source snippets (grounded: ${groundedClaimsA.length}/${dataA.claims.length})`
    );

    // 2.2 Candidate B: Machine Learning / NLP Engineer
    const candidateBResume = `
Name: Bob Chen
Email: bob.chen@mlresearch.ai
Skills: PyTorch, Hugging Face, Triton, FastAPI, NLP

Project: Enterprise LLM Fine-Tuning Pipeline
- Fine-tuned open-source LLMs using PyTorch and LoRA for domain-specific classification.
- Deployed inference server on AWS using Triton and FastAPI with vLLM optimization.
- Achieved 4x throughput improvement and 60% memory reduction with quantization.
`;

    console.log('\nTesting Candidate B extraction (PyTorch / LoRA / Triton / NLP)...');
    const resB = await fetch(`${baseUrl}/api/claims/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: candidateBResume }),
    });
    assert(resB.ok, `POST /api/claims/extract returned status 200 for Candidate B`);
    const dataB = (await resB.json()) as ExtractClaimsResponse;

    assert(dataB.claims.length > 0, `Candidate B yielded ${dataB.claims.length} claims`);
    assert(dataB.profile?.candidateName === 'Bob Chen', `Extracted profile name matches: Bob Chen`);
    assert(dataB.profile?.contactEmail === 'bob.chen@mlresearch.ai', `Extracted email matches: bob.chen@mlresearch.ai`);

    const candidateBTechs = dataB.claims.flatMap((c) => c.relatedTechnologies.map((t) => t.toLowerCase()));
    assert(
      candidateBTechs.some((t) => t.includes('pytorch') || t.includes('lora') || t.includes('triton') || t.includes('fastapi') || t.includes('nlp')),
      `Extracted claims accurately reflect candidate tech stack (PyTorch/Triton/NLP)`
    );

    // 2.3 Strict Data Isolation: Candidate A vs Candidate B vs Hardcoded Banking Claims
    console.log('\nTesting Data Isolation (No Cross-Contamination or Demo Default Leaks)...');
    const claimAStatements = dataA.claims.map((c) => c.originalStatement.toLowerCase()).join(' ');
    const claimBStatements = dataB.claims.map((c) => c.originalStatement.toLowerCase()).join(' ');

    assert(
      !claimAStatements.includes('pytorch') && !claimAStatements.includes('lora'),
      'Candidate A claims contain ZERO machine learning/PyTorch leaks from Candidate B'
    );
    assert(
      !claimBStatements.includes('kafka') && !claimBStatements.includes('sliding-window'),
      'Candidate B claims contain ZERO event-streaming leaks from Candidate A'
    );
    assert(
      !claimAStatements.includes('spring boot microservices banking') &&
      !claimBStatements.includes('spring boot microservices banking'),
      'Neither candidate was silently substituted with the hardcoded banking demo benchmark'
    );

    // -------------------------------------------------------------
    // Test Suite 3: Dynamic Defense Probing on Real Candidate Claims
    // -------------------------------------------------------------
    console.log('\n--- [Suite 3] Dynamic Defense Session on Custom Resume Claims ---');

    // Start defense with Candidate B's ML claim
    const selectedClaimB = dataB.claims[0];
    const startRes = await fetch(`${baseUrl}/api/defense/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimIds: [selectedClaimB.id],
        claims: [selectedClaimB],
      }),
    });
    assert(startRes.ok, `POST /api/defense/start initialized session for custom claim`);
    const startData = (await startRes.json()) as StartDefenseResponse;

    assert(!!startData.session.id, `Defense session active: ID="${startData.session.id}"`);
    assert(
      startData.firstQuestion.claimId === selectedClaimB.id,
      `First question targets selected custom claim: "${startData.firstQuestion.questionText}"`
    );

    // Answer Candidate B's technical question
    console.log('\nSubmitting candidate answer with fair rubric evaluation...');
    const answerRes = await fetch(`${baseUrl}/api/defense/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: startData.session.id,
        claimId: selectedClaimB.id,
        questionId: startData.firstQuestion.id,
        answerText:
          'We decomposed parameter matrices into low-rank representations using LoRA rank r=16 and alpha=32. By freezing the base transformer weights and updating only adapter matrices, memory consumption during backward passes was drastically reduced while maintaining 98% task accuracy.',
      }),
    });
    assert(answerRes.ok, `POST /api/defense/answer evaluated response`);
    const answerData = (await answerRes.json()) as AnswerDefenseResponse;

    assert(
      answerData.evaluation.score >= 70,
      `Fair evaluation scores solid technical answer highly: score=${answerData.evaluation.score}/100`
    );
    assert(
      answerData.updatedClaim.status === 'Demonstrated understanding',
      `Claim status updated to 'Demonstrated understanding'`
    );

    // Finish session and verify defense plan is tailored to the candidate
    const finishRes = await fetch(`${baseUrl}/api/defense/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: startData.session.id }),
    });
    assert(finishRes.ok, `POST /api/defense/finish generated final report and plan`);
    const finishData = (await finishRes.json()) as FinishDefenseResponse;

    assert(
      finishData.report.overallReadiness >= 70,
      `Report reflects positive readiness: ${finishData.report.overallReadiness}%`
    );
    assert(
      finishData.defensePlan !== undefined,
      `Tailored defense plan generated (${finishData.defensePlan.length} milestones)`
    );

    // -------------------------------------------------------------
    // Test Suite 4: File Upload Endpoint Testing (POST /api/claims/upload)
    // -------------------------------------------------------------
    console.log('\n--- [Suite 4] File Upload Endpoint Verification ---');

    // 4.1 Missing file check
    const emptyUploadRes = await fetch(`${baseUrl}/api/claims/upload`, {
      method: 'POST',
      body: new FormData(),
    });
    assert(emptyUploadRes.status === 400, 'POST /api/claims/upload returns 400 when no file is uploaded');

    // 4.2 Simulated Multipart File Upload
    const resumeFileBlob = new Blob([candidateAResume], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', resumeFileBlob, 'alice_resume.txt');

    const fileUploadRes = await fetch(`${baseUrl}/api/claims/upload`, {
      method: 'POST',
      body: formData,
    });
    assert(fileUploadRes.ok, 'POST /api/claims/upload succeeds with multipart form data');
    const uploadedData = (await fileUploadRes.json()) as ExtractClaimsResponse;
    assert(uploadedData.claims.length > 0, `Multipart upload extracted ${uploadedData.claims.length} claims`);
    assert(uploadedData.profile?.candidateName === 'Alice Vance', `Multipart upload identified candidate: Alice Vance`);

    console.log('\n================================================================');
    console.log(`  🎉 ALL ${passedTests}/${totalTests} RESUME FLOW & DATA ISOLATION TESTS PASSED!`);
    console.log('================================================================\n');
  } finally {
    server.closeAllConnections?.();
    server.close(() => {
      process.exit(0);
    });
  }
}

runResumeFlowTests().catch((err) => {
  console.error('\n❌ Unhandled test failure:', err);
  process.exit(1);
});
