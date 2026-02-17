import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';

const Plot = createPlotlyComponent(Plotly);
import type { MonteCarloResult } from '../types';

interface PdfChartProps {
  result: MonteCarloResult;
}

export default function PdfChart({ result }: PdfChartProps) {
  const binCenters = result.histogram.bin_edges.slice(0, -1).map(
    (edge, i) => (edge + result.histogram.bin_edges[i + 1]) / 2
  );
  const binWidths = result.histogram.bin_edges.slice(0, -1).map(
    (edge, i) => result.histogram.bin_edges[i + 1] - edge
  );

  return (
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
        height: 420,
        showlegend: false,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  );
}
