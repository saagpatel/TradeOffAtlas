# Tradeoff Atlas — Implementation Roadmap

## Architecture

### System Overview
```
[React UI Layer]
    │
    ├── DecisionCanvasView ─────────────────┐
    ├── SensitivityAnalysisView             │
    ├── TemplateLibraryView                 ├──► [Zustand Store]
    └── DecisionHistoryView                 │        │
                                            │        ▼
                                            │   [src/lib/db.ts]  ◄── SQL abstraction layer
                                            │        │
                                            └────────▼
                                              [SQLite via @tauri-apps/plugin-sql]
                                              (tradeoff-atlas.db, ~/.local/share/tradeoff-atlas/)
```

### File Structure
```
tradeoff-atlas/
├── src/
│   ├── components/
│   │   ├── DecisionCanvasView.tsx      # Main decision builder: options + criteria + scoring matrix
│   │   ├── SensitivityAnalysisView.tsx # Sliders + radar chart + rank-change alert panel
│   │   ├── TemplateLibraryView.tsx     # Browse, apply, save, delete templates
│   │   ├── DecisionHistoryView.tsx     # Archive of completed decisions with outcomes
│   │   ├── ScoringMatrix.tsx           # Reusable grid: options × criteria with score inputs
│   │   ├── RadarChart.tsx              # Recharts radar chart wrapper for option profiles
│   │   ├── RankChangeAlert.tsx         # Badge/notification when weight shift causes rank swap
│   │   ├── CriteriaWeightSlider.tsx    # Individual weight slider with live feedback
│   │   ├── NewDecisionModal.tsx        # Create decision (name, description, apply template?)
│   │   ├── SaveTemplateModal.tsx       # Name + save current criteria set as template
│   │   ├── ArchiveDecisionModal.tsx    # Mark complete, record outcome and notes
│   │   ├── ConfirmDeleteModal.tsx      # Generic confirmation modal
│   │   └── Sidebar.tsx                 # Left nav: decision list + view switcher
│   ├── lib/
│   │   ├── db.ts                       # All SQL queries — init schema, CRUD for all entities
│   │   └── scoring.ts                  # Pure functions: weighted score, rank, sensitivity delta
│   ├── store/
│   │   ├── decisionStore.ts            # Active decision state, options, criteria, scores
│   │   └── sensitivityStore.ts         # Live weight overrides for sensitivity analysis (in-memory)
│   ├── types/
│   │   └── index.ts                    # All shared TypeScript interfaces
│   ├── App.tsx                         # Top-level router: sidebar + active view
│   └── main.tsx                        # Tauri app entry point
├── src-tauri/
│   ├── src/
│   │   └── main.rs                     # Tauri app setup — enable SQL plugin
│   ├── tauri.conf.json                 # Window config: 1200×800 min size, app name/identifier
│   └── Cargo.toml                      # tauri, tauri-plugin-sql with sqlite feature
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql      # Core tables
│       └── 002_add_history_notes.sql   # Example future migration slot
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── CLAUDE.md
└── IMPLEMENTATION-ROADMAP.md
```

---

### Data Model

```sql
-- Core decision entity
CREATE TABLE decisions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'active', -- 'active' | 'archived'
    outcome     TEXT    DEFAULT '',               -- filled when archived
    outcome_notes TEXT  DEFAULT '',
    template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME DEFAULT NULL
);
CREATE INDEX idx_decisions_status ON decisions(status);

-- Options being compared (e.g., "Option A", "Stay at company", "Vendor X")
CREATE TABLE options (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,        -- display order
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_options_decision ON options(decision_id);

-- Criteria for a decision (e.g., "Cost", "Time to implement", "Risk")
CREATE TABLE criteria (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    weight      REAL    NOT NULL DEFAULT 1.0,      -- 0.0–10.0, user-defined
    description TEXT    DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_criteria_decision ON criteria(decision_id);

-- Individual scores: one row per (option × criterion)
-- Score range: 0–10 (integer, user-entered)
CREATE TABLE scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    option_id   INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    criterion_id INTEGER NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
    score       INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0 AND score <= 10),
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(option_id, criterion_id)
);
CREATE INDEX idx_scores_decision ON scores(decision_id);
CREATE INDEX idx_scores_option ON scores(option_id);

-- Reusable decision templates (criteria sets)
CREATE TABLE templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    category    TEXT    DEFAULT '',                -- e.g. "career", "project", "vendor"
    use_count   INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criteria belonging to a template
CREATE TABLE template_criteria (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    weight      REAL    NOT NULL DEFAULT 1.0,
    description TEXT    DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_template_criteria_template ON template_criteria(template_id);
```

---

### TypeScript Interfaces

```typescript
// src/types/index.ts

export interface Decision {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'archived';
  outcome: string;
  outcomeNotes: string;
  templateId: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface Option {
  id: number;
  decisionId: number;
  name: string;
  description: string;
  position: number;
  createdAt: string;
}

export interface Criterion {
  id: number;
  decisionId: number;
  name: string;
  weight: number;          // 0.0–10.0
  description: string;
  position: number;
  createdAt: string;
}

export interface Score {
  id: number;
  decisionId: number;
  optionId: number;
  criterionId: number;
  score: number;           // 0–10 integer
  updatedAt: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  criteria?: TemplateCriterion[];   // populated on fetch
}

export interface TemplateCriterion {
  id: number;
  templateId: number;
  name: string;
  weight: number;
  description: string;
  position: number;
}

// Derived/computed types (not stored)
export interface OptionScore {
  optionId: number;
  optionName: string;
  weightedTotal: number;   // sum of (score × weight) for all criteria
  normalizedScore: number; // weightedTotal / maxPossibleScore × 100
  rank: number;            // 1 = best
  scores: Record<number, number>; // criterionId → raw score
}

export interface SensitivityState {
  weightOverrides: Record<number, number>; // criterionId → overridden weight (0.0–10.0)
  rankChanges: RankChange[];               // criteria whose change caused a rank swap
}

export interface RankChange {
  optionId: number;
  optionName: string;
  previousRank: number;
  newRank: number;
  triggeredByCriterionId: number;
}
```

---

### Scoring Engine (Pure Functions)

```typescript
// src/lib/scoring.ts — zero side effects, fully testable

// Compute weighted score for a single option given criteria weights
export function computeWeightedScore(
  scores: Record<number, number>,  // criterionId → raw score
  criteria: Criterion[],
  weightOverrides?: Record<number, number>
): number {
  return criteria.reduce((total, c) => {
    const weight = weightOverrides?.[c.id] ?? c.weight;
    const score = scores[c.id] ?? 0;
    return total + score * weight;
  }, 0);
}

// Compute max possible score (all 10s at given weights)
export function maxPossibleScore(criteria: Criterion[], weightOverrides?: Record<number, number>): number {
  return criteria.reduce((total, c) => {
    const weight = weightOverrides?.[c.id] ?? c.weight;
    return total + 10 * weight;
  }, 0);
}

// Rank all options, detect rank changes vs. baseline weights
export function rankOptions(
  options: Option[],
  scoreMap: Record<number, Record<number, number>>, // optionId → criterionId → score
  criteria: Criterion[],
  weightOverrides?: Record<number, number>
): OptionScore[] {
  const maxScore = maxPossibleScore(criteria, weightOverrides);
  const computed = options.map(opt => {
    const scores = scoreMap[opt.id] ?? {};
    const weightedTotal = computeWeightedScore(scores, criteria, weightOverrides);
    return {
      optionId: opt.id,
      optionName: opt.name,
      weightedTotal,
      normalizedScore: maxScore > 0 ? (weightedTotal / maxScore) * 100 : 0,
      rank: 0,  // filled below
      scores,
    };
  });
  computed.sort((a, b) => b.weightedTotal - a.weightedTotal);
  computed.forEach((o, i) => { o.rank = i + 1; });
  return computed;
}

// Compare ranks before/after weight override to detect swaps
export function detectRankChanges(
  baseline: OptionScore[],
  current: OptionScore[]
): RankChange[] {
  return current
    .filter(curr => {
      const base = baseline.find(b => b.optionId === curr.optionId);
      return base && base.rank !== curr.rank;
    })
    .map(curr => {
      const base = baseline.find(b => b.optionId === curr.optionId)!;
      return {
        optionId: curr.optionId,
        optionName: curr.optionName,
        previousRank: base.rank,
        newRank: curr.rank,
        triggeredByCriterionId: -1,  // set by caller
      };
    });
}
```

---

### Dependencies

```bash
# 1. Scaffold Tauri 2.0 + React + TypeScript
npm create tauri-app@latest tradeoff-atlas -- --template react-ts

cd tradeoff-atlas

# 2. Frontend dependencies
npm install recharts@2.12.0 zustand@4.5.2 @tauri-apps/plugin-sql

# 3. Dev dependencies
npm install -D tailwindcss@3.4.4 postcss autoprefixer
npx tailwindcss init -p

# 4. Tauri Rust plugin for SQLite (add to src-tauri/Cargo.toml)
# tauri-plugin-sql = { version = "2.0", features = ["sqlite"] }

# Verify install
npm run tauri dev
# Expected: Tauri window opens with default Vite/React starter
```

---

## Scope Boundaries

**In scope (v1):**
- Decision canvas: name, description, create/edit/delete options and criteria
- Scoring matrix: rate each option per criterion (0–10 integer), auto-calculate weighted totals
- Sensitivity analysis: per-criterion weight sliders (0–10), live recalculation, radar chart, rank-change alerts
- Template library: save any decision's criteria set as a template, apply template to new decision, delete templates
- Decision history: archive active decisions with outcome + free-text notes, view archived decisions

**Out of scope:**
- Cloud sync, iCloud, any network calls
- Multi-user / collaboration
- Template sharing (export/import as file)
- Undo/redo for score edits
- Decision comparison (comparing two archived decisions)
- Mobile or Windows builds (macOS-first; cross-platform later if desired)
- AI-powered suggestions (out of scope for v1)

**Deferred (v2+):**
- Export decision to PDF/CSV (Phase 3 stretch goal)
- Keyboard shortcuts and command palette
- Search/filter within decision history
- Tag system for decisions and templates

---

## Security & Credentials
- No credentials or API keys. App is fully offline.
- SQLite DB stored at macOS default: `~/Library/Application Support/com.tradeoffatlas.app/tradeoff-atlas.db`
- No data leaves the machine under any circumstances — no analytics, no crash reporting in v1
- No encryption needed for v1 (no sensitive PII; decisions are personal notes)

---

## Phase 0: Foundation (Week 1)

**Objective:** Working Tauri app with SQLite schema initialized, DB abstraction layer built, and scoring engine with passing unit tests. No visible UI beyond the default window.

### Tasks

1. **Scaffold Tauri 2.0 + React + TypeScript project**
   — Acceptance: `npm run tauri dev` opens a 1200×800 Tauri window with the React starter. No console errors.

2. **Configure Tailwind CSS**
   — Acceptance: Add a `bg-gray-900 text-white p-4` div to `App.tsx`. It renders with dark background. No Tailwind build errors.

3. **Add `@tauri-apps/plugin-sql` + configure SQLite in `tauri.conf.json` and `Cargo.toml`**
   — Acceptance: Plugin loads without Rust compile errors. `npm run tauri dev` still opens.

4. **Create `src/lib/db.ts` — initialize schema on app load**
   — Implement `initDb()`: open DB, run `001_initial_schema.sql` (all 6 CREATE TABLE + indexes). Call from `App.tsx` on mount.
   — Acceptance: App opens, no error, SQLite file exists at expected path (`~/Library/Application Support/com.tradeoffatlas.app/`).

5. **Create `src/lib/db.ts` — full CRUD layer**
   — Functions: `createDecision`, `getDecisions`, `getDecisionById`, `updateDecision`, `archiveDecision`, `deleteDecision`
   — Functions: `createOption`, `getOptions`, `updateOption`, `deleteOption`, `reorderOptions`
   — Functions: `createCriterion`, `getCriteria`, `updateCriterion`, `deleteCriterion`, `reorderCriteria`
   — Functions: `upsertScore`, `getScores` (returns all scores for a decision as `Record<optionId, Record<criterionId, number>>`)
   — Functions: `createTemplate`, `getTemplates`, `getTemplateById`, `deleteTemplate`, `incrementTemplateUseCount`
   — Acceptance: Write a temporary test button in `App.tsx` that calls `createDecision({name: "Test"})` then `getDecisions()`. Console logs `[{id: 1, name: "Test", ...}]`. Remove button after test.

6. **Create `src/lib/scoring.ts` with all pure functions**
   — Implement: `computeWeightedScore`, `maxPossibleScore`, `rankOptions`, `detectRankChanges` (as specified in Architecture section)
   — Acceptance: Write a `scoring.test.ts` with Vitest. Test cases:
     - 2 options, 2 criteria, equal weights → correct rank order
     - 2 options, 2 criteria, weight override flips rank → `detectRankChanges` returns 1 change
     - All zero scores → normalizedScore = 0 for all options
     - Run `npm run test` — all 3 test cases pass.

7. **Create `src/types/index.ts`** — all interfaces from Architecture section
   — Acceptance: No TypeScript errors across the project (`npx tsc --noEmit` passes).

8. **Set minimum window size (1200×800) in `tauri.conf.json`**
   — Acceptance: Manually drag window smaller than 1200px — it snaps back.

### Phase 0 Verification Checklist
- [ ] `npm run tauri dev` — Tauri window opens, no console errors
- [ ] `npx tsc --noEmit` — 0 TypeScript errors
- [ ] `npm run test` — all scoring unit tests pass
- [ ] SQLite file exists at `~/Library/Application Support/com.tradeoffatlas.app/tradeoff-atlas.db` after first launch
- [ ] Window minimum size enforced at 1200×800

### Risks
- `@tauri-apps/plugin-sql` version mismatch with Tauri 2.0 — Mitigation: Use exact version from Tauri 2.0 docs; check tauri.app/plugin/sql before installing. Fallback: use `tauri-plugin-sqlite` community crate if official plugin is broken.

---

## Phase 1: Decision Canvas + Scoring Matrix (Week 2)

**Objective:** Create and populate a decision. User can define options, criteria, and fill in scores. Weighted totals display live. This is the app's core loop — it should be usable as a real decision tool by end of phase.

### Tasks

1. **Create Zustand `decisionStore.ts`**
   — State shape: `{ decisions: Decision[], activeDecisionId: number | null, options: Option[], criteria: Criterion[], scores: Record<number, Record<number, number>> }`
   — Actions: `loadDecisions`, `setActiveDecision` (loads options/criteria/scores from DB), `addOption`, `updateOption`, `removeOption`, `addCriterion`, `updateCriterion`, `removeCriterion`, `setScore`
   — Computed: `rankedOptions` — derived from `rankOptions()` in scoring.ts using current store state
   — Acceptance: Import store in a test component, call `loadDecisions()`, verify state populates from DB.

2. **Build `Sidebar.tsx`**
   — Left panel (~240px): list of active decisions, "New Decision" button at top
   — Clicking a decision calls `setActiveDecision(id)` and switches to Canvas view
   — Active decision highlighted
   — Acceptance: Create 2 decisions via DB test harness, sidebar lists both, clicking switches active decision.

3. **Build `NewDecisionModal.tsx`**
   — Fields: Name (required), Description (optional), "Apply template?" dropdown (optional, lists templates from DB)
   — On submit: calls `createDecision` in db.ts, refreshes decision list, sets new decision as active
   — Acceptance: Open modal, fill in name, submit — new decision appears in sidebar and canvas loads.

4. **Build `ScoringMatrix.tsx` — the core grid**
   — Rows = options (with edit/delete on hover), Columns = criteria (with edit/delete + weight display)
   — Each cell = score input (0–10 integer, inline edit on click)
   — Bottom row: shows weighted total per option + normalized score (%)
   — Final column: rank badge (#1, #2, etc.)
   — Live: any score or weight change immediately re-renders rankings via Zustand computed
   — "Add Option" row at bottom, "Add Criterion" column header button
   — Acceptance: Create decision with 3 options, 3 criteria. Enter all 9 scores. Weighted totals and ranks display correctly. Change a weight — rankings re-sort live.

5. **Build `DecisionCanvasView.tsx`**
   — Wrapper: decision name/description header (editable inline), `ScoringMatrix` below, "Run Sensitivity Analysis" button, "Archive Decision" button
   — Empty state when no decision selected: "Select a decision from the sidebar or create one"
   — Acceptance: Full flow works: create decision → add options → add criteria → score matrix → rankings visible.

### Phase 1 Verification Checklist
- [ ] Create a decision with 4 options and 5 criteria — matrix renders without layout break
- [ ] Enter all 20 scores — weighted totals match manual calculation (spot check 2 options)
- [ ] Change a criterion weight from 2.0 to 8.0 — rankings re-sort without page reload
- [ ] Delete an option — matrix re-renders correctly, scores row removed
- [ ] Delete a criterion — matrix re-renders, column removed, weighted totals recalculate
- [ ] Empty state renders when no decisions exist
- [ ] `npx tsc --noEmit` — 0 errors

### Risks
- Inline editing of the matrix grid is complex (click-to-edit cells, tab navigation). Mitigation: start with click-to-focus `<input>` per cell (no custom grid editor). Fallback: modal-based score entry if cell editing is too buggy.
- Weight input UX: slider vs. text input. Decision: **text input (0–10) in Phase 1, slider in Phase 2 sensitivity view**. Keep them separate.

---

## Phase 2: Sensitivity Analysis (Week 3)

**Objective:** Given an active decision with scores, the user can interactively adjust criterion weights via sliders and see how rankings change — live radar chart updates, rank-change alerts fire when an option's rank position changes.

### Tasks

1. **Create Zustand `sensitivityStore.ts`**
   — State: `{ weightOverrides: Record<number, number> }` — starts as copy of baseline criteria weights
   — Actions: `setWeightOverride(criterionId, value)`, `resetToBaseline()`, `loadFromDecision(criteria)`
   — Computed: `sensitivityRanking` — calls `rankOptions()` with current `weightOverrides`
   — Computed: `rankChanges` — calls `detectRankChanges(baselineRanking, sensitivityRanking)`
   — This is purely in-memory — no DB writes during sensitivity analysis
   — Acceptance: Unit test that loading 3 criteria, overriding one weight, and calling `sensitivityRanking` returns correct re-ordered results.

2. **Build `CriteriaWeightSlider.tsx`**
   — Props: `criterion: Criterion`, `currentWeight: number`, `onChange: (value: number) => void`
   — Range: 0.0–10.0, step 0.5, displayed as numeric label
   — Visual: show baseline weight (gray) vs. current weight (blue) indicator
   — Acceptance: Slider renders, dragging calls `onChange` with new value, label updates.

3. **Build `RadarChart.tsx` (Recharts wrapper)**
   — Props: `options: OptionScore[]`, `criteria: Criterion[]`
   — Renders one line per option on the radar, each axis = a criterion
   — Axes labeled with criterion name + current weight
   — Legend maps option name to line color
   — Acceptance: Load decision with 3 options + 4 criteria, radar renders all 3 lines with correct shapes.

4. **Build `RankChangeAlert.tsx`**
   — Props: `rankChanges: RankChange[]`
   — Renders a dismissible alert panel listing rank swaps: "⚡ Option B moved from #3 → #1"
   — Only visible when `rankChanges.length > 0`
   — Acceptance: Override weights to cause a rank swap — alert appears with correct option names and ranks.

5. **Build `SensitivityAnalysisView.tsx`**
   — Layout: left panel = sliders (one per criterion, with "Reset to Baseline" button), right panel = radar chart + ranked bar chart + rank-change alert
   — Ranked bar chart (Recharts `BarChart`): horizontal bars, one per option, length = normalized score
   — Sliders and charts are live-linked: move slider → chart re-renders < 50ms
   — "Save as new baseline" button: writes current overrides back to criteria weights in DB
   — Acceptance:
     - Load decision, navigate to Sensitivity view — sliders match current weights, radar renders
     - Move a slider — radar updates live
     - Cause a rank swap — `RankChangeAlert` appears
     - "Reset to Baseline" — all sliders snap back to original weights, alert clears
     - "Save as new baseline" — navigate back to Canvas, criteria weights reflect the overrides

### Phase 2 Verification Checklist
- [ ] Sensitivity view loads in < 1s for decision with 6 options × 8 criteria
- [ ] Sliders update chart in < 50ms (visually imperceptible lag)
- [ ] Rank-change alert fires correctly when two options swap rank
- [ ] "Reset to Baseline" restores all sliders to original weights
- [ ] "Save as new baseline" persists overrides to DB — verify by reopening decision
- [ ] Radar chart renders correctly with up to 6 options
- [ ] `npx tsc --noEmit` — 0 errors

### Risks
- Recharts radar chart performance with many re-renders on slider drag. Mitigation: debounce `setWeightOverride` at 16ms (one frame). Fallback: switch to a static "apply" button that updates chart on click rather than live.
- Radar chart becomes unreadable with 6+ options. Mitigation: cap at 5 visible options in the chart (toggle visibility per option). Display full ranked bar chart regardless.

---

## Phase 3: Template Library + Decision History (Week 4)

**Objective:** Users can save any decision's criteria as a reusable template and apply it to new decisions. Past decisions can be archived with outcome notes and browsed in a history view.

### Tasks — Template Library

1. **Build `SaveTemplateModal.tsx`**
   — Fields: Template name (required), Category (optional text, e.g. "career", "vendor"), Description (optional)
   — Pre-populates criteria list from active decision (read-only preview of what will be saved)
   — On submit: calls `createTemplate` + `createTemplateCriteria` in db.ts
   — Acceptance: Save template from a 4-criteria decision. Query `templates` + `template_criteria` tables — rows exist with correct data.

2. **Build `TemplateLibraryView.tsx`**
   — Grid of template cards: name, category badge, description, use count, date created
   — "Apply to new decision" button per card: opens `NewDecisionModal` with this template pre-selected
   — "Delete" button per card (with `ConfirmDeleteModal`)
   — Empty state: "No templates yet. Save your first one from any decision canvas."
   — Acceptance: Create 3 templates, all appear in grid. Delete one — it's removed. Apply one to a new decision — new decision has correct criteria pre-loaded.

3. **Template application in `NewDecisionModal.tsx`**
   — When user applies a template to a new decision: after `createDecision`, call `createCriterion` for each template criterion (copying name, weight, description, position)
   — Increment `use_count` on the template
   — Acceptance: Create decision from template with 5 criteria. Canvas opens with all 5 criteria pre-populated, no options yet.

### Tasks — Decision History

4. **Build `ArchiveDecisionModal.tsx`**
   — Fields: Which option won (dropdown of current options), Outcome summary (text), Notes (multiline)
   — On submit: calls `archiveDecision(id, { outcome, outcomeNotes })` — sets `status = 'archived'`, `archived_at = now()`
   — Acceptance: Archive a decision. It disappears from sidebar active list. DB row shows status = 'archived'.

5. **Build `DecisionHistoryView.tsx`**
   — Table/list of archived decisions: name, archived date, outcome (winning option + summary), quick notes preview
   — Click to expand: shows full decision matrix (read-only), sensitivity analysis link (read-only replay)
   — Acceptance: Archive 2 decisions. History view lists both. Expanding one shows the original scoring matrix (read-only).

6. **Update `Sidebar.tsx`** — add History and Templates nav items below decision list
   — Acceptance: Clicking "Templates" loads `TemplateLibraryView`. Clicking "History" loads `DecisionHistoryView`. Active nav item highlighted.

### Phase 3 Verification Checklist
- [ ] Save template → appears in Template Library with correct criteria
- [ ] Apply template to new decision → decision opens with all criteria pre-populated, weights correct
- [ ] Template use count increments after each application
- [ ] Archive decision → removed from sidebar, appears in History
- [ ] History view shows archived decisions with outcome data
- [ ] Expanded history entry shows read-only scoring matrix
- [ ] Delete template → gone from library, decisions that used it are unaffected (FK SET NULL)
- [ ] `npx tsc --noEmit` — 0 errors

### Risks
- Read-only matrix replay for archived decisions requires rendering `ScoringMatrix` in a non-editable mode. Mitigation: add `readOnly: boolean` prop to `ScoringMatrix`. All inputs render as `<span>` when `readOnly = true`.

---

## Testing Strategy

### Unit tests (Vitest — run via `npm run test`)
- `scoring.test.ts`: All functions in `scoring.ts` — minimum 8 test cases (cover: equal weights, single criterion, weight flip causing rank change, all-zero scores, single option)
- `db.test.ts` (optional but recommended): CRUD round-trips for `decisions`, `options`, `criteria`, `scores`, `templates`

### Manual acceptance testing per phase
- Each phase's Verification Checklist is the manual test script
- Run the full checklist before marking a phase complete and moving to the next branch

### Integration smoke test (end-to-end after Phase 3)
1. Create decision "Test Decision" with 3 options (A, B, C) and 3 criteria (Cost w=5, Speed w=3, Risk w=2)
2. Enter scores: A=[8,6,9], B=[5,9,7], C=[7,7,5]
3. Verify rankings: A=weighted(8×5+6×3+9×2)=76, B=(5×5+9×3+7×2)=66, C=(7×5+7×3+5×2)=66 → A=#1, B/C tied at #2 (tiebreak by position)
4. Open sensitivity, move Cost slider from 5 → 1. Verify B or C overtakes A.
5. Save as template "Speed-First Framework"
6. Archive decision, select Option A as winner
7. Verify History shows the decision with correct outcome
8. Create new decision, apply "Speed-First Framework" template — verify criteria load
