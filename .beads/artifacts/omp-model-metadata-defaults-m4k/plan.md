---
purpose: Wave-sequenced implementation plan
updated: 2026-06-17
---

# Plan: omp-model-metadata-defaults-m4k

**Goal:** Set production `maxTokens` caps, `vision` config, and `contextWindow` corrections for all 11 Makora models so OMP applies output limits and correctly gates multimodal features.

## Graph Context

- **Blast radius:** `patch.json`, `scripts/update-models.js`, `README.md` (auto-regenerated), `custom-models.json` (verify only)
- **Unblocks:** None directly — but enables safe reasoning model usage for all downstream work
- **Blocked by:** None — independent of other beads
- **Critical path:** Yes — every API call uses maxTokens; reasoning models have no output cap without this
- **Forecast:** ~30 min implementation, ~10 min verification

## Observable Truths

What must be TRUE for the goal to be achieved:

1. Every model in the merged model list (models.json → patch.json → custom-models.json) has `maxTokens > 0`
2. DeepSeek V4 Flash and DeepSeek V4 Pro have `maxTokens: 32768` (their native 32K output limit)
3. Kimi K2.6, Kimi K2.7, and MiniMax M3 have `vision: { maxImagesPerRequest: 5 }`
4. GLM 5.1 `contextWindow` is 200000 (already set in patch.json — verify no regression)
5. `scripts/update-models.js` `transformApiModel` defaults to `maxTokens: 8192` instead of `0`
6. No existing patch entries are removed or altered (additions only)
7. `npx tsc --noEmit index.ts` passes with zero errors
8. All models with `reasoning: true` have `maxTokens >= 16384` (thinking token budget)

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| patch.json (updated) | maxTokens + vision overrides | `patch.json` | Need |
| update-models.js (updated) | Default maxTokens: 8192 | `scripts/update-models.js` | Need |
| README.md (regenerated) | Updated model table | `README.md` | Auto |
| plan.md | This file | `.beads/artifacts/omp-model-metadata-defaults-m4k/plan.md` | Done |
| tasks.md | Task decomposition | `.beads/artifacts/omp-model-metadata-defaults-m4k/tasks.md` | Done |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | 1.1 (maxTokens in patch.json), 1.2a (vision support in applyPatch), 1.3 (update-models.js default) | Yes — three independent file edits | PRD approved, worktree clean | `grep maxTokens patch.json`, `grep vision index.ts`, `grep 'maxTokens: 8192' scripts/update-models.js` |
| 2 | 1.2b (vision in patch.json), 2.1 (contextWindow validation), 2.2 (custom-models.json verify) | Yes — 1.2b depends on 1.2a but 2.1/2.2 are independent | Wave 1 complete | `grep maxImagesPerRequest patch.json`, `grep contextWindow patch.json`, manual custom-models.json review |
| 3 | 3.1 (type-check), 3.2 (README regenerate), 3.3 (diff audit) | 3.1 + 3.2 parallel; 3.3 after all | Wave 2 complete | `npx tsc --noEmit`, `git diff --stat`, manual diff review |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-makora-provider

# 1. All models have maxTokens > 0 in patch.json
grep -c '"maxTokens"' patch.json
# Expected: 11 (one per model, including custom model override)

# 2. DS models get 32768
grep -A1 'DeepSeek-V4' patch.json | grep maxTokens
# Expected: 32768 for both Flash and Pro

# 3. Vision config present for 3 multimodal models
grep -c 'maxImagesPerRequest' patch.json
# Expected: 3

# 4. update-models.js default
grep 'maxTokens: 8192' scripts/update-models.js
# Expected: match in transformApiModel

# 5. Type-check passes
npx tsc --noEmit index.ts
# Expected: exit 0

# 6. No deletions from existing patch entries
git diff patch.json | grep '^-'
# Expected: only context lines, no deleted entries

# 7. Reasoning models have >= 16384 maxTokens
# Manual check: all models with "reasoning": true have maxTokens >= 16384
```
