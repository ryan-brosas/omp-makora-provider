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
