# Tradeoff Atlas

## Overview
A local-first Tauri 2.0 desktop app for multi-criteria decision modeling. Define decisions, score options against weighted criteria, run sensitivity analysis, save reusable templates, and archive past decisions with outcomes. Built for solo use — all data stored in SQLite on-device, no backend, no sync.

## Tech Stack
- Shell: Tauri 2.0 (Rust sidecar, macOS-first)
- Frontend: React 19 + TypeScript (strict mode)
- Storage: SQLite via `@tauri-apps/plugin-sql`
- Charts: Recharts 3.x — radar chart + bar chart for sensitivity analysis
- Styling: Tailwind CSS 4.x (utility-first, dark theme default)
- Build: Vite 7.x

## Development Conventions
- TypeScript strict mode — no `any` types, no type assertions without comment justification
- File naming: kebab-case for files, PascalCase for React components
- Component naming: suffix views with `View` (e.g., `DecisionCanvasView`), modals with `Modal`
- All DB operations go through `src/lib/db.ts` — no raw SQL in components
- Git: conventional commits — `feat:`, `fix:`, `chore:`, `refactor:`
- Each phase gets its own branch: `phase-0`, `phase-1`, etc.

## Current Phase
**v1.0.0 — Shipped** (all phases complete; see IMPLEMENTATION-ROADMAP.md for the original phase breakdown)

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Simpler than Redux for solo Tauri app; avoids prop drilling across 4 views |
| Chart library | Recharts | Already in stack per brief; radar chart fits sensitivity visualization naturally |
| SQLite access | `@tauri-apps/plugin-sql` | Official Tauri plugin, handles Rust/JS bridge for SQLite |
| Sensitivity model | Live weight recompute | Recalculate scores in-memory on slider change — no DB writes during analysis |
| Rank-change alert | Delta threshold: ±1 rank | Flag when a criterion weight shift causes any option to swap rank position |
| Template storage | DB table (not file export) | Keeps templates queryable and avoids filesystem permission complexity |
| App window size | 1200×800 min, resizable | Enough space for 6-option × 8-criteria matrix without horizontal scroll |

## Do NOT
- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md
- Do not write raw SQL in React components — all queries go through `src/lib/db.ts`
- Do not store any user data outside SQLite — no localStorage, no JSON flat files, no Tauri store plugin
- Do not add cloud sync, user accounts, or any network calls — this app is permanently local-only
- Do not scaffold all phases at once — complete phase verification checklist before starting next phase
- Do not use class components — hooks + Zustand only
- Do not recompute sensitivity scores in the database — do it in-memory in the Zustand store

<!-- portfolio-context:start -->
# Portfolio Context

## What This Project Is

A local-first Tauri 2.0 desktop app for multi-criteria decision modeling. Define decisions, score options against weighted criteria, run sensitivity analysis, save reusable templates, and archive past decisions with outcomes. Built for solo use — all data stored in SQLite on-device, no backend, no sync.

## Current State

**v1.0.0 — Shipped** (all phases complete; see IMPLEMENTATION-ROADMAP.md for the original phase breakdown)

## Stack

- Shell: Tauri 2.0 (Rust sidecar, macOS-first)
- Frontend: React 19 + TypeScript (strict mode)
- Storage: SQLite via `@tauri-apps/plugin-sql`
- Charts: Recharts 3.x — radar chart + bar chart for sensitivity analysis
- Styling: Tailwind CSS 4.x (utility-first, dark theme default)
- Build: Vite 7.x

## How To Run

```bash
# Development mode
npm run tauri dev

# Run tests
npm test

# Production build
npm run tauri build
```

## Known Risks

- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md
- Do not write raw SQL in React components — all queries go through `src/lib/db.ts`
- Do not store any user data outside SQLite — no localStorage, no JSON flat files, no Tauri store plugin
- Do not add cloud sync, user accounts, or any network calls — this app is permanently local-only
- Do not scaffold all phases at once — complete phase verification checklist before starting next phase
- Do not use class components — hooks + Zustand only
- Do not recompute sensitivity scores in the database — do it in-memory in the Zustand store

## Next Recommended Move

Use this context plus the README and supporting docs to resume the next active task, then promote the repo beyond minimum-viable by capturing a dedicated handoff, roadmap, or discovery artifact.

<!-- portfolio-context:end -->
