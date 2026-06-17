---
purpose: Architecture decisions for omp-kimi-qwen-token-cleanup-dwj
updated: 2026-06-17
---

# Decisions: omp-kimi-qwen-token-cleanup-dwj

## Decision Log

| # | Date | Decision | Rationale | Confidence |
|---|------|----------|-----------|------------|
| 1 | 2026-06-17 | Strip control tokens in `message_end` handler rather than `context` hook | `message_end` fires after message is finalized — we can clean the content before it's stored in session history. `context` fires on subsequent requests, missing the first occurrence. | High |
| 2 | 2026-06-17 | Exact string matching for token stripping (not regex) | vLLM control tokens have fixed, known formats. Exact matching avoids accidentally stripping legitimate content that contains angle brackets. | High |
| 3 | 2026-06-17 | Fix Qwen bug by returning `cleaned.slice(0, idx)` instead of `text.slice(0, idx)` | The `█` delimiters are Qwen-specific and should never appear in user-visible content. Returning cleaned text is correct and simpler than tracking offset deltas. | High |
| 4 | 2026-06-17 | Apply cleanup to `textBeforeTools` only, not to full extracted text | Tool call tokens within `<function=...>` or `<|tool_call_begin|>` blocks are parsed and removed by existing logic. Only the text prefix (before first tool call) needs cleanup — it's what becomes the visible assistant message text. | High |
| 5 | 2026-06-17 | Keep all changes in index.ts (no new files) | Follows Decision 3 from project decisions: monolithic index.ts. The `stripControlTokens` function is small (~15 lines) and belongs with the other tool call utilities. | High |
| 6 | 2026-06-17 | `console.debug` for token cleanup logging | Follows existing logging pattern (`console.debug` for non-critical events, `console.warn` for parse failures). Users can enable debug output to see cleanup events. | High |

## Rejected Alternatives

| Alternative | Reason Rejected |
|-------------|-----------------|
| Strip tokens in `context` hook | Would miss the FIRST occurrence — tokens pollute the initial assistant message before `context` fires on follow-up |
| Strip tokens via `message_update` | pi's `message_update` hook doesn't support message modification (type-confirmed in ExtensionAPI) |
| Remove `skip_special_tokens: false` | Tool call tokens would be consumed by vLLM's broken streaming parser and never reach the client for repair |
| Use regex `/<\|.*?\|>/g` for token stripping | Too aggressive — would match legitimate content like `<|literal pipe text|>` in code examples |
| Split into separate module | Goes against Decision 3 (monolithic index.ts); ~15 lines doesn't justify a new file |
| Strip in `extractText` instead of `textBeforeTools` | Would strip tokens from WITHIN tool call blocks where they're already handled; `textBeforeTools` is the right granularity |
