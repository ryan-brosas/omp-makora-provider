# Solve Ledger: omp-tool-call-repair-hardening-307

## Wave 1: Parallel code changes (2026-06-17)

### 1.1 zaiToolStream fix ✅
- Added `p.tool_stream = true` for `GLM_5_1_ID` in `rewriteVllmPayload`
- Located after `DISABLE_TOOL_CHOICE_MODELS` block, before `return p`
- Verified: `grep -n "tool_stream" index.ts` shows assignment at line 343

### 1.2 UUID via crypto.randomUUID() ✅
- Added `import { randomUUID } from "node:crypto"` to imports (line 64)
- Replaced `Date.now() + Math.random()` ID in `buildRepairedContent` with `randomUUID()` (line 500)
- Removed `i` index from ID construction

### 1.3 Early-return guard ✅
- Added guard in `parseToolCallsFromText` checking 3 marker strings
- Guards against: `<tool_call>`, `<|tool_call_begin|>`, `<function=`
- Returns `[]` immediately if none found

### 1.4 Diagnostic logging ✅
- 3x `console.warn` in catch blocks (GLM, Kimi, Qwen) — truncated to 200 chars
- 3x `console.debug` after parser while loops for empty results
- 1x `console.debug` in `message_end` handler after parse returns empty
- All prefixed with `makora:` for log filtering

## Verification
- `grep -n "randomUUID" index.ts` → import (64) + usage (500) ✅
- `grep -n "tool_stream" index.ts` → assignment (343) ✅
- `grep -c "console.warn" index.ts` → 3 (one per parser) ✅
- `grep -c "console.debug" index.ts` → 4 (3 parsers + message_end) ✅
- `grep -A3 "Early return" index.ts` → guard with all 3 markers ✅
- Project has no tsconfig/build steps (extension evaluated at runtime)
- Test runner `scripts/test-parsers.ts` not yet available (depends on omp-test-tool-call-parsers-8l6)
