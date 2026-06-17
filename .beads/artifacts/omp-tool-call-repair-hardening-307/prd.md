---
purpose: Product Requirements Document for a bead
updated: 2026-06-17
---

# PRD: Add diagnostic logging and production hardening for tool call repair

**Bead:** omp-tool-call-repair-hardening-307 | **Type:** task | **Priority:** P1
**Created:** 2026-06-17 | **Estimate:** 35 min

## Problem

WHEN a model changes its tool call output format OR the parser regex fails to match THEN tool calls are silently swallowed BECAUSE all three parsers (`parseGlmToolCalls`, `parseKimiToolCalls`, `parseQwenToolCalls`) catch `JSON.parse` errors with empty `catch` blocks and return empty arrays — no diagnostic is ever emitted. Users and developers have zero visibility into tool call repair failures.

Additionally, the `zaiToolStream` feature is documented in README and configured in `patch.json` (`"zaiToolStream": true` for GLM 5.1) but is **never implemented** in `index.ts`. The `before_provider_request` hook never sets `tool_stream: true`, so GLM's vLLM streaming parser never uses the explicit tool streaming path. This means GLM tool calls always arrive as raw text, even though the documented approach would make vLLM emit proper `delta.tool_calls` chunks.

Tool call ID generation also has a latent collision risk: it uses `Date.now()` + `Math.random().toString(36).slice(2, 8)`. In rapid-fire tool calling (multiple calls within the same millisecond), IDs can collide, causing downstream tool result routing failures.

**Who is affected?** All users of GLM 5.1, Kimi K2.6, Kimi K2.7 Code, Qwen 3.6 27B, Qwen 3.6 35B — the 5 models relying on client-side tool call repair.

**Why now?** The existing bead (omp-test-tool-call-parsers-8l6) adds test coverage but tests only catch format drift at CI time. Production needs runtime diagnostics so field failures are detectable. The `zaiToolStream` gap is a documented feature that doesn't work — fixing it unlocks the intended GLM streaming path.

## Scope

### In Scope
- Add `console.warn`/`console.debug` diagnostics to all three parser functions when:
  - `JSON.parse` fails on a tool call arguments block (warn with model name + raw args snippet)
  - The full regex scan produced zero matches (debug — normal for non-tool messages)
- Fix `zaiToolStream`: add `tool_stream: true` in `rewriteVllmPayload` for GLM 5.1 when `zaiToolStream` compat flag is set
- Replace `Date.now()` + `Math.random()` tool call ID generation with `crypto.randomUUID()`
- Add early-return guard in `parseToolCallsFromText`: skip regex scan when text doesn't contain known tool call markers (check string includes for GLM/Kimi/Qwen markers)
- Ensure `console.warn` messages are concise and actionable (truncate raw args to 200 chars, include model ID)

### Out of Scope
- Changing parser regex patterns (format drift fix is a separate task)
- Streaming accumulator for tool call tokens (separate UX bead)
- Integration tests requiring live Makora API
- Changing the `context` hook (GLM tool_calls strip — working correctly)
- Adding structured logging or telemetry

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | Console.warn on JSON.parse failure | MUST | When a parser encounters malformed JSON in tool call args, `console.warn` fires with model name + truncated raw args |
| 2 | Console.debug on zero-match parse | SHOULD | When scanning text with no tool call markers, `console.debug` fires once with model name (surfaces silent no-ops) |
| 3 | zaiToolStream: tool_stream:true payload rewrite | MUST | GLM 5.1 requests include `tool_stream: true` in the request body; no-op for other models |
| 4 | crypto.randomUUID() for tool call IDs | MUST | `buildRepairedContent` uses `crypto.randomUUID()` instead of `Date.now() + Math.random()` |
| 5 | Early-return guard in parseToolCallsFromText | SHOULD | If text doesn't contain `<tool_call>`, `<|tool_call_begin|>`, or `<function=`, skip regex scan and return `[]` immediately |
| 6 | No regression to existing tool call repair | MUST | Existing unit tests (from omp-test-tool-call-parsers-8l6) continue to pass; no format changes to parser logic |
| 7 | TypeScript compiles cleanly | MUST | `npx tsc --noEmit index.ts` passes with zero errors |

## Technical Context

**Key files:**
- `index.ts`: `rewriteVllmPayload` (add zaiToolStream), `buildRepairedContent` (UUID IDs), `parseToolCallsFromText` (early return), all three parsers (diagnostics)
- `patch.json`: GLM 5.1 has `"zaiToolStream": true` in `compat` — current dead config

**zaiToolStream target code path (index.ts ~line 210-225):**
```typescript
// Current state: DISABLE_TOOL_CHOICE_MODELS block handles Kimi/Qwen
// Missing: GLM zaiToolStream check to add tool_stream: true
```

**Parser diagnostic injection points:**
- `parseGlmToolCalls` — `catch` block after `JSON.parse(rawArgs)`
- `parseKimiToolCalls` — `catch` block after `JSON.parse(rawArgs)`  
- `parseQwenToolCalls` — `catch` block after `JSON.parse(rawArgs)`
- `parseToolCallsFromText` — before regex scan, check for known markers

**Tool call ID generation (index.ts ~line 360-365):**
```typescript
// Current:
id: `call_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`
// Target: 
import { randomUUID } from "node:crypto";
id: `call_${randomUUID()}`
```

## Approach

Four surgical changes to `index.ts`:

1. **zaiToolStream**: In `rewriteVllmPayload`, add a check: if model is in TOOL_CALL_REPAIR_MODELS AND the model's patch compat has `zaiToolStream: true`, set `p.tool_stream = true`. This requires passing model compat info or hardcoding the GLM ID check. Simplest: check `model === GLM_5_1_ID` (it's the only model with zaiToolStream).

2. **Diagnostics**: In each parser's catch block, emit `console.warn("makora: failed to parse tool call for [model]", rawArgs.slice(0, 200))`. After the regex loop in `parseToolCallsFromText`, if the chosen parser returned empty but text had markers, emit `console.debug`.

3. **UUID IDs**: Add `import { randomUUID } from "node:crypto"` at top. Replace the Date.now() + random concatenation with `randomUUID()`.

4. **Early return**: In `parseToolCallsFromText`, before branching to model-specific parsers, check for marker strings. If none found, return `[]` immediately. This avoids unnecessary regex execution.

**Alternatives considered:**
- **Custom logger/winston** — Rejected. Zero-dependency philosophy. `console.warn`/`console.debug` is sufficient.
- **Structured event emissions** — Rejected. pi SDK doesn't expose a logging/event API for plugins. Console is the standard Node.js approach.
- **model compat lookup in rewriteVllmPayload** — Rejected for simplicity. Only one model uses zaiToolStream; hardcoding GLM_5_1_ID is clearer than plumbing compat through the hook.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `randomUUID` not available in older Node | Low | Medium | Node 19+ has `crypto.randomUUID()`; pi requires Node 24+. No issue. |
| console.warn in hot path (streaming) | Low | Low | Parser only runs on `message_end`, not per-chunk. Single warn per message. |
| tool_stream:true breaks non-GLM models | None | N/A | Hardcoded to GLM_5_1_ID only |
| Early-return guard false-negatives on alternate markers | Low | Low | Marker strings are unique to each model format; very unlikely to miss |

## Success Criteria

- [ ] `npx tsc --noEmit index.ts` passes
    - Verify: no type errors
- [ ] GLM 5.1 requests include `tool_stream: true` in payload
    - Verify: inspect `rewriteVllmPayload` output with GLM model + tools
- [ ] Tool call IDs use UUID format (e.g., `call_f47ac10b-58cc-4372-a567-0e02b2c3d479`)
    - Verify: grep `buildRepairedContent` for `randomUUID`
- [ ] `console.warn` fires on malformed JSON in any parser
    - Verify: unit test (from existing bead) exercises malformed JSON → warn appears
- [ ] `console.debug` fires once per message when text has no tool markers
    - Verify: confirm debug log appears for non-tool assistant messages for repair models
- [ ] No regression in existing test suite
    - Verify: `npx tsx scripts/test-parsers.ts` exits 0
