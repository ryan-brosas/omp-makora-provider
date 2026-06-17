---
purpose: Agent spawn context for omp-ei6
updated: 2026-06-17
---

# Context Capsule: omp-ei6

## Bead
- **ID:** omp-ei6
- **Title:** Conditional vLLM parser bypass for Kimi/Qwen
- **Type:** task | **Priority:** P1 | **Estimate:** 30 min

## What We're Doing
Adding a tool-presence guard in `rewriteVllmPayload` so `tool_choice = "none"` and `skip_special_tokens = false` are only set when tools are actually provided — not for normal chat requests.

## Key Context
- `rewriteVllmPayload` is called from `before_provider_request` hook for every API request
- `DISABLE_TOOL_CHOICE_MODELS` = {Kimi K2.6, Kimi K2.7, Qwen 3.6 27B, Qwen 3.6 35B}
- Current behavior: always sets tool_choice="none" + skip_special_tokens=false
- Target behavior: only sets when `Array.isArray(payload.tools) && payload.tools.length > 0`
- Tool call repair at `message_end` only fires when raw tokens are present — no impact when tools aren't used
- GLM 5.1 (`tool_stream = true`) is separate — not in DISABLE_TOOL_CHOICE_MODELS

## Files
- **index.ts** — Only file to modify. `rewriteVllmPayload` function, inside the `DISABLE_TOOL_CHOICE_MODELS` block (~line 255).

## Verification
```bash
# Type check
npx tsc --noEmit index.ts

# Verify the guard is present
grep -A8 'DISABLE_TOOL_CHOICE_MODELS' index.ts

# Existing tests
npx tsx test-reasoning.ts  # needs MAKORA_OPTIMIZE_TOKEN
```
