# TradeOffAtlas

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](#) [![Rust](https://img.shields.io/badge/Rust-dea584?style=flat-square&logo=rust&logoColor=white)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> Stop trusting your gut on big decisions — model the criteria, weight them, and let sensitivity analysis show you which factors actually change the answer

TradeOffAtlas is a local-first desktop app for structured multi-criteria decision analysis. Define weighted criteria, score each option, and watch rankings update in real time. Then drag criterion weights in the sensitivity view to see whether your top pick holds or flips — exposing the hidden drivers behind your conclusion.

## Features

- **Weighted scoring matrix** — create decisions, add options, define criteria with weights, and score every combination; totals compute instantly
- **Sensitivity analysis** — drag any criterion weight on a live chart and watch rankings respond, surfacing which factors your conclusion actually depends on
- **Decision archive** — mark decisions as resolved with an outcome note; revisit past choices and the reasoning behind them
- **Reusable templates** — save a criteria framework once and apply it across multiple decisions without re-entering weights
- **PDF export** — generate a formatted summary of any decision to share or file away

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Rust stable toolchain (via [rustup](https://rustup.rs))
- macOS, Windows, or Linux desktop environment

### Installation

```bash
git clone https://github.com/saagpatel/TradeOffAtlas.git
cd TradeOffAtlas
npm install
```

### Usage

```bash
# Development mode
npm run tauri dev

# Run tests
npm test

# Production build
npm run tauri build
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Tauri 2 |
| Frontend | React 19, TypeScript 5.8 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Charts | Recharts 3 |
| Database | SQLite via tauri-plugin-sql |
| Export | jsPDF + jspdf-autotable |
| Tests | Vitest 4 |

## Architecture

All data lives in a local SQLite database managed by the Tauri Rust backend — no sync, no cloud, nothing leaves your machine. The weighted scoring computation runs in the React layer for immediate feedback; the sensitivity analysis chart re-renders on every slider tick using memoized Recharts data. Decision templates are stored as JSON blobs in SQLite so they can be imported and exported without schema migrations.

## License

MIT
