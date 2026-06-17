---
purpose: Task decomposition with dependency tracking
updated: 2026-06-17
---

# Tasks: omp-model-metadata-defaults-m4k

## Wave 1: Core Metadata Additions (parallel)

### 1.1 Add maxTokens to all models in patch.json

```yaml
id: "1.1"
depends_on: []
parallel: true
files: ["patch.json"]
estimated_minutes: 15
```

- [ ] Add `maxTokens: 32768` to `deepseek-ai/DeepSeek-V4-Flash`
- [ ] Add `maxTokens: 32768` to `deepseek-ai/DeepSeek-V4-Pro`
- [ ] Add `maxTokens: 16384` to `zai-org/GLM-5.1-FP8`
- [ ] Add `maxTokens: 16384` to `openai/gpt-oss-120b`
- [ ] Add `maxTokens: 16384` to `nvidia/Kimi-K2.6-NVFP4`
- [ ] Add `maxTokens: 16384` to `moonshotai/Kimi-K2.7-Code`
- [ ] Add `maxTokens: 16384` to `unsloth/Qwen3.6-27B-NVFP4`
- [ ] Add `maxTokens: 16384` to `unsloth/Qwen3.6-35B-A3B-NVFP4`
- [ ] Add `maxTokens: 16384` to `MiniMaxAI/MiniMax-M3-MXFP8`
- [ ] Add `maxTokens: 8192` to `meta-llama/Llama-3.3-70B-Instruct` (non-reasoning)
- [ ] Verify: `grep -c '"maxTokens"' patch.json` returns 11

**Reasoning:** DeepSeek V4 supports 32K output natively. All other reasoning models get 16K (conservative, covers thinking tokens). Non-reasoning Llama gets 8K (Meta's recommended default).

### 1.2a Add `vision` support to applyPatch (prerequisite)

```yaml
id: "1.2a"
depends_on: []
parallel: true
files: ["index.ts", "scripts/update-models.js"]
estimated_minutes: 5
```

- [ ] Add `vision?: { maxImagesPerRequest?: number }` to `PatchEntry` interface in `index.ts`
- [ ] Add `if (patch.vision !== undefined) result.vision = { ...patch.vision }` to `applyPatch` in `index.ts`
- [ ] Add same `vision` handling to `applyPatch` in `scripts/update-models.js`
- [ ] Verify: `grep 'vision' index.ts` shows interface field + applyPatch line
- [ ] Verify: `grep 'vision' scripts/update-models.js` shows applyPatch line

**Critical:** Without this, `vision` entries in patch.json are silently ignored by both the provider and the model sync script.

### 1.2b Add vision config to multimodal models in patch.json

```yaml
id: "1.2b"
depends_on: ["1.2a"]
parallel: false
files: ["patch.json"]
estimated_minutes: 3
```

- [ ] Add `"vision": { "maxImagesPerRequest": 5 }` to `nvidia/Kimi-K2.6-NVFP4` (already has `"input": ["text", "image"]`)
- [ ] Add `"vision": { "maxImagesPerRequest": 5 }` to `moonshotai/Kimi-K2.7-Code` (already has `"input": ["text", "image"]`)
- [ ] Add `"vision": { "maxImagesPerRequest": 5 }` to `MiniMaxAI/MiniMax-M3-MXFP8` (already has `"input": ["text", "image"]`)
- [ ] Verify: `grep -c 'maxImagesPerRequest' patch.json` returns 3

### 1.3 Change update-models.js default maxTokens from 0 to 8192

```yaml
id: "1.3"
depends_on: []
parallel: true
files: ["scripts/update-models.js"]
estimated_minutes: 5
```

- [ ] In `transformApiModel`, change `maxTokens: 0` to `maxTokens: 8192`
- [ ] Verify: `grep 'maxTokens: 8192' scripts/update-models.js` matches in `transformApiModel`
- [ ] Ensure reasoning/non-reasoning distinction is NOT added to the script (that's patch.json's job)

## Wave 2: Validation & Consistency (parallel)

### 2.1 Validate contextWindow values

```yaml
id: "2.1"
depends_on: ["1.1", "1.2b"]
parallel: true
files: ["patch.json", "models.json"]
estimated_minutes: 5
```

- [ ] Verify GLM 5.1 `contextWindow` is 200000 in patch.json (already set — no change needed)
- [ ] Cross-check `models.json` contextWindow values against known specs:
  - DeepSeek V4 Flash: 1,048,576 ✓ (1M context)
  - DeepSeek V4 Pro: 1,048,576 ✓ (1M context)
  - Llama 3.3 70B: 131,072 ✓ (128K context)
  - MiniMax M3: 1,048,576 ✓ (1M context)
  - Kimi K2.7: 262,144 ✓ (256K context)
  - Kimi K2.6: 262,144 ✓ (256K context)
  - GPT-OSS 120B: 131,072 ✓ (128K context)
  - Qwen 3.6 27B: 262,144 ✓ (256K context)
  - Qwen 3.6 35B: 262,144 ✓ (256K context)
  - GLM 5.1: 200,000 (patched, API returns 202752)
- [ ] If any mismatch found, add `contextWindow` override to patch.json

### 2.2 Verify custom-models.json Llama 3.3 FP8 consistency

```yaml
id: "2.2"
depends_on: ["1.1"]
parallel: true
files: ["custom-models.json"]
estimated_minutes: 5
```

- [ ] Llama 3.3 70B FP8 already has `maxTokens: 16384` — verify this is correct
- [ ] Llama 3.3 70B FP8 has `contextWindow: 128000` — matches the non-FP8 variant (131072 vs 128000, both acceptable)
- [ ] Llama 3.3 70B FP8 has custom `baseUrl` — keep as-is (per-slug endpoint)
- [ ] No changes needed unless discrepancy found

## Wave 3: Verification & Documentation (parallel)

### 3.1 Type-check and structural validation

```yaml
id: "3.1"
depends_on: ["1.1", "1.2a", "1.2b", "1.3"]
parallel: true
files: ["index.ts", "patch.json"]
estimated_minutes: 5
```

- [ ] Run `npx tsc --noEmit index.ts` — must pass with zero errors
- [ ] Verify `applyPatch` in index.ts handles `vision` key (added in 1.2a)
- [ ] Verify patch.json is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('patch.json','utf8'))"`

### 3.2 Regenerate README model table

```yaml
id: "3.2"
depends_on: ["1.1", "1.2b"]
parallel: true
files: ["README.md"]
estimated_minutes: 5
```

- [ ] Run `MAKORA_OPTIMIZE_TOKEN=$TOKEN node scripts/update-models.js` (if API key available)
- [ ] OR manually verify the README table reflects new metadata
- [ ] Verify notes column for multimodal models mentions vision support
- [ ] Verify model list is sorted alphabetically by name

### 3.3 Diff audit — verify no regressions

```yaml
id: "3.3"
depends_on: ["1.1", "1.2a", "1.2b", "1.3", "2.1", "2.2"]
parallel: false
files: ["patch.json", "scripts/update-models.js", "README.md"]
estimated_minutes: 5
```

- [ ] `git diff patch.json` — verify only additions, no deletions from existing entries
- [ ] `git diff scripts/update-models.js` — verify only the `maxTokens: 0 → 8192` change
- [ ] `git diff README.md` — verify table regeneration, no manual edits lost
- [ ] Verify reasoning, thinkingLevelMap, compat, notes, input are preserved for all models in patch.json

## Expanded Execution Task Ledger
- [ ] XT-001: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-002: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-003: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-004: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-005: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-006: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-007: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-008: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-009: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-010: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-011: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-012: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-013: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-014: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-015: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-016: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-017: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-018: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-019: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-020: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-021: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-022: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-023: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-024: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-025: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-026: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-027: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-028: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-029: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-030: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-031: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-032: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-033: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-034: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-035: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-036: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-037: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-038: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-039: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-040: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-041: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-042: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-043: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-044: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-045: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-046: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-047: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-048: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-049: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-050: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-051: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-052: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-053: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-054: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-055: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-056: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-057: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-058: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-059: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-060: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-061: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-062: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-063: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-064: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-065: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-066: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-067: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-068: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-069: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-070: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-071: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-072: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-073: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-074: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-075: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-076: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-077: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-078: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-079: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-080: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-081: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-082: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-083: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-084: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-085: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-086: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-087: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-088: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-089: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-090: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-091: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-092: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-093: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-094: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-095: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-096: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-097: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-098: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-099: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-100: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-101: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-102: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-103: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-104: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-105: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-106: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-107: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-108: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-109: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-110: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-111: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-112: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-113: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-114: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-115: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-116: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-117: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-118: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-119: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-120: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-121: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-122: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-123: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-124: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-125: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-126: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-127: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-128: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-129: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-130: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-131: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-132: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-133: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-134: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-135: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-136: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-137: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-138: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-139: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-140: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-141: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-142: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-143: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-144: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-145: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-146: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-147: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-148: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-149: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-150: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-151: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-152: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-153: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-154: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-155: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-156: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-157: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-158: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-159: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-160: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-161: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-162: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-163: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-164: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-165: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-166: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-167: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-168: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-169: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-170: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-171: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-172: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-173: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-174: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-175: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-176: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-177: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-178: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-179: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-180: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-181: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-182: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-183: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-184: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-185: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-186: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-187: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-188: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-189: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-190: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-191: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-192: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-193: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-194: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-195: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-196: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-197: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-198: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-199: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-200: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-201: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-202: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-203: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-204: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-205: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-206: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-207: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-208: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-209: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-210: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-211: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-212: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-213: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-214: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-215: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-216: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-217: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-218: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-219: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-220: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-221: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-222: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-223: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-224: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-225: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-226: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-227: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-228: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-229: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-230: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-231: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-232: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-233: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-234: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-235: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-236: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-237: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-238: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-239: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-240: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-241: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-242: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-243: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-244: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-245: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-246: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-247: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-248: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-249: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-250: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-251: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-252: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-253: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-254: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-255: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-256: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-257: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-258: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-259: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-260: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-261: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-262: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-263: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-264: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-265: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-266: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-267: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-268: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-269: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-270: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-271: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-272: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-273: patch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-274: applyPatch vision — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-275: script default — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-276: README notes — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-277: merged validation — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-278: diff review — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-279: progress logging — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
- [ ] XT-280: patch maxTokens — perform or verify one bead-scoped action, cite the touched file when applicable, and do not close the bead from this ship phase.
