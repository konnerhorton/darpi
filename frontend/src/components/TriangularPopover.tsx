import { useState, useEffect, useRef } from 'react';

interface TriangularPopoverProps {
  costMin: number | null;
  costExpected: number | null;
  costMax: number | null;
  anchorRect: DOMRect;
  onSave: (min: number, expected: number, max: number) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function TriangularPopover({
  costMin, costExpected, costMax, anchorRect, onSave, onClear, onClose,
}: TriangularPopoverProps) {
  const [min, setMin] = useState(costMin?.toString() ?? '');
  const [expected, setExpected] = useState(costExpected?.toString() ?? '');
  const [max, setMax] = useState(costMax?.toString() ?? '');
  const [error, setError] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSave = () => {
    const minVal = parseFloat(min.replace(/[$,]/g, ''));
    const expVal = parseFloat(expected.replace(/[$,]/g, ''));
    const maxVal = parseFloat(max.replace(/[$,]/g, ''));

    if (isNaN(minVal) || isNaN(expVal) || isNaN(maxVal)) {
      setError('All three values are required');
      return;
    }
    if (minVal < 0 || expVal < 0 || maxVal < 0) {
      setError('Values must be positive');
      return;
    }
    if (minVal > expVal || expVal > maxVal) {
      setError('Must be: min ≤ expected ≤ max');
      return;
    }
    onSave(minVal, expVal, maxVal);
  };

  const top = anchorRect.bottom + 4;
  const left = Math.max(8, anchorRect.left - 40);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-64"
      style={{ top, left }}
    >
      <div className="text-xs font-semibold text-gray-500 mb-2">Triangular Distribution</div>
      <div className="space-y-2">
        <label className="block">
          <span className="text-xs text-gray-600">Minimum ($)</span>
          <input
            type="text"
            value={min}
            onChange={e => setMin(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Expected ($)</span>
          <input
            type="text"
            value={expected}
            onChange={e => setExpected(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Maximum ($)</span>
          <input
            type="text"
            value={max}
            onChange={e => setMax(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </label>
      </div>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      <div className="flex justify-between mt-3">
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Use single value
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
