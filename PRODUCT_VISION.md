# DARPI — Product Vision

## Elevator Pitch

DARPI (Don't Accept Risk, Price It) is a collaborative risk register platform for large construction and infrastructure projects. It replaces the spreadsheet-based workflow that project teams currently use to identify, score, and mitigate risks — while preserving the familiar, Excel-like interface that practitioners expect.

## Target Users

- **Facilitator**: Runs the risk workshop. Controls the register, drives data entry, manages configuration. Power user.
- **Stakeholders**: Subject matter experts (engineers, project managers, estimators, attorneys) who contribute risk items, scores, and language during workshops or async review.
- **Analysts**: Post-workshop users who run Monte Carlo simulations, review risk profiles over time, generate reports, and aggregate registers across a program.

## Core Concepts

### Risk Register
A table of identified risks for a project or package. Each register operates in one of two modes:
- **Quantitative**: Probability as a percentage (0-100%), cost as dollar amounts (point estimate or triangular distribution: min/expected/max).
- **Qualitative**: Probability and cost as integers 1-5, with configurable bin definitions (labels, ranges, colors).

The two modes are **views of the same underlying data**, not separate formats. A register can be toggled between modes at any time using the bin configuration as the translation layer (e.g., qualitative probability 2 = "Unlikely" = 10-25% range). When a value in one mode is inconsistent with its mapping in the other mode, the system flags the inconsistency with a visual warning on the cell. Inconsistencies are **preserved during normal editing** to avoid interrupting workshop flow. However, before producing meaningful output (analysis runs, exports, snapshots), the system displays a summary of all outstanding inconsistencies with quick-fix actions (accept the qualitative value, accept the quantitative value, or enter a new value) and **requires the user to resolve them** before proceeding.

#### Risks & Opportunities
A risk register item represents an uncertain event that could affect the project — either negatively (a **risk**) or positively (an **opportunity**). Both use the same data structure and probability language; the distinction is in the sign of the cost impact. Risks have negative cost impact (expenses), opportunities have positive cost impact (savings, gains). The UI distinguishes them visually with color and iconography, and filtering/summary statistics support viewing risks only, opportunities only, or both combined. In Monte Carlo analysis, opportunities reduce the aggregate cost distribution. In heat maps, opportunities occupy a visually distinct region.

Each risk has a unique auto-generated ID, a title, description, probability, cost, optional notes, and values for any custom columns defined on the register.

### Mitigations
A separate table of mitigation actions, linked to risks via a many-to-many relationship. Each link records the expected reduction in probability and/or cost — these reductions are specific to the risk-mitigation pair, since the same mitigation may impact different risks differently. Mitigations can be toggled to see unmitigated vs. mitigated risk profiles.

### Custom Columns
Airtable-style single-select columns that the user can add to a register for grouping, filtering, and tagging (e.g., "Category: Permitting", "Phase: Design", "Owner: Contractor"). Options are created on the fly. Columns can optionally be locked to a predefined set of options.

### Snapshots & Versioning
Named snapshots capture the full state of a register at a point in time. Users can:
- Browse a timeline chart showing how aggregate risk metrics evolve across snapshots.
- Click into any snapshot to see the register as it was.
- Diff two snapshots to see what changed (risks added/removed/modified).
- Snapshots can be named for specifi decision points on the project.
- Teams can also diverge from a given snapshot in several ways to perform alternatives analyses 
<!-- this is where the LLM layer would help out additionally as well -->

### Programs & Hierarchy
A program contains multiple registers (one per construction package or work breakdown element). Users can:
- View aggregated risk profiles across all registers in a program.
- Drill down from program → package → individual register.
- Filter/aggregate by custom column values across registers (e.g., "show me all permitting risks across the entire program").
  
<!-- the configurations for qualitative and quantitative should be on a register basis, and that should be accounted for in these comparisons. At a program level a cost of "1" means a different thing that on a package level (since the total cost of the program is much greater than the cost of the package) -->

### Comments & Collaboration
Cell-level threaded comments that persist across versions. Stakeholders can review a register asynchronously, leave comments on specific risks or scores, and the facilitator can resolve or respond. Comment history is preserved across snapshots.
<!-- on a column basis, there should be different permissions for who can approve of a given cell value. This could even be 2 or 3 people representing 2 or 3 stakeholders are all required to approve -->

### Value Negotiation (post-prototype)
Risk workshops frequently involve disagreement over specific values — particularly quantitative costs and probabilities. Rather than resolving these debates through unstructured comments, DARPI provides a structured negotiation workflow at the cell level:

- **Proposals**: Any stakeholder can propose a specific value for a cell. A proposal is more than a comment — it carries a concrete value and is displayed inline on the cell (e.g., a small badge showing "3 proposals").
- **Counter-proposals**: Other stakeholders can respond to a proposal with their own value and a rationale, creating a structured back-and-forth tied to the cell rather than buried in a comment thread.
- **Divergence flagging**: When multiple proposals exist for a cell, the system flags the divergence visually and surfaces the range of proposed values (e.g., "Cost proposals: $2M, $5M, $8M"). For quantitative columns, the spread is highlighted to draw facilitator attention.
- **Resolution**: The facilitator (or designated approvers) can accept a proposal, which sets the cell value. Columns can be configured to require approval from N designated stakeholders before a value is considered final.
- **Audit trail**: All proposals, counter-proposals, and resolutions are preserved as structured history on the cell, providing a record of how the team arrived at each value.

The negotiation model treats proposals as first-class objects (not just comment text), enabling the system to aggregate, compare, and report on disagreements across the register. This is particularly valuable for post-workshop async review, where stakeholders who weren't in the room can weigh in with specific values rather than vague feedback.
<!-- this builds on top of the comments system but is distinct — comments are discussion, proposals are structured value assertions. The data model needs: proposals table (cell reference, proposed value, proposer, status, timestamp) and a resolution/approval model. -->

### Schedule Risk Analysis (post-prototype)
Risks don't just cost money — they cost time. DARPI integrates with project schedules to quantify how identified risks affect project duration.

- **Schedule import**: Users import a project schedule from Primavera P6 via .xer file. DARPI parses the activity network, relationships (FS/SS/FF/SF), lags, and calendars.
- **Risk-to-activity mapping**: Each risk can be linked to one or more schedule activities. For each link, the user defines a duration impact distribution in workdays (min/expected/max), representing how much that risk would delay the activity if it occurs.
- **Schedule Monte Carlo**: For each iteration, DARPI samples risk occurrences, applies duration impacts to affected activities, and runs a full Critical Path Method (CPM) forward/backward pass to compute the resulting project completion date. This produces a PDF/CDF of project duration, analogous to the cost Monte Carlo but accounting for network dependencies — a delay on a non-critical activity may have zero project impact, while the same delay on the critical path shifts the end date.
- **Schedule outputs**: Probabilistic completion dates (P50, P80, P90), tornado chart of schedule risk drivers, probabilistic float analysis, and ideally a Gantt chart overlay showing deterministic vs. probabilistic activity bars.
- **Combined view**: Cost and schedule risk results presented together, enabling the team to see the full risk profile — both contingency dollars and contingency time.

This is a major capability that essentially embeds a schedule risk engine into DARPI. Existing tools in this space (Primavera Risk Analysis, Safran Risk, @Risk for Project) are standalone products. Building this well requires a CPM engine, .xer parsing, and a significantly more complex Monte Carlo loop. It is its own build phase, likely comparable in effort to the entire core risk register product.

## Full Feature Set

### Workshop & Editing
- Excel-like inline table editing with keyboard navigation (tab, enter, arrow keys)
<!-- and mouse navigation -->
- Detail card sidebar: expand any risk into a card view for focused discussion
- Facilitator-controlled editing with read-only async review mode
<!-- the read-only should include the ability to comment, just not make edits to the data -->
- Tooltips guiding users on how to write good risk descriptions, appropriate scoring, etc.
- LLM-powered risk language refinement (using project documents as context)
<!-- - initially this will be user loaded files, but seeing the whole project library would be prefered -->

### Analysis & Visualization
- **Monte Carlo simulation** (quantitative mode): Generate PDF and CDF of aggregate risk cost. Real-time updates as risk values change. Configurable iteration count. Pre- and post-mitigation distributions.
- **Heat map** (qualitative mode): Bubble chart with probability on X, cost on Y, bubble size = frequency. Color coding by risk score.
- Summary statistics: expected value, P50, P80, P90 contingency values.
- Sensitivity analysis: tornado chart showing which risks contribute most to variance.
- Top risk overlay: show the top contributing risks as overlays on the main PDF/CDF chart with hover details, giving an at-a-glance view of which risks are driving the distribution.
- **Schedule risk analysis** (post-prototype): PDF/CDF of project duration, schedule risk drivers, probabilistic Gantt overlay. See Schedule Risk Analysis under Core Concepts.

### Data Management
- SQLite single-file storage (portable, versionable)
- JSON and CSV export/import
- Excel export for stakeholders who want a familiar format
- PDF report generation with charts and register snapshot

### Configuration
- Qualitative bin definitions (labels, ranges, colors) for both probability and cost
- Project value setting (drives default cost bin ranges via nonlinear scaling)
- Custom column definitions and option management
- Monte Carlo iteration count and distribution settings
- Register metadata (name, description, mode, project value)

<!-- these configurations will be very opinionated at the start, so the user can get started right away, but can flexibly make changes later as needed -->

### Access & Identity
- Microsoft SSO / OAuth integration
- Role-based access: facilitator (edit), stakeholder (comment/review), analyst (read + analysis)
- Audit trail of all changes with user attribution

## Architectural Principles

1. **SQLite-first**: The register file IS the database. Portable, no server dependency, easy to back up.
2. **API-driven**: All UI interactions go through a REST API. The frontend is decoupled from the backend. This enables future integrations and alternative clients.
3. **Snapshot-based versioning**: State is captured as complete snapshots, not event-sourced diffs. Simpler to reason about and query.
4. **Configuration over code**: Bin definitions, custom columns, display options — all stored as data, not hardcoded.
5. **Python ecosystem**: Backend in Python (FastAPI) for maintainability by the core team. Frontend in React for the spreadsheet UX.
6. **Design for one, architect for many**: The prototype serves a single register. The data model and API support the full hierarchy from day one.

## Future Capabilities

### Parametric Risk Intelligence
As DARPI accumulates completed project data across an organization — risk registers with actualized outcomes (which risks occurred, at what actual cost and schedule impact) and mitigation registers with effectiveness records — the historical dataset becomes the foundation for predictive risk modeling.

The concept: when starting a new project, a user provides a scope description and budget parameters. DARPI uses a parameterized ML model trained on historical project records to generate a suggested risk register — predicted risks, their likely probability ranges, and expected cost/duration impacts, calibrated to the new project's characteristics (project type, size, geography, delivery method, etc.).

This is a fundamentally different product surface from the workshop tool. It requires: a structured project record format that captures scope parameters alongside risk outcomes; a sufficient volume of completed projects to train on; an ML pipeline for learning relationships between project characteristics and risk profiles; and a generation interface that translates model output into a draft register the facilitator can refine.

The risk register and mitigation register are the data capture layer for this capability. Every completed project that closes out its register with actuals — which risks materialized, which mitigations worked, what the real costs were — contributes training data. This creates a flywheel: the tool generates data that makes the intelligence layer better, which makes the tool more valuable to adopt.

This capability is likely a separate product or a premium tier built on top of the DARPI platform. It is the long-term strategic differentiator — anyone can build a risk register, but predictive risk modeling requires the data, which requires adoption of the tool.
