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
