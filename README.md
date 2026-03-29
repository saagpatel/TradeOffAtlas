![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri-2-24C8D8?style=flat-square&logo=tauri&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) ![SQLite](https://img.shields.io/badge/SQLite-local-003B57?style=flat-square&logo=sqlite&logoColor=white) ![License](https://img.shields.io/badge/license-none-lightgrey?style=flat-square)

# TradeOffAtlas

A local-first desktop app for structured, multi-criteria decision analysis. Model complex choices by defining weighted criteria, scoring each option, and letting the app rank them — then stress-test your rankings with sensitivity analysis to see which criteria actually drive the outcome.

## What it does

TradeOffAtlas gives you a weighted scoring matrix: you create a decision, add the options you're comparing, define the criteria that matter (cost, risk, impact, etc.), assign weights to each criterion, and score every option against them. The app computes weighted totals and ranks options in real time. A built-in sensitivity analysis view lets you drag criterion weights and immediately see whether the rankings hold or flip, surfacing which factors your conclusion actually depends on. Decisions can be archived with an outcome note once made, and reusable templates let you apply the same criteria framework across multiple decisions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| Frontend | React 19, TypeScript 5.8 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Charts | Recharts 3 |
| Database | SQLite via `tauri-plugin-sql` |
| Export | jsPDF + jspdf-autotable |
| Tests | Vitest 4 |
| Build | Vite 7 |

## Prerequisites

- **Node.js** 18 or later
- **Rust** 1.70 or later — install via [rustup](https://rustup.rs)
- **Tauri CLI** — installed automatically as a dev dependency (`npm run tauri`)
- macOS, Windows, or Linux desktop environment

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (hot-reload)
npm run tauri dev

# 3. Build a production binary
npm run tauri build
```

Run tests:

```bash
npm test           # single run
npm run test:watch # watch mode
```

## Project Structure

```
TradeOffAtlas/
├── src/                        # Frontend (React + TypeScript)
│   ├── App.tsx                 # Root component, DB init, view routing
│   ├── main.tsx                # Entry point
│   ├── components/             # UI components
│   │   ├── DecisionCanvasView.tsx   # Main scoring matrix view
│   │   ├── SensitivityAnalysisView.tsx
│   │   ├── DecisionHistoryView.tsx
│   │   ├── TemplateLibraryView.tsx
│   │   ├── ScoringMatrix.tsx
│   │   ├── RadarChart.tsx
│   │   └── ...
│   ├── store/                  # Zustand stores
│   │   ├── decision-store.ts
│   │   ├── app-store.ts
│   │   └── sensitivity-store.ts
│   ├── lib/                    # Utilities
│   │   ├── db.ts               # SQLite connection + migrations
│   │   ├── scoring.ts          # Weighted score calculations
│   │   ├── export.ts           # PDF export logic
│   │   └── use-keyboard-shortcuts.ts
│   └── types/                  # Shared TypeScript types
├── src-tauri/                  # Rust backend (Tauri 2)
│   ├── src/                    # Rust source
│   ├── Cargo.toml
│   └── tauri.conf.json         # App config, window dimensions
├── database/
│   └── migrations/             # SQL schema migrations
├── index.html
├── vite.config.ts
└── package.json
```

## Key Views

- **Decision Canvas** — weighted scoring matrix with inline editing and live rank updates
- **Sensitivity Analysis** — drag criterion weights to explore how rankings change
- **Template Library** — save and reuse criteria frameworks across decisions
- **Decision History** — archive of completed decisions with outcome notes

<!-- TODO: Add screenshot -->

## Data Storage

All data is stored locally in a SQLite database managed by Tauri's `tauri-plugin-sql`. No account, no sync, no network required.
