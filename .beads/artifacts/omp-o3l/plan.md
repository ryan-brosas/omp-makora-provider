---
purpose: Wave-sequenced implementation plan
updated: 2026-06-17
---

# Plan: omp-o3l

**Goal:** Strip leaked GLM 5.1 ` thinking`/` response` chain-of-thought content markers from assistant messages and move leaked reasoning to the `reasoning_content` field.

## Graph Context

- **Blast radius:** `index.ts` (lines 540-650: `stripControlTokens`, `message_end` hook, GLM-related constants)
- **Unblocks:** None known
- **Blocked by:** None
- **Critical path:** No
- **Forecast:** 60 min (single file, ~60 new lines, ~80 test lines)

## Observable Truths

What must be TRUE for the goal to be achieved:

1. GLM 5.1 assistant messages containing ` thinking` and ` response` markers have them stripped from content
2. Extracted thinking content between markers populates `reasoning_content` on the message
3. Non-GLM models pass through the `message_end` hook with no change
4. Tool call parsing on GLM messages still works after CoT stripping
5. Unit tests verify all marker presence/absence combinations

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| prd.md + prd.json | Requirements and scope | `.beads/artifacts/omp-o3l/prd.md` | Done |
| decisions.md | Design rationale | `.beads/artifacts/omp-o3l/decisions.md` | Done |
| plan.md | Implementation plan | `.beads/artifacts/omp-o3l/plan.md` | Done |
| tasks.md | Task decomposition | `.beads/artifacts/omp-o3l/tasks.md` | Done |
| context-capsule.md | Agent spawn context | `.beads/artifacts/omp-o3l/context-capsule.md` | Done |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | 1.1 (write `stripGlmCotMarkers` function) | No | PRD approved | Function compiles, handles all edge cases |
| 2 | 2.1 (integrate into `message_end` hook) | No | Wave 1 complete | GLM messages pass through hook with no errors |
| 3 | 3.1 (write unit tests), 3.2 (integration verification) | Yes | Wave 2 complete | All tests pass |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-makora-provider/

# Unit tests
npx vitest run --reporter verbose 2>&1 | grep -E "(PASS|FAIL|Tests)"

# Verify no leaked markers in index.ts logic
rg -n "thinking| response" index.ts
```
