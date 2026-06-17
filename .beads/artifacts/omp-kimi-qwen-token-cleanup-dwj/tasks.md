---
purpose: Task decomposition with dependency tracking for omp-kimi-qwen-token-cleanup-dwj
updated: 2026-06-17
---

# Tasks: omp-kimi-qwen-token-cleanup-dwj

## 1. Add stripControlTokens utility

### 1.1 Create `stripControlTokens` function

```yaml
depends_on: []
parallel: false
files: ["index.ts"]
estimated_minutes: 10
```

- [ ] Add `stripControlTokens(text: string): string` function after the existing `splitBeforeTools` function (~L465)
- [ ] Strip these exact vLLM control token strings: `<|im_start|>`, `<|im_end|>`, `<|endoftext|>`, `<|fim_prefix|>`, `<|fim_suffix|>`, `<|fim_middle|>`, `<|start_header_id|>`, `<|end_header_id|>`, `<|eot_id|>`
- [ ] Use a simple loop with `.replaceAll()` or a single regex with alternation (exact strings, not wildcards)
- [ ] Handle edge cases: empty string input → return empty; text with no tokens → return unchanged
- [ ] Add JSDoc comment documenting the function purpose
- [ ] Gate: `stripControlTokens` is importable/usable by downstream code

**Implementation pattern (reference from existing code):**
```typescript
const VLLM_CONTROL_TOKENS = [
  "<|im_start|>", "<|im_end|>", "<|endoftext|>",
  "<|fim_prefix|>", "<|fim_suffix|>", "<|fim_middle|>",
  "<|start_header_id|>", "<|end_header_id|>", "<|eot_id|>",
];

function stripControlTokens(text: string): string {
  let cleaned = text;
  for (const token of VLLM_CONTROL_TOKENS) {
    cleaned = cleaned.replaceAll(token, "");
  }
  return cleaned;
}
```

## 2. Fix Qwen bug + integrate cleanup

### 2.1 Fix Qwen `splitBeforeTools` offset bug

```yaml
depends_on: ["1.1"]
parallel: true
files: ["index.ts"]
estimated_minutes: 5
```

- [ ] In `splitBeforeTools`, Qwen branch (~L454): change `text.slice(0, idx).trimEnd()` to `cleaned.slice(0, idx).trimEnd()`
- [ ] This ensures the slice index matches the text it's slicing — `idx` from `cleaned.indexOf(...)` applied to `cleaned`, not `text`
- [ ] No other changes to `splitBeforeTools` — Kimi and GLM branches are correct
- [ ] Gate: Qwen splitBeforeTools branch returns `cleaned.slice(0, idx)` not `text.slice(0, idx)`

**Before (buggy):**
```typescript
const cleaned = text.replace(/█/g, "");
const idx = cleaned.indexOf("<function=");
return idx >= 0 ? text.slice(0, idx).trimEnd() : text;
```

**After (fixed):**
```typescript
const cleaned = text.replace(/█/g, "");
const idx = cleaned.indexOf("<function=");
return idx >= 0 ? cleaned.slice(0, idx).trimEnd() : text;
```

### 2.2 Integrate `stripControlTokens` into `message_end` handler

```yaml
depends_on: ["1.1"]
parallel: true  # with 2.1 (different region of file)
files: ["index.ts"]
estimated_minutes: 8
```

- [ ] In the `message_end` handler (~L566-L600), after computing `textBefore` via `splitBeforeTools`, call `stripControlTokens(textBefore)` and log the result
- [ ] Add `console.debug` logging: `makora: [<model>] stripped <N> control tokens from text prefix`
- [ ] Use cleaned `textBefore` when calling `buildRepairedContent`
- [ ] Gate: `grep` confirms `stripControlTokens(textBefore)` appears in `message_end` handler

**Integration point (conceptual diff):**
```typescript
const textBefore = splitBeforeTools(model, text);
// NEW:
const textBeforeCleaned = stripControlTokens(textBefore);
if (textBeforeCleaned.length !== textBefore.length) {
  console.debug(`makora: [${model}] stripped ${textBefore.length - textBeforeCleaned.length}B of control tokens from content prefix`);
}
const repaired = buildRepairedContent(content, parsed, textBeforeCleaned);
```

### 2.3 Add debug logging for token cleanup events

```yaml
depends_on: ["2.2"]
parallel: false
files: ["index.ts"]
estimated_minutes: 5
```

- [ ] Ensure `console.debug` log fires whenever tokens are stripped (in the message_end integration point)
- [ ] Log includes: model name, byte count stripped, token count (approximate)
- [ ] Gate: at least 1 new `console.debug` call for token cleanup (2 total new debugs: stripControlTokens output + integration log)

## 3. Verification

### 3.1 Type-check passes

```yaml
depends_on: ["2.3"]
parallel: true  # with 3.2
files: ["index.ts"]
estimated_minutes: 2
```

- [ ] `npx tsc --noEmit index.ts` passes with zero errors
- [ ] Gate: exit code 0

### 3.2 Regression check — existing code paths untouched

```yaml
depends_on: ["2.3"]
parallel: true  # with 3.1
files: ["index.ts"]
estimated_minutes: 5
```

- [ ] Verify `parseGlmToolCalls` unchanged (grep count == 1)
- [ ] Verify `parseKimiToolCalls` unchanged (grep count == 1)
- [ ] Verify `parseQwenToolCalls` unchanged (grep count == 1)
- [ ] Verify `toolCallsToGlmXml` unchanged (grep count == 1)
- [ ] Verify `rewriteVllmPayload` unchanged (no new model IDs added to sets)
- [ ] Verify `buildRepairedContent` signature unchanged (still takes same 3 args)
- [ ] Verify `context` hook GLM stripping unchanged
- [ ] Gate: all grep counts match expected values

### 3.3 Reasoning test suite passes (if API key available)

```yaml
depends_on: ["3.1"]
parallel: false
files: []
estimated_minutes: 10
```

- [ ] If `$MAKORA_OPTIMIZE_TOKEN` is set: `npx tsx test-reasoning.ts`
- [ ] All 7 models pass both turns (T1 reasoning present, T2 reasoning preserved)
- [ ] Gate: exit code 0 from test-reasoning.ts
- [ ] If no API key: skip this gate (marked as manual verification)
