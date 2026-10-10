import React, { useMemo } from 'react';
import { ResumeClaim } from '../../types';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network } from 'lucide-react';

interface EvidenceGraphViewProps {
  claims: ResumeClaim[];
}

export const EvidenceGraphView: React.FC<EvidenceGraphViewProps> = ({ claims }) => {
  // Construct nodes and edges connecting Claims -> Evidence -> Probing Questions
  const { nodes, edges } = useMemo(() => {
    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];

    let currentY = 50;

    claims.forEach((claim) => {
      const claimNodeId = `claim-${claim.id}`;
      const claimY = currentY;

      // 1. Claim Node (Center-left)
      generatedNodes.push({
        id: claimNodeId,
        type: 'default',
        position: { x: 50, y: claimY },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div className="text-left p-2 max-w-xs">
              <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold mb-0.5">
                {claim.category}
              </div>
              <div className="text-xs font-medium text-slate-100 line-clamp-2">
                {claim.originalStatement}
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                <span>Status: {claim.status}</span>
                <span>{claim.relatedTechnologies.slice(0, 2).join(', ')}</span>
              </div>
            </div>
          ),
        },
        style: {
          background: '#0f172a',
          color: '#f8fafc',
          border: claim.status === 'Demonstrated understanding' ? '1px solid #10b981' : '1px solid #334155',
          borderRadius: '8px',
          width: 260,
        },
      });

      // 2. Evidence Nodes (Right column 1)
      claim.evidenceReferences.forEach((ev, evIdx) => {
        const evNodeId = `ev-${ev.id}`;
        const evY = claimY + evIdx * 80;

        generatedNodes.push({
          id: evNodeId,
          type: 'default',
          position: { x: 380, y: evY },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            label: (
              <div className="text-left p-2 max-w-xs">
                <div className="text-[10px] font-mono text-sky-400 font-semibold mb-0.5">
                  [Evidence] {ev.type}
                </div>
                <div className="text-xs font-medium text-slate-200">{ev.title}</div>
                <div className="text-[9px] text-slate-400 mt-1">
                  {ev.isVerified ? '✓ Verified Artifact' : '⚠ Self-Reported Text'}
                </div>
              </div>
            ),
          },
          style: {
            background: '#091e3a',
            color: '#f8fafc',
            border: '1px solid #1e3a8a',
            borderRadius: '8px',
            width: 240,
          },
        });

        generatedEdges.push({
          id: `edge-${claimNodeId}-${evNodeId}`,
          source: claimNodeId,
          target: evNodeId,
          animated: true,
          style: { stroke: '#38bdf8' },
        });
      });

      // 3. Question Nodes (Right column 2)
      claim.interviewQuestions.slice(0, 2).forEach((q, qIdx) => {
        const qNodeId = `q-${q.id}`;
        const qY = claimY + qIdx * 90;

        generatedNodes.push({
          id: qNodeId,
          type: 'default',
          position: { x: 700, y: qY },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            label: (
              <div className="text-left p-2 max-w-xs">
                <div className="text-[10px] font-mono text-amber-400 font-semibold mb-0.5">
                  [Probing Challenge] {q.difficulty}
                </div>
                <div className="text-xs text-slate-300 line-clamp-2">{q.questionText}</div>
              </div>
            ),
          },
          style: {
            background: '#1c1917',
            color: '#f8fafc',
            border: '1px solid #78350f',
            borderRadius: '8px',
            width: 260,
          },
        });

        generatedEdges.push({
          id: `edge-${claimNodeId}-${qNodeId}`,
          source: claimNodeId,
          target: qNodeId,
          style: { stroke: '#f59e0b', strokeDasharray: '4 4' },
        });
      });

      const maxItems = Math.max(claim.evidenceReferences.length, claim.interviewQuestions.length, 1);
      currentY += Math.max(maxItems * 100, 160);
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [claims]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Claim-to-Evidence Interactive Graph</h2>
          </div>
          <p className="text-sm text-slate-400">
            Traces resume claims against verifiable evidence, artifacts, and technical probing challenges.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Claim
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-500"></span> Evidence
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Probing Question
          </span>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="p-16 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
          <Network className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-200">No Claims to Graph</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Upload a resume or paste content in the Claims tab to generate your visual claim-to-evidence graph.
          </p>
        </div>
      ) : (
        <div className="h-[600px] w-full rounded-xl border border-slate-800 bg-slate-950 overflow-hidden relative shadow-2xl">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            attributionPosition="bottom-right"
          >
            <Background color="#1e293b" gap={16} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-100" />
            <MiniMap
              className="!bg-slate-900 !border-slate-800"
              nodeColor={(n) => (n.id.startsWith('claim') ? '#10b981' : n.id.startsWith('ev') ? '#0284c7' : '#d97706')}
            />
          </ReactFlow>
        </div>
      )}
    </div>
  );
};
