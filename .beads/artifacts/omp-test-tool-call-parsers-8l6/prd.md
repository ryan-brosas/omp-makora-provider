---
purpose: Product Requirements Document for a bead
updated: 2026-06-17
---

# PRD: Add test coverage for tool call parsers and fix edge cases

**Bead:** omp-test-tool-call-parsers-8l6 | **Type:** task | **Priority:** P1
**Created:** 2026-06-17 | **Estimate:** 45 min

## Problem

WHEN Makora updates vLLM or a model's tool call output format changes THEN tool call repair silently breaks BECAUSE the three parser functions (`parseGlmToolCalls`, `parseKimiToolCalls`, `parseQwenToolCalls`) are regex-based with no test coverage, and JSON parse errors are silently swallowed.

Additionally, `loadJson()` has no error handling (crashes provider on startup if JSON files are missing/corrupt), and `splitBeforeTools()` for Qwen has a subtle text index inconsistency when `█` delimiters appear.

**Who is affected?** All users of GLM 5.1, Kimi K2.6, Kimi K2.7, Qwen 3.6 27B, Qwen 3.6 35B — the 5 models relying on client-side tool call repair.

**Why now?** Tool calling is a critical feature. Silent failures mean broken agent workflows with no diagnostic. Tests are a prerequisite for confidence in any future changes to the parser pipeline.

## Scope

### In Scope
- Unit tests for `parseGlmToolCalls` with real GLM tool call output
- Unit tests for `parseKimiToolCalls` with real Kimi tool call output
- Unit tests for `parseQwenToolCalls` with real Qwen tool call output (including `█` delimiter variants)
- Unit test for `toolCallsToGlmXml` round-trip (parse → XML → parse)
- Unit tests for `splitBeforeTools` with edge cases (empty text, no tool markers, only tool markers)
- Unit tests for `buildRepairedContent` and `hasToolCallBlocks`
- Fix `splitBeforeTools` Qwen: use original text index, not cleaned text index
- Wrap `loadJson` calls in try/catch with sensible defaults
- Add Kimi K2.7 Code to `test-reasoning.ts` MODELS array
- Write `scripts/test-parsers.ts` as the test runner (zero-dependency, runs with `npx tsx`)

### Out of Scope
- Integration tests requiring live Makora API
- Changing parser logic (regex patterns, tool call ID generation)
- Adding CI/CD pipeline
- Testing `rewriteVllmPayload` (covered indirectly by test-reasoning.ts)
- Testing the `context` hook (GLM tool_calls strip)

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | GLM parser tests pass with real output | MUST | parseGlmToolCalls correctly extracts name + args from `<tool_call>` XML; handles multiple tool calls in one text block |
| 2 | Kimi parser tests pass with real output | MUST | parseKimiToolCalls correctly extracts name + args from `<|tool_call_begin|>...<|tool_call_end|>` tokens |
| 3 | Qwen parser tests pass with real output | MUST | parseQwenToolCalls correctly handles `<function=name>...` XML with and without `█` delimiters |
| 4 | GLM round-trip test passes | MUST | `parseGlmToolCalls(toolCallsToGlmXml(calls))` produces identical tool calls |
| 5 | Edge case: empty input returns empty array | MUST | All parsers return `[]` for empty string, whitespace-only, or text with no tool markers |
| 6 | Edge case: malformed JSON is skipped | MUST | Parsers skip individual malformed tool calls without crashing; well-formed calls in same text are still extracted |
| 7 | Edge case: multiple tool calls in one message | MUST | All parsers extract all tool calls, not just the first |
| 8 | splitBeforeTools: no false text trimming | MUST | Text before tool markers is preserved correctly; text with no markers returns unchanged |
| 9 | splitBeforeTools Qwen bug fixed | MUST | Index computed from original text, not `█`-cleaned text |
| 10 | loadJson gracefully handles missing files | MUST | Missing `custom-models.json` → `[]`, missing `patch.json` → `{}`; provider starts without crashing |
| 11 | Kimi K2.7 Code added to test-reasoning.ts | MUST | MODELS array includes `moonshotai/Kimi-K2.7-Code` entry matching existing pattern |
| 12 | All tests pass with `npx tsx scripts/test-parsers.ts` | MUST | Zero-dependency test runner, exit code 0 on success |

## Technical Context

**Key files:**
- `index.ts` (lines 1-475): Contains all parser functions, loadJson, splitBeforeTools, buildRepairedContent
- `scripts/test-parsers.ts` (NEW): Test runner with inline test cases
- `test-reasoning.ts` (line ~80-105): MODELS array to add Kimi K2.7 Code

**Parser function signatures:**
```typescript
parseGlmToolCalls(text: string): ParsedToolCall[]
parseKimiToolCalls(text: string): ParsedToolCall[]
parseQwenToolCalls(text: string): ParsedToolCall[]
toolCallsToGlmXml(toolCalls: Array<{name: string, arguments: Record<string, unknown>}>): string
splitBeforeTools(model: string, text: string): string
buildRepairedContent(original: ContentBlock[], parsed: ParsedToolCall[], textBeforeTools: string): ContentBlock[]
```

**Test patterns to cover:**
- GLM: `<tool_call>\n<tool_name>read</tool_name>\n<parameters>{"path":"/foo"}</parameters>\n</tool_call>`
- Kimi: `<|tool_call_begin|>read\n{"path":"/foo"}<|tool_call_end|>`
- Qwen: `<function=read>{"path":"/foo"}</function>` and with `█` delimiters between multiple calls
- GLM round-trip: parse → XML → parse produces identical results

## Approach

Write a zero-dependency test runner at `scripts/test-parsers.ts` that:
1. Imports (or inlines) the parser functions from `index.ts`
2. Uses a simple assertion helper (`assert(condition, message)`)
3. Runs named test cases with pass/fail counting
4. Exits with code 0 on all-pass, 1 on any failure

This avoids adding a test framework dependency while providing comprehensive coverage.

**Alternatives considered:**
- **Vitest** — Rejected. Adds a dependency for a single-file plugin. Zero-dependency keeps the plugin installable without `npm install`.
- **Node test runner** — Rejected. Requires Node 18+ with `--experimental-test-runner` and different import semantics.
- **Inline tests in index.ts** — Rejected. Pollutes the production file with test code.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Parser regex doesn't match actual model output | Low | High | Use examples from README vLLM caveats section and known patterns |
| Test file can't import from index.ts (ESM path issues) | Medium | Medium | Use `import()` with `file://` URL or inline the parser functions |
| Qwen `█` delimiter appears before first `<function=` | Low | Low | Test with `█` before, between, and after function blocks |

## Success Criteria

- [ ] `npx tsx scripts/test-parsers.ts` passes all 20+ test cases with exit code 0
- [ ] `npx tsx test-reasoning.ts` includes Kimi K2.7 Code and all 8 models pass
- [ ] Provider starts successfully with `custom-models.json` deleted (graceful default to `[]`)
- [ ] Provider starts successfully with `patch.json` deleted (graceful default to `{}`)
- [ ] `splitBeforeTools` for Qwen correctly handles text with `█` before `<function=`
    - Verify: unit test with `"█pre text<function=..."` input
