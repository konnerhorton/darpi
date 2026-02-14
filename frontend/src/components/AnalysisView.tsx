import { useState, useEffect, useCallback } from 'react';
import Plot from 'react-plotly.js';
import * as api from '../api/client';
import type { MonteCarloResult } from '../types';

interface AnalysisViewProps {
  registerId: string;
}

const formatCurrency = (value: number) =>
  '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function AnalysisView({ registerId }: AnalysisViewProps) {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [iterations, setIterations] = useState(10_000);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Build PDF histogram data from bin_edges and counts
  const binCenters = result.histogram.bin_edges.slice(0, -1).map(
    (edge, i) => (edge + result.histogram.bin_edges[i + 1]) / 2
  );
  const binWidths = result.histogram.bin_edges.slice(0, -1).map(
    (edge, i) => result.histogram.bin_edges[i + 1] - edge
  );

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

      {/* Charts side by side */}
      <div className="flex gap-4 flex-wrap">
        {/* PDF Chart */}
        <div className="flex-1 min-w-[400px]">
          <Plot
            data={[
              {
                type: 'bar',
                x: binCenters,
                y: result.histogram.counts,
                width: binWidths,
                marker: { color: 'rgba(59, 130, 246, 0.6)', line: { color: 'rgba(59, 130, 246, 1)', width: 1 } },
                name: 'Frequency',
                hovertemplate: 'Cost: %{x:$,.0f}<br>Count: %{y}<extra></extra>',
              },
            ]}
            layout={{
              title: { text: result.zero_pct > 0 ? `PDF — Cost Distribution (excl. ${result.zero_pct.toFixed(1)}% at $0)` : 'PDF — Cost Distribution', font: { size: 14 } },
              xaxis: { title: { text: 'Total Cost ($)' }, tickformat: '$,.0f' },
              yaxis: { title: { text: 'Frequency' } },
              shapes: [
                { type: 'line', x0: result.p50, x1: result.p50, y0: 0, y1: 1, yref: 'paper', line: { color: '#22c55e', width: 2, dash: 'dash' } },
                { type: 'line', x0: result.p80, x1: result.p80, y0: 0, y1: 1, yref: 'paper', line: { color: '#f59e0b', width: 2, dash: 'dash' } },
                { type: 'line', x0: result.p90, x1: result.p90, y0: 0, y1: 1, yref: 'paper', line: { color: '#ef4444', width: 2, dash: 'dash' } },
              ],
              annotations: [
                { x: result.p50, y: 1, yref: 'paper', text: 'P50', showarrow: false, font: { color: '#22c55e', size: 11 }, yanchor: 'bottom' },
                { x: result.p80, y: 1, yref: 'paper', text: 'P80', showarrow: false, font: { color: '#f59e0b', size: 11 }, yanchor: 'bottom' },
                { x: result.p90, y: 1, yref: 'paper', text: 'P90', showarrow: false, font: { color: '#ef4444', size: 11 }, yanchor: 'bottom' },
              ],
              margin: { t: 40, r: 20, b: 50, l: 60 },
              height: 350,
              showlegend: false,
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%' }}
          />
        </div>

        {/* CDF Chart */}
        <div className="flex-1 min-w-[400px]">
          <Plot
            data={[
              {
                type: 'scatter',
                mode: 'lines',
                x: result.cdf.x,
                y: result.cdf.y,
                line: { color: 'rgba(59, 130, 246, 1)', width: 2 },
                fill: 'tozeroy',
                fillcolor: 'rgba(59, 130, 246, 0.1)',
                name: 'CDF',
                hovertemplate: '%{y:.1f}% chance total cost < %{x:$,.0f}<extra></extra>',
              },
            ]}
            layout={{
              title: { text: 'CDF — Cumulative Probability', font: { size: 14 } },
              xaxis: { title: { text: 'Total Cost ($)' }, tickformat: '$,.0f' },
              yaxis: { title: { text: 'Cumulative Probability (%)' }, range: [0, 100] },
              shapes: [
                { type: 'line', x0: result.min, x1: result.max, y0: 50, y1: 50, line: { color: '#22c55e', width: 1, dash: 'dot' } },
                { type: 'line', x0: result.min, x1: result.max, y0: 80, y1: 80, line: { color: '#f59e0b', width: 1, dash: 'dot' } },
                { type: 'line', x0: result.min, x1: result.max, y0: 90, y1: 90, line: { color: '#ef4444', width: 1, dash: 'dot' } },
              ],
              margin: { t: 40, r: 20, b: 50, l: 60 },
              height: 350,
              showlegend: false,
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%' }}
          />
        </div>
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
