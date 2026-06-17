---
purpose: Task decomposition with dependency tracking
updated: 2026-06-17
---

# Tasks: omp-test-tool-call-parsers-8l6

## Wave 1: Code Fixes (Parallel)

### 1.1 Fix `splitBeforeTools` Qwen index bug

```yaml
depends_on: []
parallel: true
conflicts_with: []
files: ["index.ts"]
estimated_minutes: 5
```

- [ ] In `splitBeforeTools`, Qwen branch: compute `idx` from original `text` (not `█`-cleaned text), then slice from original
- [ ] Current bug: `cleaned.indexOf("<function=")` gives wrong index when `█` appears before `<function=`, causing text to be trimmed from wrong position in the original string
- [ ] Fix: `const idx = text.indexOf("<function=")` on original text, `return idx >= 0 ? text.slice(0, idx).trimEnd() : text`

### 1.2 Wrap `loadJson` in try/catch with defaults

```yaml
depends_on: []
parallel: true
conflicts_with: []
files: ["index.ts"]
estimated_minutes: 10
```

- [ ] Wrap `loadJson` calls in the export default function in try/catch
- [ ] `custom-models.json` missing/corrupt → default to `[]`
- [ ] `patch.json` missing/corrupt → default to `{}`
- [ ] `models.json` missing/corrupt → re-throw (required file, should not default)
- [ ] Provider starts successfully with both optional files deleted

### 1.3 Add Kimi K2.7 Code to test-reasoning.ts MODELS array

```yaml
depends_on: []
parallel: true
conflicts_with: []
files: ["test-reasoning.ts"]
estimated_minutes: 5
```

- [ ] Add entry for `moonshotai/Kimi-K2.7-Code` matching existing model entry patterns
- [ ] Use `reasoning` as response field (same as Kimi K2.6)
- [ ] Use `chat_template_kwargs: { enable_thinking: true }` payload
- [ ] Name: "Kimi K2.7 Code"

## Wave 2: Test Runner (Sequential — single file)

### 2.1 Write `scripts/test-parsers.ts`

```yaml
depends_on: ["1.1", "1.2", "1.3"]
parallel: false
conflicts_with: []
files: ["scripts/test-parsers.ts"]
estimated_minutes: 30
```

- [ ] Write zero-dependency test runner with inline parser functions (import from index.ts via dynamic import or inline)
- [ ] Test: `parseGlmToolCalls` — single tool call, multiple tool calls, empty input, whitespace-only, no markers
- [ ] Test: `parseGlmToolCalls` — malformed JSON in one call (other still extracted)
- [ ] Test: `parseKimiToolCalls` — single, multiple, empty, whitespace, no markers, malformed JSON
- [ ] Test: `parseQwenToolCalls` — single, multiple, empty, whitespace, no markers, malformed JSON
- [ ] Test: `parseQwenToolCalls` — `█` delimiter variants (before first call, between calls, after last call)
- [ ] Test: `toolCallsToGlmXml` → `parseGlmToolCalls` round-trip
- [ ] Test: `splitBeforeTools` — GLM, Kimi, Qwen with tool markers present
- [ ] Test: `splitBeforeTools` — GLM, Kimi, Qwen with NO tool markers (returns full text)
- [ ] Test: `splitBeforeTools` Qwen — `█` before `<function=` (verifies fix from 1.1)
- [ ] Test: `buildRepairedContent` — non-text blocks preserved, textBeforeTools placed, tool calls appended
- [ ] Test: `hasToolCallBlocks` — true/false cases
- [ ] Assert helper: `assert(condition, message)` with pass/fail counting
- [ ] Exit code 0 on all-pass, 1 on any failure
- [ ] Run with `npx tsx scripts/test-parsers.ts`

## Verification

### 3.1 Full verification

```yaml
depends_on: ["2.1"]
parallel: false
```

- [ ] `npx tsx scripts/test-parsers.ts` — all 20+ tests pass
- [ ] `npx tsc --noEmit index.ts test-reasoning.ts scripts/test-parsers.ts` — no type errors
- [ ] Delete `custom-models.json`, verify provider loads (or at minimum type-check passes)
- [ ] Delete `patch.json`, verify provider loads (or at minimum type-check passes)
