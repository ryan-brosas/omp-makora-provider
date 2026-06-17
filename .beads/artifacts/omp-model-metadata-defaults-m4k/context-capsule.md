---
purpose: Context capsule — key facts for future sessions
updated: 2026-06-17
---

# Context Capsule: omp-model-metadata-defaults-m4k

## What we're doing

Populating production model defaults that are currently missing:
1. **maxTokens: 0 → proper values**: All 10 models in `models.json` have `maxTokens: 0`. Set via `patch.json`: DeepSeek V4 → 32768, reasoning models → 16384, non-reasoning → 8192.
2. **Missing vision config**: Kimi K2.6, Kimi K2.7, MiniMax M3 support images but have no `vision.maxImagesPerRequest`. Set to 5.
3. **update-models.js default**: Change hardcoded `maxTokens: 0` to `maxTokens: 8192` in `transformApiModel`.

## Key files
- `patch.json` — Add `maxTokens` and `vision` entries (additions only, no deletions)
- `scripts/update-models.js` — Change `maxTokens: 0` to `maxTokens: 8192` (line ~117)
- `README.md` — Regenerate model table (via update-models.js or manual)
- Worktree: `/home/ryan/repos/omp-makora-provider/.worktrees/omp-model-metadata-defaults-m4k-model-metadata-defaults`

## Dependencies
- Upstream: None (independent of omp-test-tool-call-parsers-8l6 and omp-tool-call-repair-hardening-307)
- Downstream: None
- Blocked by: Nothing

## Model maxTokens values

| Model ID | maxTokens | Rationale |
|----------|-----------|-----------|
| `deepseek-ai/DeepSeek-V4-Flash` | 32768 | DeepSeek API max |
| `deepseek-ai/DeepSeek-V4-Pro` | 32768 | DeepSeek API max |
| `zai-org/GLM-5.1-FP8` | 16384 | Conservative for reasoning |
| `openai/gpt-oss-120b` | 16384 | GPT-4 class conservative |
| `nvidia/Kimi-K2.6-NVFP4` | 16384 | Reasoning overhead budget |
| `moonshotai/Kimi-K2.7-Code` | 16384 | Same family as K2.6 |
| `unsloth/Qwen3.6-27B-NVFP4` | 16384 | Reasoning overhead budget |
| `unsloth/Qwen3.6-35B-A3B-NVFP4` | 16384 | Same family as 27B |
| `MiniMaxAI/MiniMax-M3-MXFP8` | 16384 | Conservative for reasoning |
| `meta-llama/Llama-3.3-70B-Instruct` | 8192 | Non-reasoning, Meta default |
| `amd/Llama-3.3-70B-Instruct-FP8-KV` | 16384 | Already in custom-models.json |

## Vision config

Models receiving `"vision": { "maxImagesPerRequest": 5 }`:
- `nvidia/Kimi-K2.6-NVFP4`
- `moonshotai/Kimi-K2.7-Code`
- `MiniMaxAI/MiniMax-M3-MXFP8`

These already have `"input": ["text", "image"]` in patch.json.

## Verification
- `grep -c '"maxTokens"' patch.json` → 10
- `grep -c 'maxImagesPerRequest' patch.json` → 3
- `grep 'maxTokens' scripts/update-models.js` → shows 8192
- `npx tsc --noEmit index.ts` → passes
- `git diff` → only patch.json, update-models.js, README.md changed
