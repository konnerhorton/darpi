import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';

const Plot = createPlotlyComponent(Plotly);
import type { MonteCarloResult } from '../types';

interface CostConfidenceChartProps {
  result: MonteCarloResult;
}

const percentileKeys = [
  'p5', 'p10', 'p15', 'p20', 'p25', 'p30', 'p35', 'p40', 'p45',
  'p50', 'p55', 'p60', 'p65', 'p70', 'p75', 'p80', 'p85', 'p90', 'p95',
] as const;

const labels = percentileKeys.map(k => k.toUpperCase());

function getBarColor(key: string): string {
  const n = parseInt(key.slice(1));
  if (n <= 50) return '#22c55e';
  if (n <= 80) return '#f59e0b';
  return '#ef4444';
}

export default function CostConfidenceChart({ result }: CostConfidenceChartProps) {
  const values = percentileKeys.map(k => result[k]);
  const colors = percentileKeys.map(getBarColor);

  return (
    <Plot
      data={[
        {
          type: 'bar',
          x: labels,
          y: values,
          marker: { color: colors },
          hovertemplate: '%{x}: %{y:$,.0f}<extra></extra>',
        },
      ]}
      layout={{
        title: { text: 'Cost Confidence', font: { size: 14 } },
        xaxis: { title: { text: 'Confidence Level' } },
        yaxis: { title: { text: 'Total Cost ($)' }, tickformat: '$,.0f' },
        margin: { t: 40, r: 20, b: 50, l: 80 },
        height: 420,
        showlegend: false,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  );
}
