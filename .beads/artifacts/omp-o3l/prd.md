---
purpose: Product Requirements Document for a bead
updated: 2026-06-18
---

# PRD: Strip leaked GLM 5.1 chain-of-thought content markers from assistant messages

**Bead:** omp-o3l | **Type:** bug | **Priority:** P1
**Created:** 2026-06-17 | **Estimate:** 30

## Problem

GLM 5.1 FP8 responses from Makora leak vLLM chat-template chain-of-thought sentinels into assistant visible content when the GLM reasoning parser does not split reasoning from response text. The leaked text appears as a literal ` thinking` marker, private reasoning, then a literal ` response` marker before the actual answer. This is user-visible: private reasoning pollutes the answer, contaminates future context, and exposes chain-of-thought that should not be in the assistant-visible message.

## Scope

### In Scope
- Detect and strip complete, ordered ` thinking` / ` response` marker pairs from GLM 5.1 assistant text content.
- Extract private reasoning between markers into `reasoning_content`.
- Append to existing `reasoning_content` when the parser already populated it.
- Leave `reasoning_content` absent when extracted text is empty after trim.
- Preserve prefix text before ` thinking` and response text after ` response`.
- Preserve non-text content blocks (tool calls, etc.).
- Skip stripping when markers are inside fenced Markdown code blocks.
- Skip stripping when only one marker is present (partial leak — guessing would corrupt content).
- Skip stripping for non-GLM models.
- Run CoT cleanup before GLM raw tool-call repair so parsed tool calls operate on cleaned text.
- Tests covering all marker patterns through the provider `message_end` hook.

### Out of Scope
- Non-GLM model cleanup.
- Streaming-specific cleanup.
- Server-side vLLM parser configuration.
- Model metadata, pricing, or context length changes.
- Broad provider refactors.

## Requirements

| # | Requirement | Acceptance Criteria |
|---|-------------|---------------------|
| R1 | Strip complete marker pair | `" thinking\nreasoning\n response\nanswer"` → visible text is `"answer"`, `reasoning_content` is `"reasoning"` |
| R2 | Append to existing reasoning_content | When `reasoning_content` already set by parser, leaked reasoning is appended with newline separator |
| R3 | No-op on missing markers | Messages without both markers pass through unchanged (returns undefined) |
| R4 | No-op on partial leaks | Thinking-only or response-only messages pass through unchanged |
| R5 | No-op on wrong order | ` response` before ` thinking` passes through unchanged |
| R6 | No-op on non-GLM models | Non-GLM models with marker text pass through unchanged |
| R7 | No-op inside code fences | Marker pairs inside ``` blocks pass through unchanged |
| R8 | Empty reasoning omission | When extracted reasoning is empty after trim, `reasoning_content` is not set |
| R9 | Tool call integration | CoT stripping runs before GLM tool-call repair; tool calls parse correctly from cleaned text |
| R10 | Prefix preservation | Text before ` thinking` is preserved in visible content |

## Verification

```bash
npm test
```

All 10 tests must pass. Tests cover: R1–R10.

## Implementation Notes

- `stripGlmCotMarkers()` at `index.ts:635-662` — the cleanup helper.
- Integration in `message_end` handler at `index.ts:711-724` — runs before tool-call repair.
- Test helper `runHook` must reflect that the hook mutates `event.message` in-place rather than returning a value (line 767 comment: "the extension runner discards return values from message_end handlers").
