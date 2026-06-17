---
purpose: Task decomposition with dependency tracking
updated: 2026-06-17
---

# Tasks: omp-tool-call-repair-hardening-307

## Wave 1: Parallel Code Changes (all in index.ts)

### 1.1 Fix zaiToolStream — add `tool_stream: true` for GLM 5.1

```yaml
depends_on: []
parallel: true
conflicts_with: []
files: ["index.ts"]
estimated_minutes: 10
```

- [ ] In `rewriteVllmPayload`, after the `DISABLE_TOOL_CHOICE_MODELS` block, add a new block for zaiToolStream
- [ ] Check: if `model === GLM_5_1_ID`, set `p.tool_stream = true`
- [ ] This forces vLLM to use the explicit tool streaming path for GLM, emitting proper `delta.tool_calls` instead of raw XML text
- [ ] The `message_end` hook still handles raw text as a fallback (if tool_stream doesn't work on some vLLM builds)
- [ ] No other models affected (only GLM_5_1_ID has `zaiToolStream: true` in patch.json)

### 1.2 Replace Date.now() + Math.random() with crypto.randomUUID()

```yaml
depends_on: []
parallel: true
conflicts_with: []
files: ["index.ts"]
estimated_minutes: 5
```

- [ ] Add `import { randomUUID } from "node:crypto";` to imports at top of index.ts
- [ ] In `buildRepairedContent`, replace `id: \`call_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}\`` with `id: \`call_${randomUUID()}\``
- [ ] UUID v4 format eliminates collision risk in rapid-fire tool calling
- [ ] Remove `i` from the ID construction (UUID is unique per call, don't need index disambiguation)

### 1.3 Add early-return guard in parseToolCallsFromText

```yaml
depends_on: []
parallel: true
conflicts_with: []
files: ["index.ts"]
estimated_minutes: 5
```

- [ ] In `parseToolCallsFromText`, before the if/else chain, add a guard:
  ```typescript
  // Early return: skip regex scan if text lacks tool call markers
  if (!text.includes("<tool_call>") && !text.includes("<|tool_call_begin|>") && !text.includes("<function=")) {
    return [];
  }
  ```
- [ ] This avoids unnecessary regex execution on non-tool assistant messages (performance optimization)
- [ ] All three markers checked: GLM (`<tool_call>`), Kimi (`<|tool_call_begin|>`), Qwen (`<function=`)
- [ ] Ensures no false negatives — if any marker is present, we fall through to regex

### 1.4 Add diagnostic logging to parser functions

```yaml
depends_on: []
parallel: true
conflicts_with: []
files: ["index.ts"]
estimated_minutes: 15
```

- [ ] In `parseGlmToolCalls`: in the `catch` block after `JSON.parse(rawArgs)`, add:
  ```typescript
  console.warn(`makora: [GLM 5.1] failed to parse tool call args: ${rawArgs.slice(0, 200)}`);
  ```
- [ ] In `parseKimiToolCalls`: in the `catch` block after `JSON.parse(rawArgs)`, add:
  ```typescript
  console.warn(`makora: [Kimi] failed to parse tool call args: ${rawArgs.slice(0, 200)}`);
  ```
- [ ] In `parseQwenToolCalls`: in the `catch` block after `JSON.parse(rawArgs)`, add:
  ```typescript
  console.warn(`makora: [Qwen] failed to parse tool call args: ${rawArgs.slice(0, 200)}`);
  ```
- [ ] After each parser's while loop, if `results.length === 0` and the text had markers, emit `console.debug`:
  ```typescript
  // After regex loop in each parser:
  if (results.length === 0) {
    console.debug(`makora: [model name] no tool calls extracted from text (${text.length}B)`);
  }
  ```
- [ ] In `parseToolCallsFromText`: if the chosen parser returns `[]` and the original text had markers, emit `console.debug`:
  ```typescript
  const parsed = parseToolCallsFromText(model, text);
  if (parsed.length === 0) {
    console.debug(`makora: [${model}] tool call repair returned empty — raw text may contain unrecognized format`);
  }
  ```
  Wait — this last one belongs in the `message_end` hook caller, not in `parseToolCallsFromText` itself. Place it in `message_end` after the parse call.
- [ ] All `console.warn` messages truncate raw args to 200 chars to avoid log flooding
- [ ] All messages are prefixed with `makora:` for easy log filtering

## Wave 2: Verification

### 2.1 Full verification

```yaml
depends_on: ["1.1", "1.2", "1.3", "1.4"]
parallel: false
```

- [ ] `npx tsc --noEmit index.ts` — no type errors
- [ ] Verify `randomUUID` import and usage:
  ```bash
  grep -n "randomUUID" index.ts
  # Expected: import line + usage in buildRepairedContent
  ```
- [ ] Verify zaiToolStream:
  ```bash
  grep -n "tool_stream" index.ts
  # Expected: p.tool_stream = true in rewriteVllmPayload GLM block
  ```
- [ ] Verify diagnostics present:
  ```bash
  grep -c "console.warn" index.ts
  # Expected: 3 (one per parser)
  grep -c "console.debug" index.ts
  # Expected: 3+ (one per parser, one in message_end)
  ```
- [ ] Verify early-return guard:
  ```bash
  grep -A3 "Early return" index.ts
  # Expected: guard block with marker string includes checks
  ```
- [ ] Run existing tests if available:
  ```bash
  npx tsx scripts/test-parsers.ts 2>/dev/null || echo "Test runner not yet available (from omp-test-tool-call-parsers-8l6)"
  ```
- [ ] Manual sanity: review each changed section for correctness
