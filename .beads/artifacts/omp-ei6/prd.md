---
purpose: Product Requirements Document for a bead
updated: 2026-06-17
---

# PRD: Conditional vLLM parser bypass — only disable tool_choice and enable special token passthrough when tools are present for Kimi/Qwen

**Bead:** omp-ei6 | **Type:** task | **Priority:** P1
**Created:** 2026-06-17 | **Estimate:** 30 min

## Problem

WHEN a user sends a normal chat request (no tools) to Kimi K2.6, Kimi K2.7, Qwen 3.6 27B, or Qwen 3.6 35B THEN vLLM special tokens leak into the response content BECAUSE `rewriteVllmPayload` unconditionally sets `skip_special_tokens = false` for these models.

The `stripControlTokens` function in the `message_end` hook cleans these up post-hoc, but this approach has three weaknesses:

1. **Unnecessary processing** — normal chat messages should never contain special tokens; forcing them through makes every Kimi/Qwen response go through the cleanup path
2. **Fragile allowlist** — `VLLM_CONTROL_TOKENS` is a hardcoded list; any new or unknown special token that vLLM introduces will leak through to the user
3. **Performance waste** — string replacement on every Kimi/Qwen message, regardless of whether tool calling is involved

Additionally, `tool_choice = "none"` is set even when no tools are provided. While semantically harmless in that case, it's an unnecessary override that could interact poorly with future vLLM chat template changes.

**Who is affected?** All users of Kimi K2.6, Kimi K2.7, Qwen 3.6 27B, and Qwen 3.6 35B on Makora. Every normal chat response goes through special token passthrough + cleanup unnecessarily.

**Why now?** The existing pattern (unconditional override) was expedient when shipping tool call repair. Now that tool call repair is stable (omp-tool-call-repair-hardening-307 CLOSED, omp-kimi-qwen-token-cleanup-dwj CLOSED), we can tighten the bypass to apply only when actually needed — tools are present. This follows the project philosophy of "YAGNI" and "Prune over pad."

## Scope

### In Scope
- Add a tool-presence guard in `rewriteVllmPayload` before applying `DISABLE_TOOL_CHOICE_MODELS` overrides
- Only set `tool_choice = "none"` and `skip_special_tokens = false` when `payload.tools` is a non-empty array
- Verify tool call repair still works for all Kimi/Qwen models with tools
- Verify normal chat produces clean output (no special tokens, no cleanup path)

### Out of Scope
- Non-Kimi/Qwen models (GLM 5.1, DeepSeek, MiniMax M3 — unaffected)
- Streaming-specific optimizations
- Changing the parser bypass strategy (still client-side text parsing at `message_end`)
- Modifying `stripControlTokens` logic
- Adding new models or changing patch.json

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | When payload has no tools: `tool_choice` is NOT modified and `skip_special_tokens` is NOT set | MUST | Normal chat requests to Kimi/Qwen pass through with no payload mutation for these fields |
| 2 | When payload has tools (non-empty array): existing behavior preserved — `tool_choice = "none"` and `skip_special_tokens = false` | MUST | Tool-calling requests to Kimi/Qwen get the parser bypass, tool call repair works |
| 3 | GLM 5.1 behavior unchanged | MUST | `tool_stream = true` still set for GLM 5.1 regardless of tool presence |
| 4 | DeepSeek models unaffected | MUST | DS V4 Flash/Pro thinking param rewrites unchanged |
| 5 | MiniMax M3 unaffected | MUST | `enable_thinking` in `chat_template_kwargs` still set |
| 6 | All existing tests pass | MUST | `npx tsx test-reasoning.ts` passes for all models |

## Technical Context

**Key files:**
- `index.ts` — `rewriteVllmPayload` function (lines ~230-270 in the current code). Single 3-line change inside the `DISABLE_TOOL_CHOICE_MODELS` block.
- `test-reasoning.ts` — Integration tests for multi-turn reasoning. No changes needed — tests don't use tools, so the bypass won't trigger.

**Current code (line ~255 in index.ts):**
```typescript
// Kimi K2.6 / K2.7 / Qwen 3.6: vLLM streaming tool_choice is broken.
// Disable native tool_choice and let raw tokens through as text.
if (DISABLE_TOOL_CHOICE_MODELS.has(model)) {
    p.tool_choice = "none";
    p.skip_special_tokens = false;
}
```

**Target code:**
```typescript
// Kimi K2.6 / K2.7 / Qwen 3.6: vLLM streaming tool_choice is broken.
// Disable native tool_choice and let raw tokens through as text —
// but only when tools are actually requested. For normal chat,
// let vLLM handle the response natively without special token leakage.
if (DISABLE_TOOL_CHOICE_MODELS.has(model)) {
    const hasTools = Array.isArray(p.tools) && (p.tools as unknown[]).length > 0;
    if (hasTools) {
        p.tool_choice = "none";
        p.skip_special_tokens = false;
    }
}
```

**Why this approach:**
- Minimal change (3 lines added, 2 lines indented)
- No new functions, no new constants, no new hooks
- The `message_end` tool call repair only triggers when raw tool call tokens are present — which only happens when tools are used. The unconditional bypass was always overkill.
- The guard uses `Array.isArray` + length check which handles `undefined`, `null`, and empty arrays gracefully.

**Alternatives considered:**
1. **Check `p.tool_choice` instead of `p.tools`** — Rejected. `tool_choice` might be set but tools might be empty. Checking tools directly is more accurate.
2. **Check `p.stream` flag** — Rejected. The vLLM parser might also be broken for non-streaming on these models. Safer to keep the bypass when tools are present regardless of stream mode.
3. **Add a new model set for conditional bypass** — Rejected. Overengineering. The tool-presence guard is sufficient.
4. **Remove `skip_special_tokens = false` entirely and always use native output** — Rejected. Then tool call repair would fail because special tokens would be stripped.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tool calling breaks if tools are present but bypass doesn't trigger | Low | High | Guard uses `Array.isArray` — any standard tool array will trigger. Verified by review. |
| vLLM chat template misbehaves with tool_choice when tools present but not bypassed | Low | High | We still bypass when tools present. No change in this case. |
| Regression: tool call repair stops working | Low | High | Only the trigger condition changes; when tools present, behavior is identical to current. |
| `payload.tools` uses a different field name in OMP | Low | Medium | Standard OpenAI format uses `tools`; verified against existing codebase conventions. |

## Success Criteria

- [ ] Code change: add tool-presence guard in `rewriteVllmPayload`
    - Verify: `grep -A5 'DISABLE_TOOL_CHOICE_MODELS' index.ts` shows the conditional block
- [ ] Normal chat: Kimi/Qwen respond without special token leakage
    - Verify: send a simple chat request (no tools) to Kimi K2.6; response content has no `<|im_start|>` or similar tokens
- [ ] Tool calls: Kimi/Qwen tool call repair still works
    - Verify: send a tool-calling request; verify tool calls are parsed from raw text
- [ ] All models: `test-reasoning.ts` passes
    - Verify: `npx tsx test-reasoning.ts` (requires MAKORA_OPTIMIZE_TOKEN)
- [ ] TypeScript compiles
    - Verify: `npx tsc --noEmit index.ts`
