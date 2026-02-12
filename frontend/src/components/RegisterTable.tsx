import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeAlpine } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import type { Risk } from '../types';
import TriangularPopover from './TriangularPopover';

interface RegisterTableProps {
  risks: Risk[];
  onCellChange: (riskId: string, field: string, value: unknown) => void;
  onTriangularChange: (riskId: string, min: number, expected: number, max: number) => void;
  onClearTriangular: (riskId: string, singleValue: number) => void;
  onAddRow: () => void;
  onDeleteRow: (riskId: string) => void;
}

const formatCurrency = (value: number | null) => {
  if (value == null) return '';
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const percentFormatter = (params: { value: number | null }) => {
  if (params.value == null) return '';
  return params.value + '%';
};

interface PopoverState {
  riskId: string;
  costMin: number | null;
  costExpected: number | null;
  costMax: number | null;
  anchorRect: DOMRect;
}

export default function RegisterTable({
  risks, onCellChange, onTriangularChange, onClearTriangular, onAddRow, onDeleteRow,
}: RegisterTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

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
            isTriangular
              ? 'text-blue-600 font-bold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={isTriangular
            ? `Min: ${formatCurrency(risk.cost_min)} / Exp: ${formatCurrency(risk.cost_expected)} / Max: ${formatCurrency(risk.cost_max)}`
            : 'Set triangular distribution'
          }
        >
          ▲
        </button>
      </span>
    );
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'display_id', headerName: 'ID', width: 80, editable: false, sortable: false },
    { field: 'title', headerName: 'Title', width: 250, editable: true },
    { field: 'description', headerName: 'Description', width: 200, editable: true },
    { field: 'category', headerName: 'Category', width: 120, editable: true },
    {
      field: 'probability',
      headerName: 'Probability',
      width: 110,
      editable: true,
      type: 'numericColumn',
      valueFormatter: percentFormatter,
      valueSetter: (params) => {
        const val = parseFloat(params.newValue);
        if (isNaN(val) || val < 0 || val > 100) return false;
        params.data.probability = val;
        return true;
      },
    },
    {
      headerName: 'Cost',
      width: 150,
      editable: true,
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
    { field: 'notes', headerName: 'Notes', width: 150, editable: true },
  ], [CostCellRenderer]);

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

  const getContextMenuItems = useCallback((params: { node?: { data?: Risk } | null }) => {
    if (!params.node?.data) return [];
    const riskId = params.node.data.id;
    return [
      {
        name: 'Delete Row',
        action: () => onDeleteRow(riskId),
      },
    ];
  }, [onDeleteRow]);

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
          getContextMenuItems={getContextMenuItems}
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
    </div>
  );
}
