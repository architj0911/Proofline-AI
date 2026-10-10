import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  ResumeClaim,
  ResumeProfile,
  DefenseSession,
  InterviewQuestion,
  DefenseEvaluationResult,
  DefenseSessionReport,
  DefensePlanItem,
  HealthCheckResponse,
} from '../types';
import { ClaimsView } from '../features/claims/ClaimsView';
import { DefenseSessionView } from '../features/defense-session/DefenseSessionView';
import { EvidenceGraphView } from '../features/evidence-graph/EvidenceGraphView';
import { DefensePlanView } from '../features/defense-plan/DefensePlanView';
import {
  ShieldCheck,
  FileCheck2,
  BrainCircuit,
  Network,
  Compass,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  UploadCloud,
  FileUp,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { AuthButton } from '../features/auth/AuthButton';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'claims' | 'defense' | 'graph' | 'plan'>('claims');
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [claims, setClaims] = useState<ResumeClaim[]>([]);
  const [profile, setProfile] = useState<ResumeProfile | undefined>(undefined);
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [resumeTextInput, setResumeTextInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Defense State
  const [activeSession, setActiveSession] = useState<DefenseSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | undefined>(undefined);
  const [lastEvaluation, setLastEvaluation] = useState<DefenseEvaluationResult | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed Defense Report
  const [sessionReport, setSessionReport] = useState<DefenseSessionReport | undefined>(undefined);
  const [defensePlan, setDefensePlan] = useState<DefensePlanItem[] | undefined>(undefined);

  // Initial load: check backend status (do not force demo claims automatically)
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to query backend health:', err);
    }
  };

  const loadDefaultClaims = async () => {
    setIsExtracting(true);
    setExtractionError(null);
    setSuccessMessage(null);
    try {
      const data = await api.getDefaultClaims();
      setClaims(data.claims);
      setProfile(undefined);
      setSelectedClaimIds(data.claims.map((c) => c.id));
      setSuccessMessage('Loaded hackathon benchmark demo claims (Spring Boot banking microservices).');
    } catch (err) {
      console.error('Failed to load claims:', err);
      setExtractionError('Failed to load demo claims.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;
    setIsExtracting(true);
    setExtractionError(null);
    setSuccessMessage(null);
    try {
      const data = await api.uploadResume(file);
      setClaims(data.claims);
      setProfile(data.profile);
      setSelectedClaimIds(data.claims.map((c) => c.id));
      setSuccessMessage(
        data.message || `Successfully parsed ${file.name} and extracted ${data.claims.length} technical claims.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse resume document';
      setExtractionError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractClaims = async () => {
    if (!resumeTextInput.trim()) {
      setExtractionError('Please enter or paste resume content.');
      return;
    }
    setIsExtracting(true);
    setExtractionError(null);
    setSuccessMessage(null);
    try {
      const data = await api.extractClaims(resumeTextInput);
      setClaims(data.claims);
      setProfile(data.profile);
      setSelectedClaimIds(data.claims.map((c) => c.id));
      setSuccessMessage(
        data.message || `Extracted ${data.claims.length} technical claims from provided text.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract claims from text';
      setExtractionError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleToggleClaim = (claimId: string) => {
    setSelectedClaimIds((prev) =>
      prev.includes(claimId) ? prev.filter((id) => id !== claimId) : [...prev, claimId]
    );
  };

  const handleStartDefense = async () => {
    if (selectedClaimIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await api.startDefense(selectedClaimIds, claims);
      setActiveSession(res.session);
      setCurrentQuestion(res.firstQuestion);
      setLastEvaluation(undefined);
      setActiveTab('defense');
    } catch (err) {
      console.error('Error starting defense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnswer = async (answerText: string) => {
    if (!activeSession || !currentQuestion) return;
    setIsSubmitting(true);
    try {
      const res = await api.submitAnswer(
        activeSession.id,
        currentQuestion.claimId,
        currentQuestion.id,
        answerText
      );

      setLastEvaluation(res.evaluation);

      // Update local claim state with newly assessed status
      setClaims((prev) =>
        prev.map((c) => (c.id === res.updatedClaim.id ? res.updatedClaim : c))
      );

      if (res.sessionComplete || !res.nextQuestion) {
        setCurrentQuestion(undefined);
      } else {
        setCurrentQuestion(res.nextQuestion);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishDefense = async () => {
    if (!activeSession) return;
    setIsSubmitting(true);
    try {
      const res = await api.finishDefense(activeSession.id);
      setSessionReport(res.report);
      setDefensePlan(res.defensePlan);
      setActiveTab('plan');
    } catch (err) {
      console.error('Error finishing defense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Proofline AI</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Hackathon v0.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Resume Technical Claim Defense Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {health && (
              <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hidden sm:flex">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300">Backend: {health.status}</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400">
                  {health.activeProvider === 'gemini'
                    ? `Gemini (${health.model?.split('/').pop() || 'Live'})`
                    : health.activeProvider === 'groq'
                    ? `Groq (${health.model?.split('/').pop() || 'Live'})`
                    : health.activeProvider === 'openrouter'
                    ? `OpenRouter (${health.model?.split('/').pop() || 'Live'})`
                    : 'Mock AI'}
                </span>
                {health.fallbackProvider && health.fallbackProvider !== 'none' && (
                  <span className="text-[10px] text-slate-500 hidden md:inline">
                    (backup: {health.fallbackProvider})
                  </span>
                )}
              </div>
            )}
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Design Notification Banner */}
      <div className="bg-emerald-950/40 border-b border-emerald-900/40 px-4 py-2.5 text-xs text-emerald-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Google Stitch Architecture Ready:</strong> Frontend scaffold and API contracts established. Components are prepared for Google Stitch design token & layout export.
            </span>
          </div>
          <a
            href="https://stitch.withgoogle.com/projects/11316214815449627283"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-400 underline hover:text-emerald-300 flex-shrink-0"
          >
            Stitch Reference <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'claims'
                ? 'border-emerald-500 text-white bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>1. Resume Claims ({claims.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('defense')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'defense'
                ? 'border-emerald-500 text-white bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>2. Defense Session</span>
            {activeSession && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'graph'
                ? 'border-emerald-500 text-white bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>3. Evidence Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'plan'
                ? 'border-emerald-500 text-white bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>4. Defense Plan</span>
            {defensePlan && (
              <span className="text-xs px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono">
                {defensePlan.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Claims & Extract */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            {/* Resume Ingestion Section */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        uploadMode === 'file'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileUp className="w-3.5 h-3.5" /> Upload File (PDF/DOCX/TXT)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('text')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        uploadMode === 'text'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> Paste Text
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadDefaultClaims}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Load Hackathon Benchmark Claims
                </button>
              </div>

              {/* Status & Error Alerts */}
              {extractionError && (
                <div className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{extractionError}</span>
                  </div>
                  <button
                    onClick={() => setExtractionError(null)}
                    className="text-rose-400 hover:text-rose-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {successMessage && (
                <div className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="text-emerald-400 hover:text-emerald-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* File Upload Mode */}
              {uploadMode === 'file' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setSelectedFile(file);
                        handleFileUpload(file);
                      }
                    }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setSelectedFile(file);
                        handleFileUpload(file);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-950/20'
                        : selectedFile
                        ? 'border-emerald-700/60 bg-slate-950/80'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-medium text-slate-200">
                        {selectedFile ? (
                          <span className="text-emerald-400 font-semibold">{selectedFile.name}</span>
                        ) : (
                          <>
                            Click to upload or drag & drop your resume
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Supports PDF (.pdf), Microsoft Word (.docx), or Plain Text (.txt) up to 5MB
                      </p>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium text-white">{selectedFile.name}</span>
                        <span className="text-slate-500">
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          disabled={isExtracting}
                          onClick={() => handleFileUpload(selectedFile)}
                          className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {isExtracting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {isExtracting ? 'Analyzing Resume...' : 'Analyze Resume File'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Paste Text Mode */}
              {uploadMode === 'text' && (
                <div className="space-y-3">
                  <textarea
                    rows={5}
                    value={resumeTextInput}
                    onChange={(e) => setResumeTextInput(e.target.value)}
                    placeholder="Paste your resume contents, technical summary, or project descriptions here (e.g. 'Senior Full Stack Engineer: Architected microservices with Kafka and Go; reduced database query latency by 45% using Redis caching; designed OAuth2/OIDC identity management...')..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {resumeTextInput.length} characters
                    </span>
                    <button
                      type="button"
                      onClick={handleExtractClaims}
                      disabled={!resumeTextInput.trim() || isExtracting}
                      className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {isExtracting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isExtracting ? 'Extracting & Grounding Claims...' : 'Extract & Ground Claims'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {claims.length === 0 && !isExtracting ? (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
                <FileCheck2 className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-semibold text-slate-200">No Technical Claims Loaded</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Upload your PDF or DOCX resume above, or paste raw text to extract grounded technical claims for interview defense.
                </p>
                <button
                  onClick={loadDefaultClaims}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Or explore with Benchmark Demo Claims
                </button>
              </div>
            ) : (
              <ClaimsView
                claims={claims}
                profile={profile}
                selectedClaimIds={selectedClaimIds}
                onToggleClaim={handleToggleClaim}
                onStartDefense={handleStartDefense}
                isLoading={isSubmitting}
              />
            )}
          </div>
        )}

        {/* Tab 2: Defense Session */}
        {activeTab === 'defense' && (
          <div>
            {activeSession ? (
              <DefenseSessionView
                session={activeSession}
                currentQuestion={currentQuestion}
                onSubmitAnswer={handleSubmitAnswer}
                onFinishSession={handleFinishDefense}
                lastEvaluation={lastEvaluation}
                isSubmitting={isSubmitting}
              />
            ) : (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
                <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-semibold text-slate-200">No Active Defense Session</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Select technical claims from the Claims tab and click "Start Defense" to launch an
                  interactive AI probing session.
                </p>
                <button
                  onClick={() => setActiveTab('claims')}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  Go to Claims
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Interactive Evidence Graph */}
        {activeTab === 'graph' && <EvidenceGraphView claims={claims} />}

        {/* Tab 4: Defense Plan */}
        {activeTab === 'plan' && (
          <div>
            {defensePlan || sessionReport ? (
              <DefensePlanView
                report={sessionReport}
                defensePlan={defensePlan}
                onRestartSession={() => {
                  setActiveSession(null);
                  setCurrentQuestion(undefined);
                  setSessionReport(undefined);
                  setDefensePlan(undefined);
                  setActiveTab('claims');
                }}
              />
            ) : (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
                <Compass className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-semibold text-slate-200">No Defense Plan Generated Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Complete an interview defense session to generate a personalized remediation plan
                  and interview readiness score.
                </p>
                <button
                  onClick={() => {
                    if (activeSession) {
                      setActiveTab('defense');
                    } else {
                      handleStartDefense();
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  {activeSession ? 'Continue Defense' : 'Start Defense Session'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Proofline AI — Azisly.ai National Level AI Hackathon (Problem Statement 4: Student Pain Points)
      </footer>
    </div>
  );
};
export default App;
