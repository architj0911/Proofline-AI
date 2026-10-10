import React from 'react';
import { DefenseSessionReport, DefensePlanItem } from '../../types';
import { Target, CheckCircle2, AlertOctagon, HelpCircle, ArrowUpRight, BookOpen } from 'lucide-react';

interface DefensePlanViewProps {
  report?: DefenseSessionReport;
  defensePlan?: DefensePlanItem[];
  onRestartSession?: () => void;
}

export const DefensePlanView: React.FC<DefensePlanViewProps> = ({
  report,
  defensePlan = [],
  onRestartSession,
}) => {
  const getPriorityBadge = (priority: DefensePlanItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80';
      case 'medium':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80';
      case 'low':
      default:
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Report Card */}
      {report && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                Readiness Evaluation
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">Interview Defense Report</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400">{report.overallReadiness}%</div>
                <div className="text-xs text-slate-400 font-mono">Defense Confidence</div>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300 bg-slate-950/60 p-4 rounded-lg border border-slate-800/60 leading-relaxed">
            {report.executiveSummary}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Total Claims</div>
              <div className="text-lg font-bold text-slate-200 mt-1">{report.totalClaims}</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
              <div className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Demonstrated
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-1">{report.demonstratedCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40">
              <div className="text-xs text-amber-400 flex items-center justify-center gap-1">
                <AlertOctagon className="w-3 h-3" /> Needs Improvement
              </div>
              <div className="text-lg font-bold text-amber-400 mt-1">{report.needsImprovementCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-900/40">
              <div className="text-xs text-sky-400 flex items-center justify-center gap-1">
                <HelpCircle className="w-3 h-3" /> Needs Evidence
              </div>
              <div className="text-lg font-bold text-sky-400 mt-1">{report.needsEvidenceCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Prioritized Action Plan */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Prioritized Remediation Defense Plan</h3>
          </div>
          {onRestartSession && (
            <button
              onClick={onRestartSession}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Start New Defense
            </button>
          )}
        </div>

        {defensePlan.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
            No action items needed. All evaluated claims demonstrated strong understanding or no defense gaps were recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {defensePlan.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
              >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border ${getPriorityBadge(
                        item.priority
                      )}`}
                    >
                      {item.priority} priority
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Milestone: {item.targetMilestone}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-slate-100">{item.topic}</h4>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs space-y-1.5">
                <div>
                  <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px]">
                    Identified Gap:
                  </span>{' '}
                  <span className="text-slate-300">{item.gapSummary}</span>
                </div>
                <div>
                  <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
                    Recommended Action:
                  </span>{' '}
                  <span className="text-slate-200">{item.recommendedAction}</span>
                </div>
              </div>

              {item.recommendedResources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.recommendedResources.map((res, rIdx) => (
                    <a
                      key={rIdx}
                      href={res.url || '#'}
                      target={res.url ? '_blank' : undefined}
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 border border-slate-700/60 transition-colors"
                    >
                      <BookOpen className="w-3 h-3 text-sky-400" />
                      <span>{res.title}</span>
                      {res.url && <ArrowUpRight className="w-3 h-3 text-slate-400" />}
                    </a>
                  ))}
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
