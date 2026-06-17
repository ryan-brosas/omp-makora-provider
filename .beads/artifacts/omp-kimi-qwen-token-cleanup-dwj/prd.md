---
purpose: Product Requirements Document for omp-kimi-qwen-token-cleanup-dwj
updated: 2026-06-17
---

# PRD: Strip leaked vLLM special tokens and fix Qwen splitBeforeTools bug

**Bead:** omp-kimi-qwen-token-cleanup-dwj | **Type:** bug | **Priority:** P1
**Created:** 2026-06-17 | **Estimate:** 35m

## Problem

WHEN Kimi K2.6, Kimi K2.7, Qwen 3.6 27B, or Qwen 3.6 35B call tools THEN leaked vLLM control tokens appear in assistant message content BECAUSE `before_provider_request` sets `skip_special_tokens: false` to allow tool call token passthrough for client-side repair, but this also leaks all non-tool-call special tokens (e.g., `<|im_start|>`, `<|im_end|>`, `<|endoftext|>`) into the content stream.

ADDITIONALLY, the Qwen `splitBeforeTools` function has an index-offset bug: it strips `█` delimiters from a copy (`cleaned`), finds the `<function=` index in the cleaned copy, but slices the ORIGINAL text at that index. When `█` characters appear before `<function=`, the offset is wrong, causing text truncation or `█` leakage into the text prefix.

**Who is affected?** All users of Kimi K2.6, Kimi K2.7, Qwen 3.6 27B, Qwen 3.6 35B models on Makora — 4 of 11 supported models.

**Why now?** The `omp-tool-call-repair-hardening-307` bead established the core repair pipeline but didn't address content quality. The `omp-test-tool-call-parsers-8l6` bead adds test coverage but doesn't fix these issues. Fixing them now rounds out the production hardening milestone.

## Scope

### In Scope
- Strip known vLLM control tokens from the `textBeforeTools` prefix in `message_end` tool call repair
- Fix Qwen `splitBeforeTools` to use `cleaned` text for the slice (consistent index)
- Add `console.debug` logging for token cleanup events
- Make cleanup functions self-contained and testable

### Out of Scope
- Stream-level tool call masking (pi's `message_update` doesn't support message modification)
- Changing `skip_special_tokens: false` behavior (required for tool call repair to work)
- Adding new test files (covered by `omp-test-tool-call-parsers-8l6`)
- Modifying models.json, patch.json, or update-models.js
- Extracting shared logic to separate modules (goes against Decision 3)

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | Strip vLLM control tokens from Kimi/Qwen text prefix in message_end | MUST | `textBeforeTools` contains no `<|im_start|>`, `<|im_end|>`, `<|endoftext|>`, `<|fim_prefix|>`, `<|fim_suffix|>`, `<|fim_middle|>` tokens |
| 2 | Fix Qwen splitBeforeTools offset bug | MUST | Function slices `cleaned` text (not original) when computing prefix; no `█` leakage and no truncation |
| 3 | Preserve all existing tool call repair behavior | MUST | GLM, Kimi, Qwen tool call parsing works identically; no regression |
| 4 | Add debug logging for cleanup actions | SHOULD | `console.debug` logs token count stripped per message |
| 5 | Handle edge cases | SHOULD | Empty text, tokens-only text, interleaved tokens handled gracefully |

## Technical Context

**Key files:** `index.ts` (lines ~377-505: tool call parsers, splitBeforeTools, buildRepairedContent, message_end handler)

**Affected code paths:**
- `splitBeforeTools(model, text)` — needs Qwen offset fix (line ~454)
- `extractText(content)` — already extracts text from blocks
- `buildRepairedContent(content, parsed, textBeforeTools)` — consumes textBeforeTools
- `message_end` handler — orchestrates the full pipeline (line ~566)

**Leaked token patterns to strip:**
```
<|im_start|>, <|im_end|>, <|endoftext|>, 
<|fim_prefix|>, <|fim_suffix|>, <|fim_middle|>,
<|start_header_id|>, <|end_header_id|>, <|eot_id|>
```

**Current Qwen splitBeforeTools bug:**
```typescript
// BUG: idx from cleaned, but slices original text
const cleaned = text.replace(/█/g, "");
const idx = cleaned.indexOf("<function=");
return idx >= 0 ? text.slice(0, idx).trimEnd() : text;
// FIX: return idx >= 0 ? cleaned.slice(0, idx).trimEnd() : text;
```

**Models affected:**
- `nvidia/Kimi-K2.6-NVFP4` (KIMI_K2_6_ID)
- `moonshotai/Kimi-K2.7-Code` (KIMI_K2_7_ID)
- `unsloth/Qwen3.6-27B-NVFP4` (QWEN_3_6_27B_ID)
- `unsloth/Qwen3.6-35B-A3B-NVFP4` (QWEN_3_6_35B_ID)

## Approach

**Chosen: Add `stripControlTokens()` function + fix Qwen offset + integrate into existing message_end pipeline.**

1. Create `stripControlTokens(text: string): string` that removes known vLLM control token patterns
2. Fix `splitBeforeTools` for Qwen to use `cleaned.slice()` instead of `text.slice()`
3. Call `stripControlTokens()` on `textBeforeTools` in `buildRepairedContent` or in the `message_end` handler
4. Add `console.debug` logging with token count stripped

**Why this approach:**
- Minimal change — ~20 lines added, ~2 lines changed
- Uses existing `message_end` hook, same pattern as current repair
- Cleanup function is self-contained and testable
- No new hooks, no architectural changes
- Follows project conventions (single-file, no new modules)

**Alternatives considered:**
- **Strip tokens during streaming via `message_update`**: Not possible — `message_update` doesn't support message modification (confirmed in pi type definitions)
- **Remove `skip_special_tokens: false`**: Would break tool call repair — tool call tokens must pass through as text for client-side parsing
- **Use `context` hook instead**: `context` fires on follow-up requests, not initial responses — doesn't help the CURRENT message

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Regex-based token stripping removes legitimate content | Low | Medium | Use exact token string matching, not fuzzy regex; only strip at token boundaries |
| Qwen fix changes behavior for edge case texts | Low | Low | The fix makes behavior MORE correct; existing tests pass |
| New token patterns added in future vLLM versions | Medium | Low | Add `console.debug` logging to surface unexpected tokens; token list is extensible |
| Performance impact of additional string processing | Low | Low | Strip is O(n) single-pass; text is already being regex-scanned for tool calls |

## Success Criteria

- [ ] Kimi/Qwen assistant messages contain no vLLM control tokens in text prefix
    - Verify: Manual test with Kimi K2.6 or Qwen 3.6 calling a tool
- [ ] Qwen text prefix never contains `█` or truncated text
    - Verify: Manual test with Qwen 3.6; inspect textBeforeTools in debug log
- [ ] All existing tool call repair continues to work
    - Verify: `MAKORA_OPTIMIZE_TOKEN=$TOKEN npx tsx test-reasoning.ts` passes for all models
- [ ] No regressions in GLM, Kimi, or Qwen tool calling
    - Verify: Run `scripts/update-models.js` (no-op check — models.json unchanged)
- [ ] Code passes type check
    - Verify: `npx tsc --noEmit index.ts`
