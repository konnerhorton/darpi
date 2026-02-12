# DARPI — Prototype Spec

## 1. Overview

Build a functional single-user risk register application that a facilitator can use in a live workshop setting. The prototype must feel like a polished spreadsheet editor, not a toy. The benchmark UX is Airtable: fast inline editing, keyboard navigation, clean layout, minimal chrome.

### Prototype Goals
- Usable in a real workshop on a 13" laptop screen via Zoom screen share.
- Quantitative risk register: probability as percentage, cost as dollars (single value or triangular distribution).
- Cell-level comments with a value proposal and acceptance workflow for facilitating negotiation.
- Record mitigations with links to risks.
- Produce Monte Carlo PDF/CDF analysis with summary statistics.
- Save and browse named snapshots of register state.

### Explicitly Out of Scope
- Qualitative mode (1-5 bins), heat map, and bin configuration UI
- Custom columns (Airtable-style single-select) — prototype uses a free-text category field instead
- Detail card sidebar — prototype uses a comment modal instead
- Open proposals dashboard view
- Snapshot comparison / diffing
- Settings panel — register name is editable inline in the toolbar
- Multi-user real-time editing
- Authentication / SSO
- Multi-register hierarchy and program roll-ups
- LLM-powered guidance
- Snapshot timeline chart
- Import/export (JSON, CSV, Excel)
- Automatic mitigation recalculation (reduction math)
- Cloud deployment
- Tooltips
- Schedule risk analysis / P6 integration

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | **Python 3.12+ / FastAPI** | User's primary language. Async, fast, good ecosystem. |
| Database | **SQLite** via **SQLAlchemy 2.0** (async) | Single-file, portable, no server. |
| Migrations | **Alembic** | Schema evolution from day one. |
| Monte Carlo | **NumPy** | Vectorized simulation. 200 risks × 10k iterations in milliseconds. |
| Frontend | **React 18** + **TypeScript** | Component ecosystem, type safety. |
| Table | **AG Grid Community** | Best-in-class spreadsheet component. Inline editing, keyboard nav, column types, sorting, filtering. Free tier is sufficient. |
| Charts | **Plotly.js** (via react-plotly.js) | Interactive PDF/CDF charts. Consistent with Python Plotly if needed server-side. |
| HTTP Client | **Axios** or **fetch** | Standard API calls. |
| Styling | **Tailwind CSS** | Utility-first, fast to prototype, minimal custom CSS. |
| Build | **Vite** | Fast dev server and builds for React. |
| Package Mgmt | **uv** (Python), **npm** (JS) | uv for fast Python dependency resolution. |

### Project Structure
```
risk/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── database.py          # Engine, session factory
│   │   ├── routers/
│   │   │   ├── registers.py     # Register CRUD
│   │   │   ├── risks.py         # Risk CRUD
│   │   │   ├── mitigations.py   # Mitigation CRUD + risk links
│   │   │   ├── comments.py      # Cell comments + proposals
│   │   │   ├── snapshots.py     # Snapshot save/load/list
│   │   │   └── analysis.py      # Monte Carlo data
│   │   └── services/
│   │       ├── monte_carlo.py   # Simulation engine
│   │       └── snapshot.py      # Snapshot serialization
│   ├── alembic/
│   ├── alembic.ini
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/                 # API client functions
│   │   ├── components/
│   │   │   ├── RegisterTable.tsx    # AG Grid risk table
│   │   │   ├── MitigationTable.tsx  # AG Grid mitigation table
│   │   │   ├── CommentModal.tsx     # Comment/proposal modal for a cell
│   │   │   ├── AnalysisView.tsx     # Charts container
│   │   │   ├── MonteCarloChart.tsx  # PDF/CDF plots
│   │   │   ├── SnapshotBar.tsx      # Snapshot controls
│   │   │   └── Toolbar.tsx          # Top bar with tabs
│   │   ├── hooks/                   # React hooks for data fetching
│   │   ├── types/                   # TypeScript interfaces
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── PRODUCT_VISION.md
├── PROTOTYPE_SPEC.md
└── README.md
```

---

## 3. Data Model

### 3.1 registers

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| name | TEXT | Required |
| description | TEXT | Optional |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-updated |

All registers are quantitative in the prototype. Mode column is omitted — it will be added when qualitative mode is implemented.

### 3.2 risks

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| register_id | TEXT (FK) | → registers.id |
| display_id | TEXT | Auto-generated: `R-001`, `R-002`, ... Unique within register. |
| title | TEXT | Short risk title. Required. |
| description | TEXT | Detailed risk description. Optional. |
| category | TEXT | Free-text field for tagging/grouping (e.g., "Permitting", "Geotechnical"). Optional. Replaces custom columns in the prototype. |
| probability | REAL | 0-100 (percentage). |
| cost_single | REAL | Single cost estimate in dollars. Used if cost_min/max are NULL. |
| cost_min | REAL | Nullable. Triangular distribution minimum. |
| cost_expected | REAL | Nullable. Triangular distribution mode. |
| cost_max | REAL | Nullable. Triangular distribution maximum. |
| notes | TEXT | Free-form notes. |
| sort_order | INTEGER | Manual ordering in the table. |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Constraints**: Unique(register_id, display_id). If cost_min is set, cost_expected and cost_max must also be set.

### 3.3 mitigations

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| register_id | TEXT (FK) | → registers.id |
| display_id | TEXT | Auto-generated: `M-001`, `M-002`, ... |
| title | TEXT | Required. |
| description | TEXT | Optional. |
| notes | TEXT | |
| sort_order | INTEGER | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### 3.4 risk_mitigations (join table)

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| risk_id | TEXT (FK) | → risks.id |
| mitigation_id | TEXT (FK) | → mitigations.id |
| notes | TEXT | Context for this specific link. |

**Constraints**: Unique(risk_id, mitigation_id).

Note: probability_reduction and cost_reduction fields are omitted from the prototype. The join captures the relationship only — reduction math is a future feature.

### 3.5 cell_comments

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| risk_id | TEXT (FK) | → risks.id |
| column_key | TEXT | Identifies the cell: `"title"`, `"probability"`, `"cost"`, `"description"`, `"category"`, or `"notes"`. |
| author_name | TEXT | Free text author name (no auth in prototype). |
| content | TEXT | Comment text / rationale. |
| proposed_value | TEXT | Nullable. If set, this comment is a value proposal. Stored as text, interpreted based on column type (e.g., "45" for probability, "2500000" for cost). |
| status | TEXT | `"active"`, `"accepted"`, `"rejected"`. Default `"active"`. |
| created_at | TIMESTAMP | |

**Constraints**: None beyond FK. Multiple comments per cell are expected.

A comment with `proposed_value = NULL` is a discussion comment. A comment with a `proposed_value` is a proposal. When a proposal is accepted, the system writes the proposed value to the risk and sets `status = "accepted"`. Other active proposals on the same cell are set to `"rejected"`.

For cost cells using triangular distribution, `proposed_value` stores all three values as a JSON object (e.g., `{"min": 1000000, "expected": 2500000, "max": 5000000}`). The accept handler checks whether the proposed_value is a JSON object or a scalar and writes the appropriate fields.

**Direct editing vs. proposals**: The facilitator can always edit cell values directly in the table — this is the primary workflow during a live workshop. Proposals are an overlay for async review and negotiation. There is no lock: direct edits take effect immediately. If a proposal is later accepted for a cell, it overwrites the current value. The facilitator remains in control at all times.

### 3.6 snapshots

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (UUID) | Primary key |
| register_id | TEXT (FK) | → registers.id |
| name | TEXT | User-provided label (e.g., "Workshop Day 1") |
| description | TEXT | Optional notes about what changed. |
| aggregate_expected_cost | REAL | Cached: sum of expected costs at snapshot time. |
| aggregate_mean | REAL | Cached: Monte Carlo mean. |
| aggregate_std_dev | REAL | Cached: Monte Carlo standard deviation. |
| aggregate_p10 | REAL | Cached: P10 from Monte Carlo at snapshot time. |
| aggregate_p20 | REAL | Cached: P20. |
| aggregate_p30 | REAL | Cached: P30. |
| aggregate_p40 | REAL | Cached: P40. |
| aggregate_p50 | REAL | Cached: P50. |
| aggregate_p60 | REAL | Cached: P60. |
| aggregate_p70 | REAL | Cached: P70. |
| aggregate_p80 | REAL | Cached: P80. |
| aggregate_p90 | REAL | Cached: P90. |
| aggregate_p95 | REAL | Cached: P95. |
| risk_count | INTEGER | Number of risks at snapshot time. |
| data | TEXT (JSON) | Full serialized state: all risks, mitigations, links, comments. |
| created_at | TIMESTAMP | |

Storing the full percentile range (plus mean/std_dev) makes each snapshot self-contained for future timeline charts without needing to re-run Monte Carlo on historical data.

---

## 4. API Design

Base URL: `http://localhost:8000/api/v1`

### 4.1 Registers

| Method | Path | Description |
|--------|------|-------------|
| POST | `/registers` | Create a new register (name) |
| GET | `/registers` | List all registers |
| GET | `/registers/{id}` | Get register detail |
| PATCH | `/registers/{id}` | Update register metadata (name, description) |
| DELETE | `/registers/{id}` | Delete register and all associated data |

### 4.2 Risks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/registers/{id}/risks` | List all risks for a register |
| POST | `/registers/{id}/risks` | Create a risk (auto-assigns display_id) |
| PATCH | `/risks/{id}` | Update a risk (any field including category) |
| DELETE | `/risks/{id}` | Delete a risk |
| PATCH | `/registers/{id}/risks/reorder` | Update sort_order for multiple risks |

### 4.3 Mitigations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/registers/{id}/mitigations` | List all mitigations (includes linked risk IDs) |
| POST | `/registers/{id}/mitigations` | Create a mitigation |
| PATCH | `/mitigations/{id}` | Update a mitigation |
| DELETE | `/mitigations/{id}` | Delete a mitigation |
| POST | `/mitigations/{id}/risks/{risk_id}` | Link mitigation to risk |
| DELETE | `/mitigations/{mid}/risks/{rid}` | Remove a link |

### 4.4 Snapshots

| Method | Path | Description |
|--------|------|-------------|
| GET | `/registers/{id}/snapshots` | List snapshots (metadata only, no data blob) |
| POST | `/registers/{id}/snapshots` | Create a snapshot (serializes current state, runs Monte Carlo for cached metrics) |
| GET | `/snapshots/{id}` | Get full snapshot including data |
| DELETE | `/snapshots/{id}` | Delete a snapshot |

### 4.5 Analysis

| Method | Path | Description |
|--------|------|-------------|
| GET | `/registers/{id}/analysis/monte-carlo?iterations=10000` | Run Monte Carlo, return distribution data |
| GET | `/registers/{id}/analysis/summary` | Summary stats: expected value, risk count, top risks |

### 4.6 Comments & Proposals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/risks/{id}/comments?column_key={key}` | Get comments for a specific cell. If column_key is omitted, returns all comments for the risk. |
| POST | `/risks/{id}/comments` | Create a comment or proposal (body includes column_key, content, author_name, optional proposed_value) |
| POST | `/comments/{id}/accept` | Accept a proposal: writes proposed_value to the risk, sets status to "accepted", rejects other active proposals on same cell |
| POST | `/comments/{id}/reject` | Reject a proposal: sets status to "rejected" |

---

## 5. Monte Carlo Engine

### Algorithm

```
Input:
  risks: list of {probability: float 0-100, cost_single, cost_min, cost_expected, cost_max}
  iterations: int (default 10,000)

For each iteration:
  total_cost = 0
  For each risk:
    occurs = random.uniform(0, 1) < (probability / 100)
    if occurs:
      if cost_min is not None:
        cost = random.triangular(cost_min, cost_expected, cost_max)
      else:
        cost = cost_single
      total_cost += cost
  record total_cost

Output:
  sorted array of total_costs (length = iterations)
  percentiles: P10, P25, P50, P75, P80, P90, P95
  mean, std_dev
  histogram bin edges and counts (for PDF)
  cumulative distribution points (for CDF)
```

### Implementation

Use NumPy for vectorized computation:
- Generate a `(num_risks, iterations)` matrix of Bernoulli samples.
- Generate a `(num_risks, iterations)` matrix of cost samples (triangular or constant).
- Element-wise multiply (occurrence × cost), then sum along the risk axis.
- Result: a 1D array of `iterations` total cost values.

**Performance target**: <100ms for 200 risks × 10,000 iterations. This enables near-instant chart updates when the user modifies a risk value.

---

## 6. Snapshot System

### Creating a Snapshot
When the user clicks "Save Snapshot":
1. Prompt for a name and optional description.
2. Serialize the full register state to JSON:
   - All risks (with current values)
   - All mitigations and risk links
   - All cell comments and proposals
3. Run a quick Monte Carlo to cache aggregate metrics (full percentile range, mean, std_dev).
4. Store in the snapshots table.

### Loading a Snapshot
Selecting a snapshot from the dropdown loads its serialized data into a read-only view. A banner indicates the user is viewing a snapshot with a link to return to the current state.

---

## 7. UI Specification

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Register Name ✎]           [Save Snapshot] [Snapshot ▾]│
├────────────┬────────────┬───────────────────────────────┤
│ Register   │ Mitigations│ Analysis                      │
├────────────┴────────────┴───────────────────────────────┤
│                                                         │
│                   Main Content Area                     │
│                   (table or charts)                     │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                    [+ Add Row]
└─────────────────────────────────────────────────────────┘
```

Register name is editable inline in the toolbar (click to edit, enter to save).

### 7.2 Register Tab (default view)

AG Grid table with the following columns:

| Column | Width | Editable | Notes |
|--------|-------|----------|-------|
| ID | 70px | No | Display ID (R-001) |
| Title | 250px | Yes | Text input |
| Description | 200px | Yes | Text input (truncated in cell) |
| Category | 120px | Yes | Free-text input for tagging/grouping. |
| Probability | 100px | Yes | Number input, 0-100 with % suffix. |
| Cost | 120px | Yes | Dollar input. Shows single value by default. If min/expected/max are set, shows expected value with a "▲" indicator. Clicking the indicator opens a popover with the three fields. |
| Notes | 150px | Yes | Text input (truncated in cell) |

**Comment indicators**: Cells with active comments show a small dot badge in the top-right corner. Cells with active (unresolved) proposals show a colored badge with the proposal count. Clicking the badge opens the comment modal for that cell.

**Keyboard behavior**:
- Tab: move to next editable cell (right, then next row)
- Enter: confirm edit and move down
- Escape: cancel edit
- Arrow keys: navigate cells (when not editing)
- Double-click or F2: start editing a cell

**Row operations**:
- "+ Add Row" button at the bottom of the table.
- Right-click context menu: Insert row above/below, Delete row.

### 7.3 Mitigations Tab

AG Grid table:

| Column | Width | Editable | Notes |
|--------|-------|----------|-------|
| ID | 70px | No | M-001 |
| Title | 250px | Yes | Text input |
| Description | 250px | Yes | Text input |
| Linked Risks | 150px | Yes | Multi-select chips showing risk display IDs. Click to manage links. |
| Notes | 150px | Yes | Text input |

**Linking workflow**:
1. Click the "Linked Risks" cell → dropdown of all risks (searchable by ID and title).
2. Select risks to link. Each selected risk shows as a chip.
3. Clicking a risk chip navigates to the risk in the Register tab.

Note: Reduction values (probability_reduction, cost_reduction) are not captured in the prototype. The link records the relationship only.

### 7.4 Analysis Tab

Two side-by-side charts:

Left: **PDF (Probability Density Function)**
- Histogram of Monte Carlo total cost results.
- X axis: Total cost ($). Y axis: Frequency/density.
- Vertical lines at P50, P80, P90.
- Summary stats displayed below: Mean, P50, P80, P90, Std Dev.

Right: **CDF (Cumulative Distribution Function)**
- S-curve of cumulative probability.
- X axis: Total cost ($). Y axis: Cumulative probability (0-100%).
- Interactive: hover to read off "there is an X% chance the total cost will be less than $Y."

Below charts: "Run Monte Carlo" button with iteration count input (default 10,000). Auto-runs on tab open with cached results.

### 7.5 Snapshot Controls

In the top bar:
- **"Save Snapshot"** button → modal asking for name and optional description.
- **Snapshot dropdown**: shows list of saved snapshots by name and date. Selecting one loads a read-only view with a banner: "Viewing snapshot: [name] — [date]. [Return to current]".

### 7.6 Comment Modal

Clicking a cell's comment badge (or right-clicking a cell and selecting "Comments") opens a modal dialog for that cell's comment thread. The modal provides:

- **Header**: Shows the risk display ID, field name, and current value (e.g., "R-003 — Probability: 45%").
- The thread displays all comments for the cell in chronological order.
- Each comment shows: author name, timestamp, content text.
- **Proposal comments** are visually distinct: they display the proposed value prominently (e.g., "Proposes: $4,500,000" or for triangular distributions "Proposes: $1M / $2.5M / $5M") alongside the rationale text. Active proposals show "Accept" and "Reject" buttons for the facilitator.
- Accepted proposals are shown with a checkmark and the note "Value accepted — [field] updated to [value]."
- Rejected proposals are shown dimmed with strikethrough on the proposed value.
- **New comment input**: text field for content, author name field (remembered across the session), and a toggle/checkbox: "Propose a value" which reveals a value input field appropriate to the column type. For cost cells with triangular distribution, the proposal input shows all three fields (min/expected/max) so the discussion is about the distribution, not individual values.

---

## 8. User Flows

### 8.1 Create a New Register
1. User opens the app → sees a landing page with "Create New Register" and a list of existing registers.
2. Clicks "Create New Register" → modal: Name, optional Description.
3. Submits → navigated to the empty Register tab.

### 8.2 Add Risks in a Workshop
1. Facilitator is on the Register tab with the table visible.
2. Clicks "+ Add Row" or presses a keyboard shortcut → new row appears with auto-generated ID.
3. Types the risk title, tabs to description, tabs to category (types a tag like "Permitting"), tabs to probability, types a percentage, tabs to cost, types a dollar amount.
4. For triangular cost: clicks the cell's "▲" indicator to open a popover with min/expected/max fields.
5. Repeats for each risk identified in the workshop.

### 8.3 Comment and Propose Values
1. A stakeholder clicks on a cell's comment badge (or right-clicks and selects "Comments") to open the comment modal.
2. The comment thread for that cell is displayed.
3. To add a discussion comment: types content, enters their name, submits.
4. To propose a value: checks "Propose a value", enters the proposed value and a rationale, submits. The proposal appears in the thread and the cell badge updates.
5. Other stakeholders can add their own proposals or discussion comments to the same thread.
6. The facilitator reviews proposals and clicks "Accept" on the winning proposal. The cell value updates automatically, the accepted proposal is marked, and other proposals are rejected.
7. For cost cells with triangular distributions, proposals include all three values (min/expected/max). The discussion and acceptance is about the full distribution, not individual values.

### 8.4 Add Mitigations
1. Switches to Mitigations tab.
2. Adds a mitigation row with title and description.
3. Clicks the "Linked Risks" cell → searches for and selects risks to link.

### 8.5 Run Analysis
1. Switches to Analysis tab.
2. Monte Carlo auto-runs. PDF and CDF charts render. User can adjust iteration count and re-run.
3. Summary stats shown below charts.

### 8.6 Save a Snapshot
1. User clicks "Save Snapshot" in the top bar.
2. Enters a name (e.g., "Workshop Day 1 - Final") and optional description.
3. System serializes current state and caches aggregate metrics.
4. Snapshot appears in the dropdown.

---

## 9. Performance Requirements

| Operation | Target |
|-----------|--------|
| Table render (200 rows) | < 200ms |
| Cell edit round-trip (edit → save → confirm) | < 100ms perceived |
| Monte Carlo (200 risks, 10K iterations) | < 100ms server-side |
| Chart render (PDF/CDF) | < 300ms |
| Snapshot save | < 500ms |
| Page load (full register) | < 1s |

AG Grid handles 200 rows trivially. The Monte Carlo is pure NumPy and will be fast. The main latency concern is the API round-trip on cell edit — use optimistic updates on the frontend (update the UI immediately, save in background, revert on error).

---

## 10. Implementation Order

A suggested build sequence for incremental progress:

### Phase 1: Foundation
1. Backend: FastAPI app, database models, Alembic setup.
2. API: Register CRUD, Risk CRUD (including category field).
3. Frontend: React app scaffold, AG Grid with risk table, basic inline editing.
4. Wire up: table loads risks from API, edits save to API with optimistic updates.

### Phase 2: Core Table Features
5. Probability input (0-100%) and cost input (dollar amount).
6. Triangular distribution: min/expected/max popover on cost cell.
7. Inline-editable register name in toolbar.

### Phase 3: Comments & Proposals
8. Cell comments backend: data model, CRUD endpoints, accept/reject logic.
9. Comment indicators on AG Grid cells (custom cell renderer with badge).
10. Comment modal UI with thread display.
11. Proposal workflow: propose value, accept/reject, auto-update cell.

### Phase 4: Mitigations
12. Mitigation table with CRUD.
13. Risk-mitigation linking UI (multi-select chips, searchable dropdown).

### Phase 5: Analysis
14. Monte Carlo engine (NumPy).
15. PDF/CDF charts (Plotly).
16. Summary statistics.

### Phase 6: Snapshots
17. Snapshot save with Monte Carlo metrics caching.
18. Snapshot dropdown with read-only view.
19. Keyboard navigation polish.
