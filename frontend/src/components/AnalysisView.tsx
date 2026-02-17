import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/client';
import type { MonteCarloResult } from '../types';
import CostConfidenceChart from './CostConfidenceChart';
import PdfChart from './PdfChart';
import CdfChart from './CdfChart';

interface AnalysisViewProps {
  registerId: string;
}

const formatCurrency = (value: number) =>
  '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });

type Tab = 'confidence' | 'pdf' | 'cdf';

const tabs: { key: Tab; label: string }[] = [
  { key: 'confidence', label: 'Cost Confidence' },
  { key: 'pdf', label: 'PDF' },
  { key: 'cdf', label: 'CDF' },
];

export default function AnalysisView({ registerId }: AnalysisViewProps) {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [iterations, setIterations] = useState(10_000);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('confidence');

  const runAnalysis = useCallback(async (iters: number) => {
    setRunning(true);
    setError(null);
    try {
      const data = await api.runMonteCarlo(registerId, iters);
      setResult(data);
    } catch (err) {
      console.error('Monte Carlo failed:', err);
      setError('Failed to run analysis. Make sure risks have probability and cost values.');
    } finally {
      setRunning(false);
    }
  }, [registerId]);

  // Auto-run on mount
  useEffect(() => {
    runAnalysis(iterations);
  }, [registerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !result) {
    return (
      <div className="p-6 text-center text-red-500">{error}</div>
    );
  }

  if (!result) {
    return (
      <div className="p-6 text-center text-gray-500">Running analysis...</div>
    );
  }

  if (result.risk_count === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        No risks with both probability and cost defined. Add risk data to run Monte Carlo analysis.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Iterations:</label>
        <input
          type="number"
          value={iterations}
          onChange={(e) => setIterations(Math.max(100, Math.min(100_000, parseInt(e.target.value) || 10_000)))}
          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
          min={100}
          max={100_000}
          step={1000}
        />
        <button
          onClick={() => runAnalysis(iterations)}
          disabled={running}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Monte Carlo'}
        </button>
        <span className="text-xs text-gray-400">
          {result.risk_count} risk{result.risk_count !== 1 ? 's' : ''} analyzed
          {' · '}{result.iterations.toLocaleString()} iterations
        </span>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-0 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Chart */}
      <div>
        {activeTab === 'confidence' && <CostConfidenceChart result={result} />}
        {activeTab === 'pdf' && <PdfChart result={result} />}
        {activeTab === 'cdf' && <CdfChart result={result} />}
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="Mean" value={formatCurrency(result.mean)} />
        <StatCard label="P50 (Median)" value={formatCurrency(result.p50)} color="text-green-600" />
        <StatCard label="P80" value={formatCurrency(result.p80)} color="text-amber-600" />
        <StatCard label="P90" value={formatCurrency(result.p90)} color="text-red-600" />
        <StatCard label="Std Dev" value={formatCurrency(result.std_dev)} />
        {result.zero_pct > 0 && (
          <StatCard label="$0 Outcomes" value={`${result.zero_pct.toFixed(1)}%`} color="text-gray-500" />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${color ?? 'text-gray-800'}`}>{value}</div>
    </div>
  );
}
