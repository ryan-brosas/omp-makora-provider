---
purpose: Wave-sequenced implementation plan
updated: 2026-06-17
---

# Plan: omp-test-tool-call-parsers-8l6

**Goal:** All parser functions have comprehensive test coverage, edge-case bugs are fixed, and the provider is resilient to missing config files.

## Graph Context

- **Blast radius:** `index.ts`, `scripts/test-parsers.ts` (NEW), `test-reasoning.ts`
- **Unblocks:** None (no downstream beads)
- **Blocked by:** None (no upstream dependencies)
- **Critical path:** No — orphan bead, sole node in graph
- **Forecast:** ~66 min (bv), PRD estimate 45 min. No parallelizable subtracks (single-file ownership).
- **Capacity:** 1 bead open, 66 serial minutes, 0% parallelizable (single bead).
- **Graph position:** Keystone (PageRank 1.0), influencer (1.0), slack=0. No cycles, no articulation points.

## Observable Truths

What must be TRUE for the goal to be achieved:

1. `npx tsx scripts/test-parsers.ts` exits 0 with 20+ passing tests covering GLM, Kimi, Qwen parsers, toolCallsToGlmXml, splitBeforeTools, buildRepairedContent, and hasToolCallBlocks
2. `parseQwenToolCalls` correctly extracts tool calls from text containing `█` delimiters anywhere (before, between, after function blocks)
3. `splitBeforeTools` for Qwen models computes text index from original text, not `█`-cleaned text
4. Provider starts successfully with `custom-models.json` deleted (defaults to `[]`)
5. Provider starts successfully with `patch.json` deleted (defaults to `{}`)
6. `test-reasoning.ts` includes `moonshotai/Kimi-K2.7-Code` entry matching existing model patterns
7. All 8 models in test-reasoning.ts pass reasoning checks

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| Test runner | Parser unit tests (zero-dependency) | `scripts/test-parsers.ts` | Need |
| Fixed index.ts | splitBeforeTools Qwen fix + loadJson try/catch | `index.ts` | Need |
| Updated test-reasoning.ts | Kimi K2.7 Code entry | `test-reasoning.ts` | Need |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | 1.1 Fix `splitBeforeTools` Qwen, 1.2 Wrap `loadJson` in try/catch, 1.3 Add Kimi K2.7 Code to test-reasoning.ts | Yes (3 separate functions/files) | None | `npx tsc --noEmit index.ts test-reasoning.ts` |
| 2 | 2.1 Write test runner (scripts/test-parsers.ts) | No (single file, all tests) | Wave 1 complete | `npx tsx scripts/test-parsers.ts` exits 0 |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-makora-provider
# Type check all files
npx tsc --noEmit index.ts test-reasoning.ts scripts/test-parsers.ts

# Run parser tests (20+ cases)
npx tsx scripts/test-parsers.ts

# Verify loadJson resilience
# (manual: delete custom-models.json, verify provider loads)
```
