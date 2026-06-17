---
purpose: Product Requirements Document for a bead
updated: 2026-06-17
---

# PRD: Strip leaked GLM 5.1 chain-of-thought content markers from assistant messages

**Bead:** omp-o3l | **Type:** bug | **Priority:** P1
**Created:** 2026-06-17 | **Estimate:** 60

## Problem

WHEN vLLM's GLM reasoning parser (glm45) fails to properly separate thinking content from actual response THEN the GLM 5.1 chat template markers ` thinking` and ` response` leak into the assistant's `content` field BECAUSE the vLLM server build on Makora may not have the reasoning parser configured correctly (see vllm-project/vllm#31319).

**Who is affected?** Any user of the GLM 5.1 FP8 model on Makora. The leaked markers appear as literal text in the assistant's response, along with the model's internal chain-of-thought. This pollutes the visible conversation and can cause downstream issues when the contaminated content is fed back as context in multi-turn conversations.

**Why now?** The provider code already acknowledges this issue (comment in index.ts line 29-31: "vLLM may leak chain-of-thought into content instead of the reasoning field on some builds"). The `message_end` hook already processes GLM assistant messages for tool call repair — adding CoT marker stripping at the same point is a natural, low-risk extension. Without this fix, GLM 5.1 users get degraded output quality.

## Scope

### In Scope
- Detect and strip the ` thinking` and ` response` content markers from GLM 5.1 assistant message content when they leak
- Extract leaked thinking content from between the markers and move it to the proper `reasoning_content` field if it exists
- Integrate with the existing `message_end` hook alongside tool call repair
- Unit tests covering: markers present (both), markers absent (normal case), only ` thinking` present (partial leak), only ` response` present, markers with tool calls interleaved

### Out of Scope
- Non-GLM models (the markers are GLM chat template specific)
- Server-side fix (can't control Makora's vLLM build)
- Streaming path separate logic (non-streaming only; streaming already handled differently)
- Tool call parsing — already handled by existing `parseGlmToolCalls`
- GLM 4.7 or other GLM family models (only GLM 5.1 FP8 is on Makora)

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | Strip ` thinking` and ` response` markers from GLM 5.1 assistant `content` when they leak | MUST | Content passed to downstream consumers contains no ` thinking` or ` response` markers |
| 2 | Move leaked thinking content to `reasoning_content` field | MUST | When `thinking` content is extracted, it populates `reasoning_content` on the message |
| 3 | Do NOT strip markers from non-GLM models | MUST | Messages from DeepSeek, Kimi, Qwen, etc. pass through unchanged |
| 4 | Integrate with existing `message_end` hook | MUST | CoT stripping happens in same hook as tool call repair; no additional hook overhead |
| 5 | Handle edge cases: partial leaks, markers embedded in code blocks, empty thinking | SHOULD | No crash, no corrupted content, graceful fallback |
| 6 | Tests cover all marker presence patterns | MUST | ≥6 test cases: both markers present, neither present, thinking-only, response-only, thinking with tool calls, empty thinking between markers |

## Technical Context

**Key files:**
- `index.ts` — Main provider file. Existing `message_end` hook at ~line 590 handles GLM tool call repair. Existing `stripControlTokens` at ~line 540 provides a pattern for text cleanup.
- `test-reasoning.ts` — Integration test for multi-turn reasoning. May need updates if content cleaning changes behavior.
- `models.json` — Model definitions (GLM 5.1: `zai-org/GLM-5.1-FP8`)
- `patch.json` — GLM 5.1 has `reasoning: true`, `thinkingFormat: "qwen-chat-template"`, returns `reasoning_content`

**GLM chat template markers:** The GLM family chat template uses:
- `<|assistant|>  thinking` — assistant prefix + thinking start marker (tokenized as " thinking" with leading space)
- ` response` — thinking-to-response transition marker (with leading space)

These are modeled on DeepSeek's `</think>` pattern but specific to GLM's chat template.

**Existing patterns to follow:**
- `stripControlTokens()` — Exact string matching, no regex. Simple replacement loop.
- `parseGlmToolCalls()` — Regex-based extraction with error handling.
- `message_end` hook structure — Check model, check role, extract text, repair content.

**Constants:** `GLM_5_1_ID = "zai-org/GLM-5.1-FP8"` already defined at line 272.

## Approach

**Chosen approach:** Add a `stripGlmCotMarkers()` function that:
1. Checks if the message is from GLM 5.1
2. Scans `content` text for ` thinking` and ` response` markers
3. If both found, splits text into [before thinking, thinking content, after response]
4. Replaces content text with the after-response portion (the real response)
5. Sets `reasoning_content` to the extracted thinking content

**Integration point:** Call `stripGlmCotMarkers()` in the `message_end` hook, before the existing tool call repair logic. If CoT markers are found and stripped, the cleaned text then flows through tool call parsing normally.

**Why this approach:**
- Minimal code addition (~40 lines)
- Follows existing patterns (stripControlTokens, parseGlmToolCalls)
- Single integration point (message_end hook is already model-gated for GLM)
- No new hooks, no streaming changes

**Alternatives considered:**
1. **New dedicated hook** — Rejected. Adds complexity with no benefit; message_end already filters by model and role.
2. **Server-side flag to disable thinking** — Rejected. Can't control Makora server; `enable_thinking: false` would disable reasoning entirely, not just fix the leak.
3. **Fuzzy regex for marker variants** — Rejected. Exact substring matching is safer and sufficient. The markers are chat template tokens, not user-generated text.
4. **context hook stripping** — Rejected. The markers should be stripped immediately when the message arrives (`message_end`), not deferred to context preparation.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| False positive — legitimate content contains " thinking" or " response" | Low | Med | These are specific chat template tokens with leading spaces; extremely unlikely in natural text. Guard with model check. |
| Stripping breaks tool call parsing | Low | High | Always run CoT stripping BEFORE tool call repair. Tool call markers (`<tool_call>`) are distinct from CoT markers (` thinking`, ` response`). |
| Empty thinking between markers crashes extraction | Low | Low | Graceful handling: empty string or null reasoning_content, keep content intact. |
| Regression: non-GLM models affected | Low | High | Model ID guard ensures only GLM 5.1 is touched. Add test for non-GLM passthrough. |

## Success Criteria

- [ ] GLM 5.1 assistant messages with leaked ` thinking`/` response` markers are cleaned
    - Verify: `npx tsx -e "..."` sends a request, checks response content for marker absence
- [ ] Leaked thinking content is moved to `reasoning_content` field
    - Verify: Check message structure has populated `reasoning_content`
- [ ] Non-GLM messages pass through unchanged
    - Verify: Test with DeepSeek/Kimi models
- [ ] All unit tests pass
    - Verify: `npx vitest run --reporter verbose`
- [ ] No regressions in existing reasoning tests
    - Verify: `MAKORA_OPTIMIZE_TOKEN=... npx tsx test-reasoning.ts`
