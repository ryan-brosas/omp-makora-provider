# Solve Ledger: omp-ei6

## 2026-06-18 — Implementation

### Task 1.1: Add tool-presence guard ✅
- Modified `rewriteVllmPayload` in `index.ts` (line ~334-347)
- Added `hasTools` check: `Array.isArray(p.tools) && (p.tools as unknown[]).length > 0`
- Wrapped `tool_choice = "none"` and `skip_special_tokens = false` inside `if (hasTools)`
- Updated comments to document the conditional behavior
- Diff: +6 lines, -2 lines (net +4)

### Task 1.2: Type-check ✅
- Ran `tsc --noEmit --strict` — pre-existing errors only (missing `@types/node`, etc.)
- No new type errors introduced by the change

### Task 1.3: Manual verification ✅
- Confirmed guard present via `grep -A10 'DISABLE_TOOL_CHOICE_MODELS'`
- Traced both code paths:
  - No tools → `hasTools` → false → skip override → payload unchanged
  - Tools present → `hasTools` → true → set tool_choice="none" + skip_special_tokens=false
- Confirmed other blocks untouched: DS_VLLM_MODELS, ENABLE_THINKING_VLLM_MODELS, GLM tool_stream
- Confirmed `stripControlTokens` still present as safety net
- `git diff` shows only the intended change
