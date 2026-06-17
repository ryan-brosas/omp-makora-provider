# Tasks: omp-test-tool-call-parsers-8l6

## Wave 1: Parser unit tests (parallel-safe, no deps)

### T1.1 — parseGlmToolCalls tests
- [ ] Single tool call: `<tool_call>\n<tool_name>read</tool_name>\n<parameters>{"path":"/foo"}</parameters>\n</tool_call>`
- [ ] Multiple tool calls in one text block
- [ ] No tool call markers → empty array
- [ ] Empty string input → empty array
- [ ] Malformed JSON in parameters → skipped (no crash)
- [ ] Real-world GLM output example

### T1.2 — parseKimiToolCalls tests
- [ ] Single tool call: `<|tool_call_begin|>read\n{"path":"/foo"}<|tool_call_end|>`
- [ ] Multiple tool calls in one text block
- [ ] No tool call markers → empty array
- [ ] Empty string input → empty array
- [ ] Malformed JSON in args → skipped (no crash)
- [ ] Real-world Kimi output example

### T1.3 — parseQwenToolCalls tests
- [ ] Single tool call: `<function=read>{"path":"/foo"}</function>`
- [ ] Multiple tool calls separated by `█` delimiter
- [ ] Multiple tool calls without delimiter
- [ ] No tool call markers → empty array
- [ ] Empty string input → empty array
- [ ] Malformed JSON in args → skipped (no crash)
- [ ] `█` before first function call → still parses correctly
- [ ] Real-world Qwen output example

### T1.4 — GLM round-trip test
- [ ] Parse GLM XML → convert to tool calls → convert back to XML → parse again → identical tool calls

### T1.5 — splitBeforeTools tests
- [ ] GLM: text before `<tool_call>` is preserved, tool marker text is trimmed
- [ ] Kimi: text before `<|tool_call_begin|>` is preserved
- [ ] Qwen: text before `<function=` is preserved (with and without `█`)
- [ ] Text with no tool markers → returns original text unchanged
- [ ] Text starting with tool marker → returns empty string
- [ ] Qwen: `█` in text before first `<function=` → correctly handled

### T1.6 — buildRepairedContent + hasToolCallBlocks tests
- [ ] hasToolCallBlocks true when content has toolCall block
- [ ] hasToolCallBlocks false for text-only content
- [ ] buildRepairedContent: text blocks replaced, non-text preserved, tool calls appended
- [ ] buildRepairedContent: content with only tool calls (no pre-text)

## Wave 2: Code fixes

### T2.1 — Fix splitBeforeTools Qwen
- [ ] Use original text index for slice, not cleaned text
- [ ] Test passes with `█` before `<function=` case

### T2.2 — Graceful loadJson error handling
- [ ] Missing custom-models.json → defaults to []
- [ ] Missing patch.json → defaults to {}
- [ ] Missing models.json → logs error (this is fatal)
- [ ] Malformed JSON → logs warning, uses default

## Wave 3: Integration + verification

### T3.1 — Add Kimi K2.7 Code to test-reasoning.ts
- [ ] Add `moonshotai/Kimi-K2.7-Code` entry to MODELS array
- [ ] Matches Kimi K2.6 NVFP4 pattern (reasoningResponseField: "reasoning", enable_thinking payload)

### T3.2 — Run full test suite
- [ ] `npx tsx scripts/test-parsers.ts` exits 0

### T3.3 — Provider graceful startup verification
- [ ] Move custom-models.json aside → provider starts
- [ ] Move patch.json aside → provider starts

### T3.4 — Final review
- [ ] All 12 PRD acceptance criteria confirmed
