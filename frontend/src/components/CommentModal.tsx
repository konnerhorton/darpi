import { useState, useEffect, useRef } from 'react';
import type { CellComment, Risk, Mitigation } from '../types';
import * as api from '../api/client';

interface CommentModalProps {
  risk?: Risk;
  mitigation?: Mitigation;
  columnKey: string;
  onClose: () => void;
  onRiskUpdated?: (risk: Risk) => void;
}

const COLUMN_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  probability: 'Probability',
  cost: 'Cost',
  notes: 'Notes',
};

function getCurrentValue(risk: Risk, columnKey: string): string {
  switch (columnKey) {
    case 'probability':
      return risk.probability != null ? `${risk.probability}%` : '—';
    case 'cost':
      if (risk.cost_min != null) {
        return `$${risk.cost_min?.toLocaleString()} / $${risk.cost_expected?.toLocaleString()} / $${risk.cost_max?.toLocaleString()}`;
      }
      return risk.cost_single != null ? `$${risk.cost_single.toLocaleString()}` : '—';
    default:
      return (risk[columnKey as keyof Risk] as string) ?? '—';
  }
}

function getMitigationValue(mitigation: Mitigation, columnKey: string): string {
  return (mitigation[columnKey as keyof Mitigation] as string) ?? '—';
}

function formatProposedValue(value: string, columnKey: string): string {
  if (columnKey === 'probability') return `${value}%`;
  if (columnKey === 'cost') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed.min !== undefined) {
        return `$${Number(parsed.min).toLocaleString()} / $${Number(parsed.expected).toLocaleString()} / $${Number(parsed.max).toLocaleString()}`;
      }
    } catch { /* not JSON */ }
    return `$${Number(value).toLocaleString()}`;
  }
  return value;
}

export default function CommentModal({ risk, mitigation, columnKey, onClose, onRiskUpdated }: CommentModalProps) {
  const isMitigation = !!mitigation;
  const entityId = isMitigation ? mitigation!.id : risk!.id;
  const displayId = isMitigation ? mitigation!.display_id : risk!.display_id;
  const currentValue = isMitigation
    ? getMitigationValue(mitigation!, columnKey)
    : getCurrentValue(risk!, columnKey);

  const [comments, setComments] = useState<CellComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('darpi_author') ?? '');
  const [isProposal, setIsProposal] = useState(false);
  const [proposedValue, setProposedValue] = useState('');
  const [proposedMin, setProposedMin] = useState('');
  const [proposedExpected, setProposedExpected] = useState('');
  const [proposedMax, setProposedMax] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const isTriangularCost = !isMitigation && columnKey === 'cost' && risk!.cost_min != null;

  useEffect(() => {
    const loadComments = isMitigation
      ? api.listMitigationComments(entityId, columnKey)
      : api.listComments(entityId, columnKey);
    loadComments.then(c => {
      setComments(c);
      setLoading(false);
    });
  }, [entityId, columnKey, isMitigation]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [comments]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!content.trim() || !authorName.trim()) return;
    setSubmitting(true);
    localStorage.setItem('darpi_author', authorName);

    if (isMitigation) {
      try {
        const newComment = await api.createMitigationComment(entityId, {
          column_key: columnKey,
          author_name: authorName,
          content: content,
        });
        setComments(prev => [...prev, newComment]);
        setContent('');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Risk comment with optional proposal
    let pv: string | null = null;
    if (isProposal) {
      if (columnKey === 'cost' && (proposedMin || proposedExpected || proposedMax)) {
        if (proposedMin && proposedExpected && proposedMax) {
          pv = JSON.stringify({
            min: parseFloat(proposedMin.replace(/[$,]/g, '')),
            expected: parseFloat(proposedExpected.replace(/[$,]/g, '')),
            max: parseFloat(proposedMax.replace(/[$,]/g, '')),
          });
        } else if (proposedValue) {
          pv = proposedValue.replace(/[$,]/g, '');
        }
      } else if (proposedValue) {
        pv = columnKey === 'cost' ? proposedValue.replace(/[$,]/g, '') : proposedValue;
      }
    }

    try {
      const newComment = await api.createComment(entityId, {
        column_key: columnKey,
        author_name: authorName,
        content: content,
        proposed_value: pv,
      });
      setComments(prev => [...prev, newComment]);
      setContent('');
      setProposedValue('');
      setProposedMin('');
      setProposedExpected('');
      setProposedMax('');
      setIsProposal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (commentId: string) => {
    const updated = await api.acceptProposal(commentId);
    setComments(prev => prev.map(c => {
      if (c.id === updated.id) return updated;
      if (c.proposed_value && c.status === 'active' && c.id !== updated.id) {
        return { ...c, status: 'rejected' as const };
      }
      return c;
    }));
    if (risk && onRiskUpdated) {
      const freshRisks = await api.listRisks(risk.register_id);
      const freshRisk = freshRisks.find(r => r.id === risk.id);
      if (freshRisk) onRiskUpdated(freshRisk);
    }
  };

  const handleReject = async (commentId: string) => {
    const updated = await api.rejectProposal(commentId);
    setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-semibold text-sm">{displayId}</span>
              <span className="text-gray-500 text-sm"> — {COLUMN_LABELS[columnKey] ?? columnKey}: </span>
              <span className="text-sm font-medium">{currentValue}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
        </div>

        {/* Thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[120px]">
          {loading ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : comments.length === 0 ? (
            <div className="text-gray-400 text-sm">No comments yet</div>
          ) : (
            comments.map(c => (
              <div
                key={c.id}
                className={`text-sm rounded-md p-2 ${
                  c.proposed_value
                    ? c.status === 'accepted'
                      ? 'bg-green-50 border border-green-200'
                      : c.status === 'rejected'
                      ? 'bg-gray-50 border border-gray-200 opacity-60'
                      : 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">{c.author_name}</span>
                  <span className="text-xs text-gray-400">{formatTime(c.created_at)}</span>
                </div>
                {c.proposed_value && (
                  <div className={`mb-1 font-medium ${
                    c.status === 'rejected' ? 'line-through text-gray-400' : 'text-blue-700'
                  }`}>
                    {c.status === 'accepted' ? '\u2713 ' : ''}
                    Proposes: {formatProposedValue(c.proposed_value, columnKey)}
                    {c.status === 'accepted' && (
                      <span className="text-green-600 font-normal text-xs ml-1">— accepted</span>
                    )}
                  </div>
                )}
                <div className={c.status === 'rejected' && c.proposed_value ? 'text-gray-400' : 'text-gray-600'}>
                  {c.content}
                </div>
                {c.proposed_value && c.status === 'active' && !isMitigation && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAccept(c.id)}
                      className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(c.id)}
                      className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200 space-y-2">
          <div className="flex gap-2">
            <input
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
            />
            {!isMitigation && (
              <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isProposal}
                  onChange={e => setIsProposal(e.target.checked)}
                  className="rounded"
                />
                Propose a value
              </label>
            )}
          </div>
          {!isMitigation && isProposal && (
            <div className="space-y-1">
              {columnKey === 'cost' ? (
                <div className="flex gap-2">
                  <input
                    value={isTriangularCost ? proposedMin : proposedValue}
                    onChange={e => isTriangularCost ? setProposedMin(e.target.value) : setProposedValue(e.target.value)}
                    placeholder={isTriangularCost ? 'Min ($)' : 'Cost ($)'}
                    className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                  />
                  {isTriangularCost && (
                    <>
                      <input
                        value={proposedExpected}
                        onChange={e => setProposedExpected(e.target.value)}
                        placeholder="Expected ($)"
                        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                      />
                      <input
                        value={proposedMax}
                        onChange={e => setProposedMax(e.target.value)}
                        placeholder="Max ($)"
                        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                      />
                    </>
                  )}
                </div>
              ) : (
                <input
                  value={proposedValue}
                  onChange={e => setProposedValue(e.target.value)}
                  placeholder={columnKey === 'probability' ? 'Value (0-100)' : 'Proposed value'}
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                />
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={isProposal && !isMitigation ? 'Rationale...' : 'Add a comment...'}
              className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim() || !authorName.trim()}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isProposal && !isMitigation ? 'Propose' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
