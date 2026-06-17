---
purpose: Agent spawn context for omp-kimi-qwen-token-cleanup-dwj
updated: 2026-06-17
---

# Context Capsule: omp-kimi-qwen-token-cleanup-dwj

## Objective

Strip leaked vLLM control tokens from Kimi/Qwen assistant content and fix Qwen splitBeforeTools index-offset bug — zero regression on existing tool call repair.

## Key Patterns

- **Tool call repair pipeline** — All repair happens in `message_end` hook: extractText → parseToolCallsFromText → splitBeforeTools → buildRepairedContent. The cleanup is inserted between splitBeforeTools and buildRepairedContent. Reference: `index.ts` L557-L620.
- **Model ID gating** — All model-specific behavior uses `Set<string>` lookups against model IDs. Add no new model ID sets; reuse existing `TOOL_CALL_REPAIR_MODELS`. Reference: `index.ts` L275-L300.
- **Logging convention** — `console.debug` for non-critical events (token cleanup), `console.warn` for parse failures. Follow existing prefix: `makora: [<model>] <message>`. Reference: `index.ts` L385, L403, L421 for existing debug/warn patterns.
- **Single-file monolithic** — All changes in `index.ts`. Do NOT create new files or modules. Follows Decision 3.
- **Exact string matching** — Token stripping uses exact string `.replaceAll()`, not fuzzy regex. Prevents false positives.

## Constraints

1. **No new files** — All changes in `index.ts`. Do not create `lib/`, `utils/`, or shared modules.
2. **No model definition changes** — Do not edit `models.json`, `patch.json`, `custom-models.json`, or `scripts/update-models.js`.
3. **Zero regression** — Existing tool call repair must work identically. If grep counts for parseGlmToolCalls/parseKimiToolCalls/parseQwenToolCalls/toolCallsToGlmXml change, something is wrong.
4. **Type-check must pass** — `npx tsc --noEmit index.ts` must exit 0.
5. **Preserve tool call token passthrough** — Do NOT remove or modify `skip_special_tokens: false` or `tool_choice: "none"` settings. They are required for tool call repair to work.

## File Ownership

| Task | Allowed | Forbidden |
|------|---------|-----------|
| Add stripControlTokens | `index.ts` — new function definition between splitBeforeTools and buildRepairedContent | `models.json`, `patch.json`, `custom-models.json`, `scripts/update-models.js`, any new file |
| Fix Qwen splitBeforeTools | `index.ts` — lines ~450-456 (Qwen branch in splitBeforeTools) | Same as above |
| Integrate into message_end | `index.ts` — lines ~580-600 (inside message_end handler, between splitBeforeTools and buildRepairedContent calls) | Same as above |

## Graph Context

- **Blast radius:** `index.ts` only — 1 file, 0 open beads on it
- **Related beads:** `omp-test-tool-call-parsers-8l6` (in progress, complementary — adds tests for parsers we're hardening), `omp-tool-call-repair-hardening-307` (closed, established the repair pipeline), `omp-model-metadata-defaults-m4k` (planned, separate track — no conflict)
- **File history:** 1 closed bead on index.ts (`omp-tool-call-repair-hardening-307`)
