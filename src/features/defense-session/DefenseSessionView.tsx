import React, { useState } from 'react';
import { DefenseSession, InterviewQuestion, DefenseEvaluationResult } from '../../types';
import { Send, CheckCircle2, AlertTriangle, ArrowRight, Award } from 'lucide-react';

interface DefenseSessionViewProps {
  session: DefenseSession;
  currentQuestion?: InterviewQuestion;
  onSubmitAnswer: (answerText: string) => Promise<void>;
  onFinishSession: () => Promise<void>;
  lastEvaluation?: DefenseEvaluationResult;
  isSubmitting?: boolean;
}

export const DefenseSessionView: React.FC<DefenseSessionViewProps> = ({
  session,
  currentQuestion,
  onSubmitAnswer,
  onFinishSession,
  lastEvaluation,
  isSubmitting = false,
}) => {
  const [answerInput, setAnswerInput] = useState('');

  const currentClaim = session.claims.find((c) => c.id === session.currentClaimId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || isSubmitting) return;
    await onSubmitAnswer(answerInput);
    setAnswerInput('');
  };

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case 'stress_test':
        return 'bg-purple-950/80 text-purple-400 border-purple-800/60';
      case 'advanced':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/60';
      case 'intermediate':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/60';
      case 'basic':
      default:
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Progress Header */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">
              Live Defense In Progress
            </span>
          </div>
          <h2 className="text-lg font-semibold text-white">
            {currentClaim ? `Defending: "${currentClaim.originalStatement}"` : session.title}
          </h2>
        </div>

        <button
          onClick={onFinishSession}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          Wrap Session & View Plan
        </button>
      </div>

      {/* Active Question Box */}
      {currentQuestion ? (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getDifficultyBadge(
                currentQuestion.difficulty
              )}`}
            >
              {currentQuestion.difficulty} Challenge
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Probing: {currentQuestion.probingObjective}
            </span>
          </div>

          <h3 className="text-xl font-medium text-slate-100 leading-relaxed">
            {currentQuestion.questionText}
          </h3>

          <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/60">
            <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
              Expected Competency Targets:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentQuestion.expectedConcepts.map((concept) => (
                <span
                  key={concept}
                  className="text-xs px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-slate-300">
              Your Technical Defense:
            </label>
            <textarea
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Explain the architectural reasoning, trade-offs, and failure recovery mechanisms you implemented..."
              rows={5}
              disabled={isSubmitting}
              className="w-full p-3.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition-all resize-y"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!answerInput.trim() || isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-emerald-950"
              >
                {isSubmitting ? (
                  'Evaluating Defense...'
                ) : (
                  <>
                    Submit Answer <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
          <Award className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-semibold text-white">All Questions Defended!</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You have completed technical challenges for all selected claims. Generate your readiness
            report and defense plan.
          </p>
          <button
            onClick={onFinishSession}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg"
          >
            Generate Personalized Defense Plan <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time Feedback Card */}
      {lastEvaluation && (
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">Latest Defense Evaluation</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              Score: {lastEvaluation.score} / 100
            </span>
          </div>

          <p className="text-sm text-slate-300 italic">"{lastEvaluation.feedback}"</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            {lastEvaluation.strengths.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                </span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {lastEvaluation.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {lastEvaluation.gapsIdentified.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 space-y-1">
                <span className="font-semibold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Gaps to Address
                </span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {lastEvaluation.gapsIdentified.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
