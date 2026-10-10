/**
 * Proofline AI — Shared Types
 * Core domain contracts for resume claim verification, interview defense sessions,
 * claim-to-evidence graph representations, and actionable defense plans.
 */

export type ClaimStatus =
  | 'Unverified'
  | 'Needs evidence'
  | 'Demonstrated understanding'
  | 'Needs improvement';

export type QuestionDifficulty = 'basic' | 'intermediate' | 'advanced' | 'stress_test';

export type EvidenceType =
  | 'github_repo'
  | 'commit'
  | 'code_snippet'
  | 'system_design'
  | 'live_demo'
  | 'text_description';

export interface EvidenceItem {
  id: string;
  claimId: string;
  title: string;
  type: EvidenceType;
  description: string;
  url?: string;
  isVerified: boolean;
  verificationNotes?: string;
}

export interface InterviewQuestion {
  id: string;
  claimId: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  probingObjective: string;
  expectedConcepts: string[];
  followUpContext?: string;
}

export interface DefenseEvaluationResult {
  score: number; // 0 - 100
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  gapsIdentified: string[];
  recommendedStatus: ClaimStatus;
}

export interface DefenseAnswer {
  questionId: string;
  claimId: string;
  answerText: string;
  answeredAt: string;
  evaluation?: DefenseEvaluationResult;
}

export type GroundingType = 'explicitly_stated' | 'inferred' | 'supported_by_snippet';

export interface ResumeProject {
  name: string;
  description?: string;
  technologies: string[];
  responsibilities?: string[];
  quantifiedAchievements?: string[];
  sourceSnippet?: string;
}

export interface ResumeExperience {
  role: string;
  company?: string;
  period?: string;
  summary?: string;
  sourceSnippet?: string;
}

export interface ResumeEducation {
  institution?: string;
  degree?: string;
  year?: string;
}

export interface ResumeProfile {
  id: string;
  candidateName?: string;
  contactEmail?: string;
  contactPhone?: string;
  headlineOrObjective?: string;
  education?: ResumeEducation[];
  technicalSkills: string[];
  nonTechnicalSkills?: string[];
  workExperience?: ResumeExperience[];
  projects: ResumeProject[];
  parsedAt: string;
}

export interface ResumeClaim {
  id: string;
  originalStatement: string;
  category: string;
  relatedTechnologies: string[];
  evidenceReferences: EvidenceItem[];
  interviewQuestions: InterviewQuestion[];
  status: ClaimStatus;
  knowledgeGaps: string[];
  confidenceScore?: number;
  sourceSnippet?: string;
  groundingType?: GroundingType;
  projectName?: string;
}

export interface DefenseSessionReport {
  totalClaims: number;
  demonstratedCount: number;
  needsImprovementCount: number;
  needsEvidenceCount: number;
  unverifiedCount: number;
  overallReadiness: number; // 0 - 100
  executiveSummary: string;
  keyStrengths: string[];
  criticalGaps: string[];
}

export interface DefensePlanResource {
  title: string;
  type: 'documentation' | 'lab_exercise' | 'architecture_diagram' | 'code_sample';
  url?: string;
}

export interface DefensePlanItem {
  id: string;
  claimId: string;
  priority: 'high' | 'medium' | 'low';
  topic: string;
  gapSummary: string;
  recommendedAction: string;
  recommendedResources: DefensePlanResource[];
  targetMilestone: string;
}

export interface DefenseSession {
  id: string;
  userId?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  claims: ResumeClaim[];
  currentClaimId?: string;
  currentQuestion?: InterviewQuestion;
  answers: DefenseAnswer[];
  status: 'created' | 'in_progress' | 'completed';
  summaryReport?: DefenseSessionReport;
  defensePlan?: DefensePlanItem[];
}

// -------------------------------------------------------------
// API Request & Response Contracts
// -------------------------------------------------------------

export interface ExtractClaimsRequest {
  resumeText: string;
}

export interface ExtractClaimsResponse {
  claims: ResumeClaim[];
  profile?: ResumeProfile;
  message?: string;
}

export interface StartDefenseRequest {
  claimIds: string[];
  claims?: ResumeClaim[];
}

export interface StartDefenseResponse {
  session: DefenseSession;
  firstQuestion: InterviewQuestion;
}

export interface AnswerDefenseRequest {
  sessionId: string;
  claimId: string;
  questionId: string;
  answerText: string;
}

export interface AnswerDefenseResponse {
  evaluation: DefenseEvaluationResult;
  updatedClaim: ResumeClaim;
  nextQuestion?: InterviewQuestion;
  sessionComplete: boolean;
}

export interface FinishDefenseRequest {
  sessionId: string;
}

export interface FinishDefenseResponse {
  session: DefenseSession;
  report: DefenseSessionReport;
  defensePlan: DefensePlanItem[];
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  timestamp: string;
  mockMode: boolean;
  activeProvider: 'mock' | 'gemini' | 'openrouter' | 'groq';
  fallbackProvider?: 'none' | 'gemini' | 'openrouter' | 'groq' | 'mock';
  model?: string;
  fallbackModel?: string;
  service: string;
  version: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
