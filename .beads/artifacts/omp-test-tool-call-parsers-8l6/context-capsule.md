---
purpose: Agent spawn context for a bead
updated: 2026-06-17
---

# Context Capsule: omp-test-tool-call-parsers-8l6

## Objective

Add comprehensive unit tests for tool call parsers, fix `splitBeforeTools` Qwen index bug, wrap `loadJson` in error handling, and add Kimi K2.7 Code to reasoning tests.

## Key Patterns

- **`parseGlmToolCalls`** — Regex `/<tool_call>\s*<tool_name>([^<]+)<\/tool_name>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_call>/g`. Extracts name + JSON args. Skips malformed JSON silently. Reference: `index.ts` ~L260-280
- **`parseKimiToolCalls`** — Regex `/<\|tool_call_begin\|>([^\n]+)\n([\s\S]*?)<\|tool_call_end\|>/g`. Same pattern as GLM. Reference: `index.ts` ~L283-300
- **`parseQwenToolCalls`** — Regex `/<function=([^>]+)>([\s\S]*?)<\/function>/g` on `█`-cleaned text. Reference: `index.ts` ~L303-320
- **`splitBeforeTools` Qwen branch** — BUG: computes index on `█`-cleaned text, slices from original. Fix: use original `text` for indexOf. Only clean for parsing, not index computation. Reference: `index.ts` ~L423-432
- **`loadJson`** — Currently `JSON.parse(readFileSync(...))` with no try/catch. Wrap calls in `export default` with defaults. Reference: `index.ts` ~L59-61, L465-467
- **MODELS array in test-reasoning.ts** — Each entry has `id`, `name`, `reasoningResponseField`, `buildPayload`. Add matching entry for Kimi K2.7 Code. Reference: `test-reasoning.ts` ~L32-124

## Constraints

1. Test runner must be zero-dependency — inline parser functions or dynamic import, no vitest/jest/node:test
2. Do NOT change parser regex patterns, tool call ID generation, or core parser logic — only fix the index bug and add error handling
3. `models.json` is required — do NOT default it; only `custom-models.json` (`[]`) and `patch.json` (`{}`) get defaults
4. All test output goes through `assert()` helper; no console.log noise except pass/fail summary
5. Exit code 0 on all-pass, 1 on any failure — essential for CI/sanity checks

## File Ownership

| Task | Allowed | Forbidden |
|------|---------|-----------|
| 1.1 Fix splitBeforeTools | `index.ts` — `splitBeforeTools` function (Qwen branch only) | Any other function in index.ts |
| 1.2 Wrap loadJson | `index.ts` — `export default` function (lines where loadJson is called) | `loadJson` function definition (keep it pure) |
| 1.3 Add Kimi K2.7 | `test-reasoning.ts` — MODELS array (add new entry) | Any other model entry or test logic |
| 2.1 Test runner | `scripts/test-parsers.ts` — NEW file | `index.ts`, `test-reasoning.ts`, any other existing file |

## Graph Context

- **Blast radius:** `index.ts`, `scripts/test-parsers.ts` (NEW), `test-reasoning.ts`
- **Related beads:** None (orphan — only bead in graph)
- **File history:** No prior bead touches (first bead for these files)
