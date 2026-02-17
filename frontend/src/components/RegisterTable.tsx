import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeAlpine } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import type { Risk, CommentCount, Mitigation } from '../types';
import TriangularPopover from './TriangularPopover';
import CommentModal from './CommentModal';
import ExpandableTextEditor from './ExpandableTextEditor';

interface RegisterTableProps {
  risks: Risk[];
  commentCounts: CommentCount[];
  mitigations: Mitigation[];
  onCellChange: (riskId: string, field: string, value: unknown) => void;
  onTriangularChange: (riskId: string, min: number, expected: number, max: number) => void;
  onClearTriangular: (riskId: string, singleValue: number) => void;
  onAddRow: () => void;
  onDeleteRow: (riskId: string) => void;
  onRiskUpdated: (risk: Risk) => void;
  onRefreshCommentCounts: () => void;
  onLinkMitigation: (riskId: string, mitigationId: string) => void;
  onUnlinkMitigation: (riskId: string, mitigationId: string) => void;
  onNavigateToMitigation: () => void;
  readOnly?: boolean;
}

const formatCurrency = (value: number | null) => {
  if (value == null) return '';
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

interface PopoverState {
  riskId: string;
  costMin: number | null;
  costExpected: number | null;
  costMax: number | null;
  anchorRect: DOMRect;
}

interface ModalState {
  risk: Risk;
  columnKey: string;
}

interface LinkMitigationPopoverState {
  riskId: string;
  linkedMitigationIds: string[];
  anchorRect: DOMRect;
}

export default function RegisterTable({
  risks, commentCounts, mitigations, onCellChange, onTriangularChange, onClearTriangular,
  onAddRow, onDeleteRow, onRiskUpdated, onRefreshCommentCounts,
  onLinkMitigation, onUnlinkMitigation, onNavigateToMitigation, readOnly,
}: RegisterTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [linkMitPopover, setLinkMitPopover] = useState<LinkMitigationPopoverState | null>(null);
  const [mitSearchFilter, setMitSearchFilter] = useState('');
  const mitPopoverRef = useRef<HTMLDivElement>(null);

  // Close mitigation link popover on outside click
  useEffect(() => {
    if (!linkMitPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (mitPopoverRef.current && !mitPopoverRef.current.contains(e.target as Node)) {
        setLinkMitPopover(null);
        setMitSearchFilter('');
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLinkMitPopover(null);
        setMitSearchFilter('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [linkMitPopover]);

  const mitigationLookup = useMemo(() => {
    const map = new Map<string, Mitigation>();
    for (const m of mitigations) map.set(m.id, m);
    return map;
  }, [mitigations]);

  // Build a lookup for comment counts: "riskId:columnKey" -> { comments, proposals }
  const countMap = useMemo(() => {
    const map = new Map<string, { comments: number; proposals: number }>();
    for (const c of commentCounts) {
      map.set(`${c.risk_id}:${c.column_key}`, { comments: c.comment_count, proposals: c.proposal_count });
    }
    return map;
  }, [commentCounts]);

  // Badge component — always clickable, visible indicator when comments exist
  const CommentBadge = useCallback(({ riskId, columnKey }: { riskId: string; columnKey: string }) => {
    const counts = countMap.get(`${riskId}:${columnKey}`);
    const hasComments = counts && counts.comments > 0;
    const hasProposals = counts && counts.proposals > 0;

    if (!hasComments) {
      if (readOnly) return null;
      // No comments — show trigger that appears on cell hover via CSS
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const risk = risks.find(r => r.id === riskId);
            if (risk) setModal({ risk, columnKey });
          }}
          className="comment-trigger ml-1 text-gray-400 hover:text-blue-500 text-xs leading-none opacity-0 transition-opacity"
          title="Add comment"
        >
          +
        </button>
      );
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (readOnly) return;
          const risk = risks.find(r => r.id === riskId);
          if (risk) setModal({ risk, columnKey });
        }}
        className={`ml-1 text-xs leading-none rounded-full min-w-[16px] text-center ${
          hasProposals
            ? 'bg-blue-500 text-white font-bold'
            : 'bg-orange-400 text-white'
        }`}
        title={`${counts.comments} comment${counts.comments > 1 ? 's' : ''}${hasProposals ? `, ${counts.proposals} proposal${counts.proposals > 1 ? 's' : ''}` : ''}`}
      >
        {hasProposals ? counts.proposals : counts.comments}
      </button>
    );
  }, [countMap, risks, readOnly]);

  // Generic cell renderer with comment badge
  const makeCellRenderer = useCallback((columnKey: string, format?: (risk: Risk) => string) => {
    return (params: ICellRendererParams) => {
      const risk = params.data as Risk;
      if (!risk) return null;
      const value = format ? format(risk) : (params.valueFormatted ?? params.value ?? '');
      return (
        <span className="cell-text-wrapper flex items-center w-full">
          <span className="cell-text flex-1 truncate">{value}</span>
          <CommentBadge riskId={risk.id} columnKey={columnKey} />
        </span>
      );
    };
  }, [CommentBadge]);

  // Cost cell renderer with triangular indicator + comment badge
  const CostCellRenderer = useCallback((params: ICellRendererParams) => {
    const risk = params.data as Risk;
    if (!risk) return null;

    const isTriangular = risk.cost_min != null;
    const displayValue = isTriangular ? risk.cost_expected : risk.cost_single;

    const handleTriangularClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const cell = (e.target as HTMLElement).closest('.ag-cell');
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      setPopover({
        riskId: risk.id,
        costMin: risk.cost_min,
        costExpected: risk.cost_expected,
        costMax: risk.cost_max,
        anchorRect: rect,
      });
    };

    return (
      <span className="flex items-center justify-end w-full gap-1">
        <span>{formatCurrency(displayValue)}</span>
        <button
          onClick={handleTriangularClick}
          className={`text-xs leading-none px-0.5 rounded ${
            isTriangular ? 'text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
          title={isTriangular
            ? `Min: ${formatCurrency(risk.cost_min)} / Exp: ${formatCurrency(risk.cost_expected)} / Max: ${formatCurrency(risk.cost_max)}`
            : 'Set triangular distribution'
          }
        >
          ▲
        </button>
        <CommentBadge riskId={risk.id} columnKey="cost" />
      </span>
    );
  }, [CommentBadge]);

  const LinkedMitigationsCellRenderer = useCallback((params: ICellRendererParams) => {
    const risk = params.data as Risk;
    if (!risk) return null;

    const handleCellClick = (e: React.MouseEvent) => {
      if (readOnly) return;
      const cell = (e.target as HTMLElement).closest('.ag-cell');
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      setLinkMitPopover({
        riskId: risk.id,
        linkedMitigationIds: risk.linked_mitigation_ids,
        anchorRect: rect,
      });
      setMitSearchFilter('');
    };

    return (
      <span className="flex items-center gap-1 w-full cursor-pointer" onClick={handleCellClick}>
        {risk.linked_mitigation_ids.length === 0 ? (
          <span className="text-gray-400 text-sm">{readOnly ? '' : 'Click to link mitigations...'}</span>
        ) : (
          <span className="flex items-center gap-1 flex-wrap">
            {risk.linked_mitigation_ids.map(mitId => {
              const mit = mitigationLookup.get(mitId);
              if (!mit) return null;
              return (
                <span
                  key={mitId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToMitigation();
                  }}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                  title={mit.title}
                >
                  {mit.display_id}
                </span>
              );
            })}
          </span>
        )}
      </span>
    );
  }, [mitigationLookup, onNavigateToMitigation, readOnly]);

  const DeleteCellRenderer = useCallback((params: ICellRendererParams) => {
    const risk = params.data as Risk;
    if (!risk) return null;
    return (
      <button
        onClick={() => onDeleteRow(risk.id)}
        className="text-gray-300 hover:text-red-500 text-sm"
        title="Delete row"
      >
        &times;
      </button>
    );
  }, [onDeleteRow]);

  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [];
    if (!readOnly) {
      cols.push({
        headerName: '', width: 36, editable: false, sortable: false,
        cellRenderer: DeleteCellRenderer, suppressSizeToFit: true,
      });
    }
    cols.push(
      { field: 'display_id', headerName: 'ID', width: 80, editable: false, sortable: false, suppressSizeToFit: true },
      {
        field: 'title', headerName: 'Title', flex: 2, minWidth: 150, editable: !readOnly,
        cellRenderer: makeCellRenderer('title'),
        cellClass: 'expandable-cell', cellEditor: ExpandableTextEditor,
      },
      {
        field: 'description', headerName: 'Description', flex: 2, minWidth: 120, editable: !readOnly,
        cellRenderer: makeCellRenderer('description'),
        cellClass: 'expandable-cell', cellEditor: ExpandableTextEditor,
      },
      {
        field: 'category', headerName: 'Category', flex: 1, minWidth: 100, editable: !readOnly,
        cellRenderer: makeCellRenderer('category'),
        cellClass: 'expandable-cell', cellEditor: ExpandableTextEditor,
      },
      {
        field: 'probability', headerName: 'Probability', width: 120, editable: !readOnly,
        type: 'numericColumn',
        cellRenderer: makeCellRenderer('probability', (r) => r.probability != null ? `${r.probability}%` : ''),
        valueSetter: (params) => {
          const val = parseFloat(params.newValue);
          if (isNaN(val) || val < 0 || val > 100) return false;
          params.data.probability = val;
          return true;
        },
      },
      {
        headerName: 'Cost', width: 160, editable: !readOnly,
        type: 'numericColumn',
        cellRenderer: CostCellRenderer,
        valueGetter: (params) => {
          const d = params.data as Risk;
          if (d.cost_min != null) return d.cost_expected;
          return d.cost_single;
        },
        valueSetter: (params) => {
          const raw = String(params.newValue).replace(/[$,]/g, '');
          const val = parseFloat(raw);
          if (isNaN(val) || val < 0) return false;
          params.data.cost_single = val;
          params.data.cost_min = null;
          params.data.cost_expected = null;
          params.data.cost_max = null;
          return true;
        },
      },
      {
        headerName: 'Linked Mitigations', flex: 1, minWidth: 140, editable: false, sortable: false,
        cellRenderer: LinkedMitigationsCellRenderer,
      },
      {
        field: 'notes', headerName: 'Notes', flex: 1, minWidth: 100, editable: !readOnly,
        cellRenderer: makeCellRenderer('notes'),
        cellClass: 'expandable-cell', cellEditor: ExpandableTextEditor,
      },
    );
    return cols;
  }, [CostCellRenderer, makeCellRenderer, readOnly, DeleteCellRenderer, LinkedMitigationsCellRenderer]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    suppressMovable: true,
  }), []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const risk = event.data as Risk;
    const field = event.colDef.field;
    if (!field) {
      onCellChange(risk.id, 'cost_single', risk.cost_single);
      return;
    }
    onCellChange(risk.id, field, event.newValue);
  }, [onCellChange]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const handlePopoverSave = useCallback((min: number, expected: number, max: number) => {
    if (!popover) return;
    onTriangularChange(popover.riskId, min, expected, max);
    setPopover(null);
  }, [popover, onTriangularChange]);

  const handlePopoverClear = useCallback(() => {
    if (!popover) return;
    const risk = risks.find(r => r.id === popover.riskId);
    const singleValue = risk?.cost_expected ?? risk?.cost_single ?? 0;
    onClearTriangular(popover.riskId, singleValue);
    setPopover(null);
  }, [popover, risks, onClearTriangular]);

  const handleModalClose = useCallback(() => {
    setModal(null);
    onRefreshCommentCounts();
  }, [onRefreshCommentCounts]);

  const filteredMitigations = useMemo(() => {
    if (!mitSearchFilter) return mitigations;
    const q = mitSearchFilter.toLowerCase();
    return mitigations.filter(m =>
      m.display_id.toLowerCase().includes(q) || m.title.toLowerCase().includes(q)
    );
  }, [mitigations, mitSearchFilter]);

  const handleModalRiskUpdated = useCallback((updatedRisk: Risk) => {
    onRiskUpdated(updatedRisk);
  }, [onRiskUpdated]);

  return (
    <div className="h-full overflow-auto">
      <div>
        <AgGridReact
          ref={gridRef}
          theme={themeAlpine}
          rowData={risks}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout="autoHeight"
          getRowId={(params) => params.data.id}
          onCellValueChanged={onCellValueChanged}
          onGridReady={onGridReady}
          singleClickEdit={false}
          stopEditingWhenCellsLoseFocus={true}
        />
      </div>
      {!readOnly && (
        <div className="p-2 border-t border-gray-200 bg-white">
          <button
            onClick={onAddRow}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add Row
          </button>
        </div>
      )}

      {popover && !readOnly && (
        <TriangularPopover
          costMin={popover.costMin}
          costExpected={popover.costExpected}
          costMax={popover.costMax}
          anchorRect={popover.anchorRect}
          onSave={handlePopoverSave}
          onClear={handlePopoverClear}
          onClose={() => setPopover(null)}
        />
      )}

      {/* Link Mitigations Popover */}
      {linkMitPopover && !readOnly && (
        <div
          ref={mitPopoverRef}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 w-[280px] z-40"
          style={{
            top: Math.min(linkMitPopover.anchorRect.bottom + 4, window.innerHeight - 320),
            left: Math.min(linkMitPopover.anchorRect.left, window.innerWidth - 300),
          }}
        >
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={mitSearchFilter}
              onChange={e => setMitSearchFilter(e.target.value)}
              placeholder="Search mitigations..."
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto p-1">
            {filteredMitigations.length === 0 ? (
              <div className="text-gray-400 text-sm p-2">No mitigations found</div>
            ) : (
              filteredMitigations.map(mit => {
                const isLinked = linkMitPopover.linkedMitigationIds.includes(mit.id);
                return (
                  <label
                    key={mit.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={() => {
                        if (isLinked) {
                          onUnlinkMitigation(linkMitPopover.riskId, mit.id);
                          setLinkMitPopover(prev => prev ? {
                            ...prev,
                            linkedMitigationIds: prev.linkedMitigationIds.filter(id => id !== mit.id),
                          } : null);
                        } else {
                          onLinkMitigation(linkMitPopover.riskId, mit.id);
                          setLinkMitPopover(prev => prev ? {
                            ...prev,
                            linkedMitigationIds: [...prev.linkedMitigationIds, mit.id],
                          } : null);
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-gray-500 font-mono text-xs">{mit.display_id}</span>
                    <span className="truncate">{mit.title || '(untitled)'}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {modal && (
        <CommentModal
          risk={modal.risk}
          columnKey={modal.columnKey}
          onClose={handleModalClose}
          onRiskUpdated={handleModalRiskUpdated}
        />
      )}
    </div>
  );
}
