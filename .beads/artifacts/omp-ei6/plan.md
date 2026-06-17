---
purpose: Wave-sequenced implementation plan
updated: 2026-06-17
---

# Plan: omp-ei6

**Goal:** Add a tool-presence guard in `rewriteVllmPayload` so `tool_choice = "none"` and `skip_special_tokens = false` are only applied when tools are actually present in the request payload.

## Graph Context

- **Blast radius:** `index.ts` — `rewriteVllmPayload` function, `DISABLE_TOOL_CHOICE_MODELS` block (~5 lines)
- **Unblocks:** None directly — reduces unnecessary token leakage for normal chat
- **Blocked by:** None — independent change
- **Critical path:** No — enhancement, not a blocker
- **Forecast:** ~20 min implementation, ~10 min verification

## Observable Truths

What must be TRUE for the goal to be achieved:

1. When `payload.tools` is not present or is empty: `tool_choice` and `skip_special_tokens` are NOT modified by `rewriteVllmPayload` for Kimi/Qwen models
2. When `payload.tools` is a non-empty array: `tool_choice = "none"` and `skip_special_tokens = false` are set (existing behavior preserved)
3. GLM 5.1 `tool_stream = true` is still set unconditionally (separate block, unchanged)
4. DeepSeek and MiniMax M3 thinking param rewrites are unchanged
5. `npx tsc --noEmit index.ts` passes

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| prd.md + prd.json | Requirements and scope | `.beads/artifacts/omp-ei6/prd.md` | Done |
| decisions.md | Design rationale | `.beads/artifacts/omp-ei6/decisions.md` | Done |
| plan.md | Implementation plan | `.beads/artifacts/omp-ei6/plan.md` | Done |
| tasks.md | Task decomposition | `.beads/artifacts/omp-ei6/tasks.md` | Done |
| context-capsule.md | Agent spawn context | `.beads/artifacts/omp-ei6/context-capsule.md` | Done |

## Wave Structure

Single wave — the change is small enough (~5 lines) that splitting into multiple waves adds overhead without benefit.

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | 1.1 (add tool-presence guard), 1.2 (type-check), 1.3 (manual verification) | Sequential (1.2 after 1.1, 1.3 after 1.2) | PRD approved, worktree ready | `grep` confirms guard, `tsc` passes, manual review of logic |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-makora-provider

# 1. Confirm the guard is present
grep -A8 'DISABLE_TOOL_CHOICE_MODELS' index.ts

# 2. TypeScript compiles
npx tsc --noEmit index.ts

# 3. Verify no regression in existing tests
npx tsx test-reasoning.ts  # requires MAKORA_OPTIMIZE_TOKEN

# 4. Manual logic review — trace the code path:
#    - tools present → bypass triggers → raw tokens → tool call repair
#    - tools absent → no bypass → clean output → no token cleanup needed
```
