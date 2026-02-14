import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeAlpine } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import type { Mitigation, Risk, MitigationCommentCount } from '../types';
import CommentModal from './CommentModal';

interface MitigationTableProps {
  mitigations: Mitigation[];
  risks: Risk[];
  commentCounts: MitigationCommentCount[];
  onCellChange: (mitigationId: string, field: string, value: unknown) => void;
  onAddRow: () => void;
  onDeleteRow: (mitigationId: string) => void;
  onLinkRisk: (mitigationId: string, riskId: string) => void;
  onUnlinkRisk: (mitigationId: string, riskId: string) => void;
  onNavigateToRisk: () => void;
  onRefreshCommentCounts: () => void;
}

interface ModalState {
  mitigation: Mitigation;
  columnKey: string;
}

interface LinkPopoverState {
  mitigationId: string;
  linkedRiskIds: string[];
  anchorRect: DOMRect;
}

export default function MitigationTable({
  mitigations, risks, commentCounts, onCellChange,
  onAddRow, onDeleteRow, onLinkRisk, onUnlinkRisk, onNavigateToRisk,
  onRefreshCommentCounts,
}: MitigationTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [linkPopover, setLinkPopover] = useState<LinkPopoverState | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!linkPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setLinkPopover(null);
        setSearchFilter('');
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLinkPopover(null);
        setSearchFilter('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [linkPopover]);

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of commentCounts) {
      map.set(`${c.mitigation_id}:${c.column_key}`, c.comment_count);
    }
    return map;
  }, [commentCounts]);

  const riskLookup = useMemo(() => {
    const map = new Map<string, Risk>();
    for (const r of risks) map.set(r.id, r);
    return map;
  }, [risks]);

  const CommentBadge = useCallback(({ mitigationId, columnKey }: { mitigationId: string; columnKey: string }) => {
    const count = countMap.get(`${mitigationId}:${columnKey}`) ?? 0;

    if (count === 0) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const mit = mitigations.find(m => m.id === mitigationId);
            if (mit) setModal({ mitigation: mit, columnKey });
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
          const mit = mitigations.find(m => m.id === mitigationId);
          if (mit) setModal({ mitigation: mit, columnKey });
        }}
        className="ml-1 text-xs leading-none rounded-full min-w-[16px] text-center bg-orange-400 text-white"
        title={`${count} comment${count > 1 ? 's' : ''}`}
      >
        {count}
      </button>
    );
  }, [countMap, mitigations]);

  const makeCellRenderer = useCallback((columnKey: string) => {
    return (params: ICellRendererParams) => {
      const mit = params.data as Mitigation;
      if (!mit) return null;
      const value = params.valueFormatted ?? params.value ?? '';
      return (
        <span className="flex items-center w-full">
          <span className="flex-1 truncate">{value}</span>
          <CommentBadge mitigationId={mit.id} columnKey={columnKey} />
        </span>
      );
    };
  }, [CommentBadge]);

  const LinkedRisksCellRenderer = useCallback((params: ICellRendererParams) => {
    const mit = params.data as Mitigation;
    if (!mit) return null;

    const handleCellClick = (e: React.MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('.ag-cell');
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      setLinkPopover({
        mitigationId: mit.id,
        linkedRiskIds: mit.linked_risk_ids,
        anchorRect: rect,
      });
      setSearchFilter('');
    };

    return (
      <span className="flex items-center gap-1 w-full cursor-pointer" onClick={handleCellClick}>
        {mit.linked_risk_ids.length === 0 ? (
          <span className="text-gray-400 text-sm">Click to link risks...</span>
        ) : (
          <span className="flex items-center gap-1 flex-wrap">
            {mit.linked_risk_ids.map(riskId => {
              const risk = riskLookup.get(riskId);
              if (!risk) return null;
              return (
                <span
                  key={riskId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToRisk();
                  }}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                  title={risk.title}
                >
                  {risk.display_id}
                </span>
              );
            })}
          </span>
        )}
      </span>
    );
  }, [riskLookup, onNavigateToRisk]);

  const DeleteCellRenderer = useCallback((params: ICellRendererParams) => {
    const mit = params.data as Mitigation;
    if (!mit) return null;
    return (
      <button
        onClick={() => onDeleteRow(mit.id)}
        className="text-gray-300 hover:text-red-500 text-sm"
        title="Delete row"
      >
        &times;
      </button>
    );
  }, [onDeleteRow]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: '', width: 36, editable: false, sortable: false,
      cellRenderer: DeleteCellRenderer, suppressSizeToFit: true,
    },
    { field: 'display_id', headerName: 'ID', width: 80, editable: false, sortable: false, suppressSizeToFit: true },
    {
      field: 'title', headerName: 'Title', flex: 2, minWidth: 150, editable: true,
      cellRenderer: makeCellRenderer('title'),
    },
    {
      field: 'description', headerName: 'Description', flex: 2, minWidth: 120, editable: true,
      cellRenderer: makeCellRenderer('description'),
    },
    {
      headerName: 'Linked Risks', flex: 1, minWidth: 140, editable: false, sortable: false,
      cellRenderer: LinkedRisksCellRenderer,
    },
    {
      field: 'notes', headerName: 'Notes', flex: 1, minWidth: 100, editable: true,
      cellRenderer: makeCellRenderer('notes'),
    },
  ], [DeleteCellRenderer, makeCellRenderer, LinkedRisksCellRenderer]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    suppressMovable: true,
  }), []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const mit = event.data as Mitigation;
    const field = event.colDef.field;
    if (!field) return;
    onCellChange(mit.id, field, event.newValue);
  }, [onCellChange]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const handleModalClose = useCallback(() => {
    setModal(null);
    onRefreshCommentCounts();
  }, [onRefreshCommentCounts]);

  // Filtered risks for the link popover
  const filteredRisks = useMemo(() => {
    if (!searchFilter) return risks;
    const q = searchFilter.toLowerCase();
    return risks.filter(r =>
      r.display_id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
    );
  }, [risks, searchFilter]);

  return (
    <div className="h-full overflow-auto">
      <div>
        <AgGridReact
          ref={gridRef}
          theme={themeAlpine}
          rowData={mitigations}
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
      <div className="p-2 border-t border-gray-200 bg-white">
        <button
          onClick={onAddRow}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add Row
        </button>
      </div>

      {/* Link Risks Popover */}
      {linkPopover && (
        <div
          ref={popoverRef}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 w-[280px] z-40"
          style={{
            top: Math.min(linkPopover.anchorRect.bottom + 4, window.innerHeight - 320),
            left: Math.min(linkPopover.anchorRect.left, window.innerWidth - 300),
          }}
        >
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search risks..."
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto p-1">
            {filteredRisks.length === 0 ? (
              <div className="text-gray-400 text-sm p-2">No risks found</div>
            ) : (
              filteredRisks.map(risk => {
                const isLinked = linkPopover.linkedRiskIds.includes(risk.id);
                return (
                  <label
                    key={risk.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={() => {
                        if (isLinked) {
                          onUnlinkRisk(linkPopover.mitigationId, risk.id);
                          setLinkPopover(prev => prev ? {
                            ...prev,
                            linkedRiskIds: prev.linkedRiskIds.filter(id => id !== risk.id),
                          } : null);
                        } else {
                          onLinkRisk(linkPopover.mitigationId, risk.id);
                          setLinkPopover(prev => prev ? {
                            ...prev,
                            linkedRiskIds: [...prev.linkedRiskIds, risk.id],
                          } : null);
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-gray-500 font-mono text-xs">{risk.display_id}</span>
                    <span className="truncate">{risk.title || '(untitled)'}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {modal && (
        <CommentModal
          mitigation={modal.mitigation}
          columnKey={modal.columnKey}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
