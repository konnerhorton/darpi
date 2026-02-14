export interface Register {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: string;
  register_id: string;
  display_id: string;
  title: string;
  description: string | null;
  category: string | null;
  probability: number | null;
  cost_single: number | null;
  cost_min: number | null;
  cost_expected: number | null;
  cost_max: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CellComment {
  id: string;
  risk_id: string;
  column_key: string;
  author_name: string;
  content: string;
  proposed_value: string | null;
  status: 'active' | 'accepted' | 'rejected';
  created_at: string;
}

export interface CommentCount {
  risk_id: string;
  column_key: string;
  comment_count: number;
  proposal_count: number;
}

export interface MonteCarloResult {
  iterations: number;
  risk_count: number;
  mean: number;
  std_dev: number;
  min: number;
  max: number;
  zero_pct: number;
  p10: number;
  p20: number;
  p25: number;
  p30: number;
  p40: number;
  p50: number;
  p60: number;
  p70: number;
  p75: number;
  p80: number;
  p90: number;
  p95: number;
  histogram: { bin_edges: number[]; counts: number[] };
  cdf: { x: number[]; y: number[] };
}
