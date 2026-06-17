---
purpose: Architecture decision records for omp-ei6
updated: 2026-06-17
---

# Decisions: omp-ei6

## Decision Log

| # | Date | Decision | Rationale | Confidence |
|---|------|----------|-----------|------------|
| 1 | 2026-06-17 | Guard on `payload.tools` presence instead of `payload.tool_choice` or `payload.stream` | `tools` is the canonical signal for "this request involves tool calling." `tool_choice` might be set independently. `stream` flag doesn't indicate tool usage. | High |
| 2 | 2026-06-17 | Keep `tool_choice = "none"` + `skip_special_tokens = false` together when bypassing | These two settings are coupled: `tool_choice = "none"` prevents vLLM from using its broken streaming parser; `skip_special_tokens = false` preserves raw tool call tokens for client-side parsing. Setting one without the other breaks the repair pipeline. | High |
| 3 | 2026-06-17 | No change to `stripControlTokens` or `message_end` hook | The conditional bypass reduces (but doesn't eliminate) the need for cleanup. Keep the safety net for edge cases. Removing it would be a separate bead with different risk profile. | High |
| 4 | 2026-06-17 | Single-file change (index.ts only) | The change is localized to `rewriteVllmPayload`. No new functions, constants, or hooks needed. Follows the project convention of monolithic index.ts. | High |
| 5 | 2026-06-17 | Use `Array.isArray(p.tools) && p.tools.length > 0` as the guard | Simple, idiomatic TypeScript. Handles `undefined`, `null`, empty arrays gracefully. No type assertion needed for the outer check. | High |
