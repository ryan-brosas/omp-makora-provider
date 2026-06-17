---
purpose: Wave-sequenced implementation plan for omp-kimi-qwen-token-cleanup-dwj
updated: 2026-06-17
---

# Plan: omp-kimi-qwen-token-cleanup-dwj

**Goal:** Strip leaked vLLM control tokens from Kimi/Qwen assistant content and fix the Qwen splitBeforeTools index-offset bug — zero regression on existing tool call repair.

## Graph Context

- **Blast radius:** `index.ts` only (1 file, 0 open beads on it)
- **Unblocks:** None (leaf node, no dependents)
- **Blocked by:** None
- **Critical path:** No — independent track
- **Forecast:** 35m (matches estimate)
- **Tracks:** Track A (this bead) | Track B (metadata defaults, planned) | Track C (parser tests, in progress)

## Observable Truths

What must be TRUE for the goal to be achieved:

1. `textBeforeTools` for Kimi/Qwen models contains zero vLLM control tokens (`<|im_start|>`, `<|im_end|>`, `<|endoftext|>`, and 6 others)
2. Qwen `splitBeforeTools` returns text sliced from the `█`-cleaned string, not the original — no `█` leakage, no truncation
3. GLM 5.1 tool call parsing produces identical results before and after the change
4. `npx tsc --noEmit index.ts` passes with zero errors
5. Existing tool call repair code paths (GLM, Kimi, Qwen) function identically

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| `stripControlTokens` function | Token cleanup utility | `index.ts` (new function, ~L360) | Need |
| Fixed `splitBeforeTools` Qwen branch | Correct offset handling | `index.ts` (L454, 2-line change) | Need |
| Integrated cleanup call in `message_end` | Cleaned textBeforeTools | `index.ts` (L566-L600, 1-line addition) | Need |
| Debug log lines | Diagnostics for token cleanup | `index.ts` (2 new `console.debug` calls) | Need |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | 1.1: Add `stripControlTokens` utility | No (single task) | None | Function parses; `grep -c "stripControlTokens" index.ts` == 3+ (def + 2 uses) |
| 2 | 2.1: Fix Qwen splitBeforeTools + 2.2: Integrate cleanup into message_end | Yes (both touch index.ts but different regions) | Wave 1 done | `grep "cleaned.slice" index.ts` matches; `grep "stripControlTokens" index.ts` in message_end handler |
| 3 | 3.1: Verify type-check + 3.2: Verify regression | Yes (independent checks) | Wave 2 done | `npx tsc --noEmit index.ts` passes; `grep` confirms all existing code paths untouched |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-makora-provider

# 1. Type-check
npx tsc --noEmit index.ts

# 2. Confirm stripControlTokens exists and is wired in
grep -c "stripControlTokens" index.ts
# Expected: >= 3 (definition + 2 uses)

# 3. Confirm Qwen fix
grep "cleaned.slice" index.ts
# Expected: one match at the Qwen splitBeforeTools branch

# 4. Confirm no regression — all existing tool call repair code paths unchanged
grep -c "parseGlmToolCalls" index.ts  # == 1 (definition unchanged)
grep -c "parseKimiToolCalls" index.ts # == 1 (definition unchanged)
grep -c "parseQwenToolCalls" index.ts # == 1 (definition unchanged)
grep -c "toolCallsToGlmXml" index.ts  # == 1 (definition unchanged)

# 5. Confirm debug logging in place
grep -c "console.debug" index.ts
# Expected: >= 6 (4 existing + 2 new)

# 6. Run existing reasoning test suite
MAKORA_OPTIMIZE_TOKEN=$TOKEN npx tsx test-reasoning.ts
```
