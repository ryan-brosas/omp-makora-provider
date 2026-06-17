---
purpose: Context capsule — key facts for future sessions
updated: 2026-06-17
---

# Context Capsule: omp-tool-call-repair-hardening-307

## What we're doing

Adding production hardening to the tool call repair pipeline in omp-makora-provider:

1. **Missing zaiToolStream**: GLM 5.1 `patch.json` has `"zaiToolStream": true` but `rewriteVllmPayload` never sets `tool_stream: true`. Fix: add `p.tool_stream = true` for GLM_5_1_ID.
2. **Silent parse failures**: All three parsers (GLM, Kimi, Qwen) catch `JSON.parse` errors silently. Fix: add `console.warn` with truncated raw args.
3. **Fragile IDs**: `Date.now() + Math.random()` for tool call IDs. Fix: `crypto.randomUUID()`.
4. **Unnecessary regex**: Every assistant message for repair models gets regex scanned. Fix: early-return guard checking for known marker strings.

## Key files
- `index.ts` — all changes
- Worktree: `/home/ryan/repos/omp-makora-provider-omp-tool-call-repair-hardening-307`

## Dependencies
- Upstream: `omp-test-tool-call-parsers-8l6` (adds parser tests — our changes are additive)
- Downstream: none

## Verification
- `npx tsc --noEmit index.ts`
- `grep` for randomUUID, tool_stream, console.warn, console.debug
- Existing test runner from prior bead (when available)
