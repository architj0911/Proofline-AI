import React from 'react';
import { ResumeClaim, ResumeProfile } from '../../types';
import { ShieldAlert, HelpCircle, CheckCircle2, User, Sparkles, Quote, FolderGit2 } from 'lucide-react';

interface ClaimsViewProps {
  claims: ResumeClaim[];
  profile?: ResumeProfile;
  selectedClaimIds: string[];
  onToggleClaim: (claimId: string) => void;
  onStartDefense: () => void;
  isLoading?: boolean;
}

export const ClaimsView: React.FC<ClaimsViewProps> = ({
  claims,
  profile,
  selectedClaimIds,
  onToggleClaim,
  onStartDefense,
  isLoading = false,
}) => {
  const getStatusBadge = (status: ResumeClaim['status']) => {
    switch (status) {
      case 'Demonstrated understanding':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" /> Demonstrated understanding
          </span>
        );
      case 'Needs improvement':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <ShieldAlert className="w-3.5 h-3.5" /> Needs improvement
          </span>
        );
      case 'Needs evidence':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-950/80 text-sky-400 border border-sky-800/60">
            <HelpCircle className="w-3.5 h-3.5" /> Needs evidence
          </span>
        );
      case 'Unverified':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-700/60">
            <ShieldAlert className="w-3.5 h-3.5" /> Unverified
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Extracted Profile Summary Card (if profile exists) */}
      {profile && (
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-bold text-sm">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {profile.candidateName || 'Parsed Candidate Resume'}
                </h3>
                <p className="text-xs text-slate-400">
                  {[profile.contactEmail, profile.contactPhone].filter(Boolean).join(' • ') ||
                    profile.headlineOrObjective ||
                    'Real Candidate Resume Profile'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {profile.projects.length} project(s) • {profile.technicalSkills.length} skill(s) detected
              </span>
            </div>
          </div>

          {profile.technicalSkills.length > 0 && (
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block mb-1.5">
                Stated Technical Skills:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.technicalSkills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 font-mono border border-slate-700/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Claims Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Extracted Resume Technical Claims ({claims.length})
          </h2>
          <p className="text-sm text-slate-400">
            Select claims to defend against AI-driven progressive technical questioning.
          </p>
        </div>
        <button
          onClick={onStartDefense}
          disabled={selectedClaimIds.length === 0 || isLoading}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-emerald-950"
        >
          {isLoading ? 'Starting Session...' : `Start Defense (${selectedClaimIds.length} Selected)`}
        </button>
      </div>

      {/* Claims Grid */}
      {claims.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <p className="text-sm text-slate-400">
            No technical claims extracted yet. Upload a PDF/DOCX resume or paste your resume text above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {claims.map((claim) => {
            const isSelected = selectedClaimIds.includes(claim.id);
            return (
              <div
                key={claim.id}
                onClick={() => onToggleClaim(claim.id)}
                className={`cursor-pointer rounded-xl p-5 border transition-all ${
                  isSelected
                    ? 'bg-slate-900/90 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-lg'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/90 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                      {claim.category}
                    </span>
                    {claim.projectName && (
                      <span className="text-xs font-mono text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900/40 flex items-center gap-1">
                        <FolderGit2 className="w-3 h-3" /> {claim.projectName}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(claim.status)}
                </div>

                <h3 className="text-base font-medium text-slate-100 mb-2 leading-snug">
                  "{claim.originalStatement}"
                </h3>

                {claim.sourceSnippet && claim.sourceSnippet !== claim.originalStatement && (
                  <div className="mb-3 p-2 rounded bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400 flex items-start gap-1.5 italic">
                    <Quote className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">Grounded in: "{claim.sourceSnippet}"</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {claim.relatedTechnologies.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="border-t border-slate-800/80 pt-3 text-xs text-slate-400 flex items-center justify-between">
                  <span>{claim.interviewQuestions.length} probing questions queued</span>
                  <span className="text-slate-500 font-mono">
                    {claim.evidenceReferences.length} evidence ref(s)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
