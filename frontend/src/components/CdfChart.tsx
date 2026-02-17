import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';

const Plot = createPlotlyComponent(Plotly);
import type { MonteCarloResult } from '../types';

interface CdfChartProps {
  result: MonteCarloResult;
}

export default function CdfChart({ result }: CdfChartProps) {
  return (
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
        height: 420,
        showlegend: false,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  );
}
