---
purpose: Task decomposition with dependency tracking
updated: 2026-06-17
---

# Tasks: omp-ei6

## Task Metadata

```yaml
bead: omp-ei6
total_estimated_minutes: 30
wave_count: 1
```

## Wave 1: Implementation

### 1.1 Add tool-presence guard in rewriteVllmPayload

```yaml
depends_on: []
parallel: false
files: ["index.ts"]
estimated_minutes: 10
```

**Current code** (~line 255, inside `rewriteVllmPayload`):
```typescript
// Kimi K2.6 / K2.7 / Qwen 3.6: vLLM streaming tool_choice is broken.
// Disable native tool_choice and let raw tokens through as text.
if (DISABLE_TOOL_CHOICE_MODELS.has(model)) {
    p.tool_choice = "none";
    p.skip_special_tokens = false;
}
```

**Target code:**
```typescript
// Kimi K2.6 / K2.7 / Qwen 3.6: vLLM streaming tool_choice is broken.
// When tools are present, disable native tool_choice and let raw tokens
// through as text for client-side repair. For normal chat (no tools),
// let vLLM handle the response natively — no special token leakage.
if (DISABLE_TOOL_CHOICE_MODELS.has(model)) {
    const hasTools = Array.isArray(p.tools) && (p.tools as unknown[]).length > 0;
    if (hasTools) {
        p.tool_choice = "none";
        p.skip_special_tokens = false;
    }
}
```

- [ ] Replace the unconditional block with the conditional block
- [ ] Ensure existing comments are preserved and updated
- [ ] Verify the `hasTools` variable name is clear and self-documenting

### 1.2 Type-check

```yaml
depends_on: ["1.1"]
parallel: false
estimated_minutes: 5
```

- [ ] Run `npx tsc --noEmit index.ts`
- [ ] Confirm zero errors
- [ ] If errors: fix type annotations, retry

### 1.3 Manual verification

```yaml
depends_on: ["1.2"]
parallel: false
estimated_minutes: 15
```

- [ ] Verify the code change visually — read the modified `rewriteVllmPayload` function
- [ ] Trace the two code paths:
    - **No tools:** `DISABLE_TOOL_CHOICE_MODELS.has(model)` → true → `hasTools` → false → skip override → payload unchanged
    - **Tools present:** `DISABLE_TOOL_CHOICE_MODELS.has(model)` → true → `hasTools` → true → set tool_choice="none" + skip_special_tokens=false
- [ ] Confirm no other blocks in `rewriteVllmPayload` are affected:
    - DS_VLLM_MODELS block (unchanged)
    - ENABLE_THINKING_VLLM_MODELS block (unchanged)
    - GLM tool_stream block (unchanged — separate from DISABLE_TOOL_CHOICE_MODELS)
- [ ] Verify `stripControlTokens` is still present as a safety net (should be — no changes to it)
- [ ] Run git diff to confirm only the intended lines changed

## Completion Evidence

When all tasks are checked:
1. `git diff` shows only the conditional guard addition in `index.ts`
2. `npx tsc --noEmit index.ts` exits 0
3. Manual logic review confirms both code paths are correct
4. Existing tests pass (test-reasoning.ts, if API key available)
