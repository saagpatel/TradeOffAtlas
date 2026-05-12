# TradeOffAtlas — Portfolio Disposition

**Status:** Release Frozen — Tauri 2 + Rust + TypeScript local-first
multi-criteria decision analysis app at **v1.0.0** on `origin/main`,
with .dmg distribution build deps + CSP hardened + sensitivity
analysis as the distinguishing feature + PDF export + decision
archive + reusable templates. **31st signing cluster member.**
**Memory drift correction**: prior memory classified this as
"decision analysis v1 + Phase 4 polish" with implied web/static-
host shape; canonical state is **Tauri 2 desktop app** with the
established v1.0 release closeout signature. Cross-platform
(macOS / Windows / Linux desktop per README).

> Disposition uses strict `origin/main` verification.
> **Memory drift recorded** — implied static-host → actual Tauri 2
> desktop signing cluster.

---

## Verification posture

Only `origin` (`saagpatel/TradeOffAtlas`). Clean migration.

`origin/main`:

- Tip: `328e4b0` chore: update build dependencies for .dmg
  distribution
- v1.0 release closeout cadence (standard Tauri 2 signature):
  - `328e4b0` .dmg distribution build deps
  - `615a79c` chore: bump version to 1.0.0 and add Content
    Security Policy
- Full OSS scaffolding wave
- `src-tauri/` directory confirms Tauri 2 architecture
- Default branch: `main`

---

## Current state in one paragraph

TradeOffAtlas is a Tauri 2 + Rust + TypeScript local-first
**multi-criteria decision analysis** desktop app. Workflow: create
a decision, add options, define weighted criteria, score every
combination, totals compute instantly. **Sensitivity analysis** is
the distinguishing feature — drag any criterion weight on a live
chart and watch rankings respond, exposing which factors the
conclusion actually depends on. Includes decision archive
(resolved decisions with outcome notes), reusable templates
(criteria framework saved once, applied across decisions), and
**PDF export**. Per memory: v1 complete + Phase 4 polish. The v1.0
release closeout cadence on canonical main confirms ship-readiness.

---

## Why "Release Frozen" — 31st signing cluster member, memory drift correction

Standard Tauri 2 v1.0 signature applies. Memory drift correction:

| Aspect | Prior memory | **Canonical reality** |
|---|---|---|
| Shape | "decision analysis v1 + Phase 4 polish" (implied static-host / web) | **Tauri 2 desktop signing cluster** |
| Backend | Implied web | **Local-first SQLite-or-equivalent** |
| Distribution | n/a | **DMG via Apple Developer ID** (also Windows / Linux cross-platform per README) |

Trust the canonical commit cadence + `src-tauri/` directory over
memory.

---

## Cluster taxonomy update

| Cluster | Count |
|---|---|
| **Signing (Apple desktop)** | **31** |

---

## Unblock trigger (operator)

Standard signing cluster prerequisites:

1. **Apple Developer ID + notarization credentials.**
2. **Cross-platform build** — README claims macOS / Windows / Linux;
   verify Linux + Windows builds produce working binaries from
   the same Tauri config.
3. **PDF export library licensing** — if a PDF library is bundled
   (likely jsPDF or pdf-lib), verify license compatibility with
   MIT distribution.
4. **Local data persistence** — sensitivity analysis + decision
   archive imply local SQLite or JSON; verify schema migration
   strategy for v1.1+.
5. **Operator-shipped HANDOFF.md** is in the local working tree
   (untracked) — inspect before discarding; may have substantive
   release notes.
6. **Verify signed/notarized DMG** opens cleanly.

Estimated operator time: ~3 hours.

---

## Portfolio operating system instructions

| Aspect | Posture |
|---|---|
| Portfolio status | `Release Frozen` |
| Distribution channel | **DMG via Apple Developer ID** (cross-platform: also Windows + Linux) |
| Version | **v1.0.0** |
| Review cadence | Suspend overdue counting |
| Resurface conditions | (a) Apple signing credentials, (b) cross-platform build verification, (c) PDF export library updates, (d) v1.1 scope, (e) HANDOFF.md disposition |
| Co-batch with | Signing cluster — **now 31 repos** |
| Special concern | **Memory drift correction** — "decision analysis web" → "Tauri 2 desktop." Update memory record. |
| Special concern | **Cross-platform builds** — README claims 3 platforms; QA cost is 3x. |
| Special concern | **PDF export library license** — verify MIT compatibility. |
| Special concern | **Untracked HANDOFF.md** in local working tree — inspect before discarding. |

---

## Reactivation procedure

1. Verify branch tracking.
2. Review stash `r16-toa-stash` (CLAUDE.md + package-lock.json +
   .codex/ + .github/workflows/ + AGENTS.md + **HANDOFF.md** +
   pnpm-lock.yaml). HANDOFF.md is potentially load-bearing —
   inspect before discarding.
3. **Update memory record**: "decision analysis web" → "Tauri 2
   desktop app, signing cluster #31."
4. Test sensitivity analysis chart on a sample decision.
5. Test PDF export.
6. Run `cargo test` + `npm test`.

---

## Last known reference

| Field | Value |
|---|---|
| `origin/main` tip | `328e4b0` chore: update build dependencies for .dmg distribution |
| Default branch | `main` |
| Build system | Tauri 2 + Rust + TypeScript |
| Version | **v1.0.0** |
| Distribution | **DMG via Apple Developer ID** (cross-platform: macOS + Windows + Linux per README) |
| Phases shipped | v1 + Phase 4 polish per memory |
| Distinguishing tech | **Sensitivity analysis** (drag criterion weight, ranking responds live) + **multi-criteria decision matrix** + PDF export + reusable templates |
| Memory drift | "decision analysis web" → **Tauri 2 desktop signing cluster** |
| Migration state | No `legacy-origin` remote |
| Distinguishing feature | **31st signing cluster member; memory drift correction (web → Tauri 2 desktop).** Cross-platform desktop with sensitivity analysis as the distinguishing UX feature. |
