import crypto from 'crypto';
import {
  ResumeClaim,
  DefenseSession,
  InterviewQuestion,
  DefenseEvaluationResult,
  DefenseSessionReport,
  DefensePlanItem,
  ClaimStatus,
  ResumeProfile,
  ResumeProject,
} from '../../src/types';
import { INITIAL_MOCK_CLAIMS } from '../../src/data/mock-data';

export class MockAIProvider {
  getModel(): string {
    return 'deterministic-mock-v1';
  }

  isConfigured(): boolean {
    return true;
  }

  /**
   * Deterministically parses actual resume text into structured profile and claims.
   * NEVER silently substitutes benchmark data when custom text is supplied.
   */
  async extractClaims(resumeText: string): Promise<{ claims: ResumeClaim[]; profile?: ResumeProfile }> {
    const trimmed = resumeText.trim();
    if (!trimmed) {
      return {
        claims: JSON.parse(JSON.stringify(INITIAL_MOCK_CLAIMS)),
        profile: undefined,
      };
    }

    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Extract basic candidate info if present
    const firstLine = lines[0] || '';
    const emailMatch = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/i);
    const phoneMatch = trimmed.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    const candidateName =
      firstLine.length < 50 && !firstLine.includes('@') && !firstLine.includes('http')
        ? firstLine.replace(/^(Name|Candidate):\s*/i, '').replace(/[,|].*$/, '').trim()
        : 'Candidate';

    // Skill detection vocabulary
    const KNOWN_SKILLS = [
      'Java', 'Spring Boot', 'Python', 'React', 'TypeScript', 'JavaScript', 'Node.js',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS',
      'FastAPI', 'Django', 'Kafka', 'GraphQL', 'Next.js', 'Tailwind CSS', 'C++', 'Go',
      'Machine Learning', 'PyTorch', 'TensorFlow', 'REST API', 'Microservices', 'JWT',
    ];

    const detectedSkills = KNOWN_SKILLS.filter((skill) =>
      new RegExp(`\\b${skill.replace(/[+]/g, '\\+')}\\b`, 'i').test(trimmed)
    );

    // Identify candidate claims / project lines
    const bulletLines = lines.filter(
      (l) =>
        (l.startsWith('-') || l.startsWith('*') || l.startsWith('•') || /^[0-9]\./.test(l) || l.length > 30) &&
        !l.includes('@') &&
        !l.startsWith('http') &&
        l.toLowerCase() !== candidateName.toLowerCase()
    );

    const candidateStatements = bulletLines.length > 0 ? bulletLines.slice(0, 5) : [trimmed.slice(0, 150)];

    const projects: ResumeProject[] = [];
    const claims: ResumeClaim[] = candidateStatements.map((rawStatement, idx) => {
      const cleanStatement = rawStatement.replace(/^[-*•\d.]+\s*/, '').trim();

      // Detect technologies associated with this line
      const matchedTech = KNOWN_SKILLS.filter((skill) =>
        new RegExp(`\\b${skill.replace(/[+]/g, '\\+')}\\b`, 'i').test(cleanStatement)
      );

      const technologies = matchedTech.length > 0 ? matchedTech : ['Software Engineering'];

      // Infer category
      let category = 'Software Engineering';
      const lower = cleanStatement.toLowerCase();
      if (lower.includes('model') || lower.includes('ml') || lower.includes('dataset') || lower.includes('train')) {
        category = 'Machine Learning';
      } else if (lower.includes('auth') || lower.includes('jwt') || lower.includes('security') || lower.includes('oauth')) {
        category = 'Security & Auth';
      } else if (lower.includes('database') || lower.includes('sql') || lower.includes('postgres') || lower.includes('mongo')) {
        category = 'Databases & Storage';
      } else if (lower.includes('frontend') || lower.includes('ui') || lower.includes('react') || lower.includes('css')) {
        category = 'Frontend Engineering';
      } else if (lower.includes('service') || lower.includes('backend') || lower.includes('api') || lower.includes('server')) {
        category = 'Backend Architecture';
      }

      const projectName = `Project ${idx + 1}`;
      projects.push({
        name: projectName,
        description: cleanStatement,
        technologies,
        sourceSnippet: cleanStatement,
      });

      const claimId = `claim-mock-${Date.now()}-${idx + 1}`;

      const interviewQuestions: InterviewQuestion[] = [
        {
          id: `q-mock-${claimId}-1`,
          claimId,
          difficulty: 'basic',
          questionText: `Walk me through your design and technical implementation for: "${cleanStatement}". What core trade-offs did you make?`,
          probingObjective: `Verify technical ownership of ${technologies.slice(0, 2).join(' and ')}.`,
          expectedConcepts: technologies,
        },
        {
          id: `q-mock-${claimId}-2`,
          claimId,
          difficulty: 'intermediate',
          questionText: `How did you test and handle failure scenarios or edge cases in this implementation?`,
          probingObjective: 'Probe error handling, reliability, and automated testing rigor.',
          expectedConcepts: ['Error handling', 'Edge cases', 'Testing'],
        },
      ];

      return {
        id: claimId,
        originalStatement: cleanStatement,
        category,
        projectName,
        relatedTechnologies: technologies,
        sourceSnippet: cleanStatement,
        groundingType: 'supported_by_snippet',
        status: 'Unverified' as ClaimStatus,
        knowledgeGaps: [],
        confidenceScore: 0,
        evidenceReferences: [
          {
            id: `ev-mock-${claimId}`,
            claimId,
            title: `Resume Excerpt: ${category}`,
            type: 'text_description',
            description: cleanStatement,
            isVerified: false,
            verificationNotes: 'Unverified: Self-reported resume text requiring technical interview defense.',
          },
        ],
        interviewQuestions,
      };
    });

    const profile: ResumeProfile = {
      id: `profile-${Date.now()}`,
      candidateName: candidateName !== 'Candidate' ? candidateName : undefined,
      contactEmail: emailMatch ? emailMatch[0] : undefined,
      contactPhone: phoneMatch ? phoneMatch[0] : undefined,
      technicalSkills: detectedSkills,
      projects,
      parsedAt: new Date().toISOString(),
    };

    return { claims, profile };
  }

  async startDefense(
    claimIds: string[],
    providedClaims?: ResumeClaim[]
  ): Promise<{ session: DefenseSession; firstQuestion: InterviewQuestion }> {
    const claimsSource = providedClaims && providedClaims.length > 0 ? providedClaims : INITIAL_MOCK_CLAIMS;
    const selectedClaims = claimsSource.filter((c) => claimIds.includes(c.id));
    const claims = selectedClaims.length > 0 ? selectedClaims : claimsSource.slice(0, 2);

    const firstClaim = claims[0];
    const firstQuestion =
      firstClaim.interviewQuestions[0] || {
        id: `q-${firstClaim.id}-1`,
        claimId: firstClaim.id,
        difficulty: 'basic',
        questionText: `Can you explain your technical implementation for: "${firstClaim.originalStatement}"?`,
        probingObjective: 'Verify hands-on competency.',
        expectedConcepts: firstClaim.relatedTechnologies,
      };

    const session: DefenseSession = {
      id: `session-${crypto.randomUUID()}`,
      title: `Technical Defense: ${claims.length} Claims`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      claims,
      currentClaimId: firstClaim.id,
      currentQuestion: firstQuestion,
      answers: [],
      status: 'in_progress',
    };

    return { session, firstQuestion };
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
    const claim = session.claims.find((c) => c.id === claimId);
    if (!claim) {
      throw new Error(`Claim not found with ID: ${claimId}`);
    }

    const question = claim.interviewQuestions.find((q) => q.id === questionId) || session.currentQuestion;
    const answerLen = answerText.trim().length;

    const expected = question?.expectedConcepts || claim.relatedTechnologies;
    const matchedConcepts = expected.filter((concept) =>
      answerText.toLowerCase().includes(concept.toLowerCase())
    );

    let score = 50;
    let recommendedStatus: ClaimStatus = 'Needs improvement';
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const gaps: string[] = [];

    if (answerLen < 30) {
      score = 25;
      weaknesses.push('Answer is very brief and does not address the question asked.');
      gaps.push(`Core principles of ${question?.probingObjective || 'the question'}`);
      recommendedStatus = 'Needs improvement';
    } else if (matchedConcepts.length >= 1 || answerLen > 120) {
      score = 80;
      strengths.push(
        `Addressed relevant concepts: ${matchedConcepts.length > 0 ? matchedConcepts.join(', ') : 'architecture flow'}`
      );
      recommendedStatus = 'Demonstrated understanding';
    } else {
      score = 55;
      strengths.push('Demonstrates partial familiarity with high-level concept.');
      weaknesses.push(`Could provide more concrete details on ${expected[0] || 'core mechanics'}.`);
      gaps.push(`Deep dive on ${question?.probingObjective || 'implementation trade-offs'}`);
      recommendedStatus = 'Needs improvement';
    }

    const feedback =
      score >= 75
        ? `Solid defense on this question. You demonstrated practical awareness of ${matchedConcepts.join(' & ') || 'the implementation'}.`
        : `Partial answer. The response touches on the concept, but an interviewer will look for concrete implementation details on ${expected[0] || 'the core mechanism'}.`;

    const evaluation: DefenseEvaluationResult = {
      score,
      feedback,
      strengths,
      weaknesses,
      gapsIdentified: gaps,
      recommendedStatus,
    };

    claim.status = recommendedStatus;
    claim.confidenceScore = score;
    if (gaps.length > 0) {
      claim.knowledgeGaps = Array.from(new Set([...claim.knowledgeGaps, ...gaps]));
    }

    const answeredQuestionIds = new Set(session.answers.map((a) => a.questionId));
    answeredQuestionIds.add(questionId);

    const nextInSameClaim = claim.interviewQuestions.find((q) => !answeredQuestionIds.has(q.id));
    let nextQuestion: InterviewQuestion | undefined = nextInSameClaim;

    if (!nextQuestion) {
      const nextClaim = session.claims.find((c) =>
        c.interviewQuestions.some((q) => !answeredQuestionIds.has(q.id))
      );
      if (nextClaim) {
        nextQuestion = nextClaim.interviewQuestions.find((q) => !answeredQuestionIds.has(q.id));
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

  async finishDefense(session: DefenseSession): Promise<{
    session: DefenseSession;
    report: DefenseSessionReport;
    defensePlan: DefensePlanItem[];
  }> {
    const claims = session.claims;
    const demonstratedCount = claims.filter((c) => c.status === 'Demonstrated understanding').length;
    const needsImprovementCount = claims.filter((c) => c.status === 'Needs improvement').length;
    const needsEvidenceCount = claims.filter((c) => c.status === 'Needs evidence').length;
    const unverifiedCount = claims.filter((c) => c.status === 'Unverified').length;

    const totalClaims = claims.length;
    const totalScore = claims.reduce((acc, c) => acc + (c.confidenceScore || 0), 0);
    const overallReadiness = totalClaims > 0 ? Math.round(totalScore / totalClaims) : 0;

    const keyStrengths: string[] = [];
    const criticalGaps: string[] = [];

    claims.forEach((c) => {
      if (c.status === 'Demonstrated understanding') {
        keyStrengths.push(`${c.category}: ${c.originalStatement}`);
      }
      if (c.knowledgeGaps && c.knowledgeGaps.length > 0) {
        criticalGaps.push(...c.knowledgeGaps.map((g) => `[${c.category}] ${g}`));
      }
    });

    if (keyStrengths.length === 0) {
      keyStrengths.push('Demonstrated willingness to defend technical claims.');
    }

    const executiveSummary =
      overallReadiness >= 75
        ? `Candidate demonstrated solid command over ${demonstratedCount} of ${totalClaims} technical claims.`
        : `Candidate showed partial defense capability. While foundational understanding is present, ${needsImprovementCount + unverifiedCount} claims require deeper technical substantiation.`;

    const report: DefenseSessionReport = {
      totalClaims,
      demonstratedCount,
      needsImprovementCount,
      needsEvidenceCount,
      unverifiedCount,
      overallReadiness,
      executiveSummary,
      keyStrengths,
      criticalGaps,
    };

    const defensePlan: DefensePlanItem[] = claims.map((c, idx) => {
      const priority =
        c.status === 'Needs improvement' || c.status === 'Unverified'
          ? 'high'
          : c.status === 'Needs evidence'
          ? 'medium'
          : 'low';

      return {
        id: `plan-item-${idx + 1}`,
        claimId: c.id,
        priority,
        topic: c.originalStatement,
        gapSummary:
          c.knowledgeGaps && c.knowledgeGaps.length > 0
            ? c.knowledgeGaps.join('; ')
            : 'Review failure scenarios and edge cases.',
        recommendedAction:
          priority === 'high'
            ? `Deep dive on architectural trade-offs and code implementation for ${(c.relatedTechnologies || []).join(', ') || 'core concepts'}.`
            : `Prepare concrete evidence and code references for ${c.originalStatement}.`,
        recommendedResources: [
          {
            title: `${(c.relatedTechnologies && c.relatedTechnologies[0]) || 'Technical'} Architecture Guide`,
            type: 'documentation',
          },
        ],
        targetMilestone: `Day ${idx + 2}: Verbal defense rehearsal on ${c.category}`,
      };
    });

    session.status = 'completed';
    session.summaryReport = report;
    session.defensePlan = defensePlan;

    return {
      session,
      report,
      defensePlan,
    };
  }
}

export const mockAIProvider = new MockAIProvider();
