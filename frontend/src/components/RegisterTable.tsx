import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellValueChangedEvent, GridReadyEvent } from 'ag-grid-community';
import type { Risk } from '../types';

interface RegisterTableProps {
  risks: Risk[];
  onCellChange: (riskId: string, field: string, value: unknown) => void;
  onAddRow: () => void;
  onDeleteRow: (riskId: string) => void;
}

const currencyFormatter = (params: { value: number | null }) => {
  if (params.value == null) return '';
  return '$' + params.value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const percentFormatter = (params: { value: number | null }) => {
  if (params.value == null) return '';
  return params.value + '%';
};

export default function RegisterTable({ risks, onCellChange, onAddRow, onDeleteRow }: RegisterTableProps) {
  const gridRef = useRef<AgGridReact>(null);

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
      width: 130,
      editable: true,
      type: 'numericColumn',
      valueGetter: (params) => {
        const d = params.data as Risk;
        if (d.cost_min != null) return d.cost_expected;
        return d.cost_single;
      },
      valueFormatter: (params) => {
        const d = params.data as Risk;
        const formatted = currencyFormatter(params);
        if (d.cost_min != null) return formatted + ' ▲';
        return formatted;
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
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    suppressMovable: true,
  }), []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const risk = event.data as Risk;
    const field = event.colDef.field;
    if (!field) {
      // Cost column doesn't have a field — send all cost fields
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

  return (
    <div className="flex flex-col h-full">
      <div className="ag-theme-alpine flex-1">
        <AgGridReact
          ref={gridRef}
          rowData={risks}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
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
    </div>
  );
}
