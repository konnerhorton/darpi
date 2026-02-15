# DARPI

Collaborative risk register platform for large construction/infrastructure projects. Replaces spreadsheet-based workflows with an Airtable-like interface for identifying, scoring, and mitigating project risks.

## Project Status

Early stage — planning phase. PRODUCT_VISION.md defines the full product. PROTOTYPE_SPEC.md defines the buildable prototype scope.

## Key Documents

- `PRODUCT_VISION.md` — Full product vision with long-term features (qualitative mode, schedule risk analysis, programs, value negotiation, parametric risk intelligence). HTML comments contain additional design notes.
- `PROTOTYPE_SPEC.md` — Detailed prototype specification: data model, API design, UI spec, implementation phases. Quantitative mode only, lean scope. This is what we're building first.
- `initial_prompt.md` — Original brainstorm that seeded the specs.

## Architecture

- **Backend**: Python >=3.12 / FastAPI, async. All UI interactions go through a REST API (`/api/v1`).
- **Database**: SQLite via SQLAlchemy 2.0 (async) + Alembic migrations. The register file IS the database — portable, single-file.
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS.
- **Table**: AG Grid Community — spreadsheet-like inline editing, keyboard nav. Custom cell renderers for comment/proposal badges.
- **Charts**: Plotly.js (react-plotly.js) for Monte Carlo PDF/CDF.
- **Monte Carlo**: NumPy vectorized simulation. Target <100ms for 200 risks x 10K iterations.
- **Package management**: uv (Python), npm (JS).

## Project Structure (target)

```
risk/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, lifespan
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── database.py       # Engine, session factory
│   │   ├── routers/          # registers, risks, mitigations, comments, snapshots, analysis
│   │   └── services/         # monte_carlo.py, snapshot.py
│   ├── alembic/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/       # RegisterTable, MitigationTable, CommentModal, AnalysisView, MonteCarloChart, SnapshotBar, Toolbar, ExpandableTextEditor
│   │   ├── api/              # API client functions
│   │   ├── hooks/            # React data-fetching hooks
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── PRODUCT_VISION.md
├── PROTOTYPE_SPEC.md
└── CLAUDE.md
```

## Core Domain Concepts

- **Register**: A table of risks. Prototype is quantitative only (percentages and dollars). Qualitative mode (1-5 scores with bin configs) is a future feature.
- **Risk**: A row in the register with probability (0-100%), cost (single dollar value or triangular min/expected/max), a free-text category field, and notes. Auto-assigned display ID (R-001, R-002...).
- **Mitigation**: An action linked to risks via many-to-many join. Prototype captures the relationship only — reduction math is post-prototype.
- **Cell Comments & Proposals**: Comments are attached to a specific cell (risk_id + column_key). A comment can optionally carry a proposed_value, making it a formal proposal. Facilitator can accept a proposal, which updates the cell value and rejects competing proposals. For triangular cost cells, proposals carry all three values as a JSON object.
- **Snapshots**: Named point-in-time captures of full register state (serialized as JSON), including comments and proposals. Cached Monte Carlo percentiles (P10-P95) for future timeline use.

## Design Principles

1. **SQLite-first** — the file is the database, portable, no server dependency.
2. **API-driven** — frontend fully decoupled from backend via REST.
3. **Snapshot-based versioning** — complete state captures, not event-sourced diffs.
4. **Design for one, architect for many** — prototype is single-register, data model supports hierarchy.
5. **Optimistic updates** — UI updates immediately on edit, saves in background, reverts on error.

## Prototype Scope

Building (6 tables, ~20 API endpoints, 7 frontend components):
- Register CRUD, risk CRUD (quantitative only) with free-text category field
- Triangular cost distributions (min/expected/max popover)
- Cell-level comments with value proposals and accept/reject workflow (comment modal)
- Mitigations with risk linking (join only, no reduction math)
- Monte Carlo PDF/CDF analysis with summary statistics
- Snapshots (save/load with cached percentile range)
- Inline-editable register name in toolbar

NOT building (yet): custom columns (Airtable-style single-select), detail card sidebar, open proposals dashboard, snapshot comparison/diffing, settings panel, qualitative mode, heat map, bin configuration, export, multi-user, auth/SSO, program hierarchy, LLM guidance, snapshot timeline, tooltips, schedule risk analysis, mitigation reduction math, cloud deployment.

## Development Guidelines

- UX benchmark is Airtable: fast inline editing, keyboard navigation, clean layout, minimal chrome.
- Must be usable on a 13" laptop screen via Zoom screen share.
- Cell edits must feel instant (<100ms perceived) — use optimistic updates.
- Monte Carlo must be vectorized NumPy, not loop-based.
- Quantitative cost supports both single-value and triangular (min/expected/max) entry.
- All IDs are UUIDs. Display IDs (R-001, M-001) are auto-generated and unique within a register.
- Cell comments use a unified model: a comment with proposed_value is a proposal, without is discussion.
- AG Grid cells with comments/proposals show badge indicators via custom cell renderers.
- Comments open in a modal dialog, not a sidebar. No detail card in the prototype.
- Register name is editable inline in the toolbar — no settings panel.
- Text columns (title, description, category, notes) use `ExpandableTextEditor` — cells expand as an overlay on focus/edit so long text is visible without resizing the row. Uses CSS `:has()` selectors to unclip AG Grid's overflow-hidden ancestors. The `expandable-cell` class on the column triggers this behavior.
