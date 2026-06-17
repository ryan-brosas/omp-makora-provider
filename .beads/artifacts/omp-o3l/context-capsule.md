---
purpose: Agent spawn context for a bead
updated: 2026-06-17
---

# Context Capsule: omp-o3l

## Objective

Add a `stripGlmCotMarkers()` function that detects and removes leaked GLM 5.1 ` thinking`/` response` chain-of-thought markers from assistant message content, moving extracted reasoning to the `reasoning_content` field. Integrate into the existing `message_end` hook, before tool call repair.

## Key Patterns

- `stripControlTokens()` — Exact string matching loop for vLLM control token removal. Reference: `index.ts` lines 530-545
- `parseGlmToolCalls()` — Regex-based extraction with error handling, returns `ParsedToolCall[]`. Reference: `index.ts` lines 355-376
- `message_end` hook structure — Filters by model (`TOOL_CALL_REPAIR_MODELS`) and role (`assistant`), extracts text, repairs content. Reference: `index.ts` lines 590-640
- `extractText(content: ContentBlock[])` — Helper to concatenate `type: "text"` blocks. Reference: `index.ts` lines 460-464

## Constraints

1. **Model guard required** — Only apply to `zai-org/GLM-5.1-FP8`. Use `GLM_5_1_ID` constant (line 272). Never touch other models.
2. **CoT stripping before tool call repair** — The `message_end` hook runs tool call parsing after CoT stripping. The cleaned content must be what tool call parsing sees.
3. **Do not break tool call parsing** — Markers ` thinking`/` response` are distinct from `<tool_call>` XML. But if both appear in the same message, strip CoT first, then parse tool calls from the cleaned text.
4. **No streaming changes** — This is non-streaming path only. The streaming path processes deltas differently.
5. **Follow existing patterns** — `console.debug` for logging, `set -euo pipefail` equivalents not relevant (it's TypeScript). Use the existing `ContentBlock` interface and helpers.
6. **No new dependencies** — Pure TypeScript string operations. No new npm packages.

## File Ownership

| Task | Allowed | Forbidden |
|------|---------|-----------|
| Core implementation | `index.ts` — add `stripGlmCotMarkers()` function, modify `message_end` hook | `index.ts` — do not modify `stripControlTokens`, `parseGlmToolCalls`, `before_provider_request` hook, or `context` hook |
| Tests | `tests/glm-cot-strip.test.ts` (new file) — unit tests for CoT stripping | `test-reasoning.ts` — read-only, only verify it still passes |
| Config | None | `models.json`, `patch.json` — do not modify model definitions |

## Graph Context

- **Blast radius:** `index.ts` (function addition ~line 540, hook modification ~line 590)
- **Related beads:** omp-tool-call-repair-hardening-307 (tool call parsing), omp-kimi-qwen-token-cleanup-dwj (control token cleanup)
- **File history:** `index.ts` is the main provider file — all model-specific handling lives here
