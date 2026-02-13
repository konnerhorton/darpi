import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeAlpine } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import type { Risk, CommentCount } from '../types';
import TriangularPopover from './TriangularPopover';
import CommentModal from './CommentModal';

interface RegisterTableProps {
  risks: Risk[];
  commentCounts: CommentCount[];
  onCellChange: (riskId: string, field: string, value: unknown) => void;
  onTriangularChange: (riskId: string, min: number, expected: number, max: number) => void;
  onClearTriangular: (riskId: string, singleValue: number) => void;
  onAddRow: () => void;
  onDeleteRow: (riskId: string) => void;
  onRiskUpdated: (risk: Risk) => void;
  onRefreshCommentCounts: () => void;
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

export default function RegisterTable({
  risks, commentCounts, onCellChange, onTriangularChange, onClearTriangular,
  onAddRow, onDeleteRow, onRiskUpdated, onRefreshCommentCounts,
}: RegisterTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

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
  }, [countMap, risks]);

  // Generic cell renderer with comment badge
  const makeCellRenderer = useCallback((columnKey: string, format?: (risk: Risk) => string) => {
    return (params: ICellRendererParams) => {
      const risk = params.data as Risk;
      if (!risk) return null;
      const value = format ? format(risk) : (params.valueFormatted ?? params.value ?? '');
      return (
        <span className="flex items-center w-full">
          <span className="flex-1 truncate">{value}</span>
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
      field: 'category', headerName: 'Category', flex: 1, minWidth: 100, editable: true,
      cellRenderer: makeCellRenderer('category'),
    },
    {
      field: 'probability', headerName: 'Probability', width: 120, editable: true,
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
      headerName: 'Cost', width: 160, editable: true,
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
      field: 'notes', headerName: 'Notes', flex: 1, minWidth: 100, editable: true,
      cellRenderer: makeCellRenderer('notes'),
    },
  ], [CostCellRenderer, makeCellRenderer]);

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
      <div className="p-2 border-t border-gray-200 bg-white">
        <button
          onClick={onAddRow}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add Row
        </button>
      </div>

      {popover && (
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
