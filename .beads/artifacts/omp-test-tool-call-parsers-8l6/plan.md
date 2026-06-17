---
purpose: Implementation plan for a bead
bead: omp-test-tool-call-parsers-8l6
updated: 2026-06-17
---

# Plan: Add test coverage for tool call parsers and fix edge cases

## Graph Context

- **Blast radius:** `index.ts` (parser functions, loadJson, splitBeforeTools), `scripts/test-parsers.ts` (NEW), `test-reasoning.ts` (add Kimi K2.7)
- **Unblocks:** Confidence to refactor parsers, safe model syncs, visibility into regressions
- **Forecast:** 45 min — 3 waves, all parallel-safe within wave

## Observable Truths

1. Parser functions are pure — no side effects, no API calls, deterministic
2. All 3 parser types share the same interface: `(text: string) => ParsedToolCall[]`
3. `loadJson` is synchronous — wrap pattern is identical for all 3 call sites
4. Kimi K2.7 Code test entry mirrors Kimi K2.6 NVFP4 exactly
5. Zero-dependency test runner avoids introducing `package.json` changes

## Wave Structure

### Wave 1: Parser unit tests (parallel-safe, no deps)
**Files:** `scripts/test-parsers.ts` (NEW)

Tasks:
1. **T1.1** — Write `parseGlmToolCalls` tests (6 cases: single call, multi call, no call, empty text, malformed JSON skip, real-world example)
2. **T1.2** — Write `parseKimiToolCalls` tests (6 cases: single call, multi call, no call, empty text, malformed JSON skip, real-world)
3. **T1.3** — Write `parseQwenToolCalls` tests (8 cases: single call, multi call, no call, empty text, malformed JSON skip, █ delimiter between calls, █ before first call, real-world)
4. **T1.4** — Write `toolCallsToGlmXml` round-trip test (parse → XML → parse produces identical results)
5. **T1.5** — Write `splitBeforeTools` tests (4 cases per model: text+before tools, no tools, only tools, edge cases)
6. **T1.6** — Write `buildRepairedContent` + `hasToolCallBlocks` tests

### Wave 2: Code fixes (depends on Wave 1 tests passing baseline)
**Files:** `index.ts`

Tasks:
7. **T2.1** — Fix `splitBeforeTools` Qwen: use original text for both index computation and slicing
8. **T2.2** — Add try/catch around `loadJson` calls with defaults (`[]` for arrays, `{}` for objects)

### Wave 3: Integration + verification (depends on Wave 2)
**Files:** `index.ts`, `test-reasoning.ts`, `scripts/test-parsers.ts`

Tasks:
9. **T3.1** — Add Kimi K2.7 Code to `test-reasoning.ts` MODELS array
10. **T3.2** — Run full test suite: `npx tsx scripts/test-parsers.ts`
11. **T3.3** — Verify provider starts with missing JSON files (manual test: move custom-models.json aside)
12. **T3.4** — Final review: confirm all 12 acceptance criteria from PRD are met

## Delegation Packets

None — all tasks are straightforward and don't require sub-agent spawning.

## Verification Commands

```bash
# Unit tests
npx tsx scripts/test-parsers.ts

# Reasoning integration (requires API key)
MAKORA_OPTIMIZE_TOKEN=$TOKEN npx tsx test-reasoning.ts

# Graceful startup with missing files
mv custom-models.json custom-models.json.bak && echo "Provider should start"; mv custom-models.json.bak custom-models.json

# Lint
br lint omp-test-tool-call-parsers-8l6 --json
```
