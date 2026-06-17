---
purpose: Product Requirements Document for a bead
updated: 2026-06-17
---

# PRD: Strip leaked GLM 5.1 chain-of-thought content markers from assistant messages

**Bead:** omp-o3l | **Type:** bug | **Priority:** P1
**Created:** 2026-06-17 | **Estimate:** 60

## Problem

WHEN Makora serves GLM 5.1 through a vLLM build whose GLM reasoning parser does not separate private reasoning from visible answer text, assistant messages can arrive with the GLM chat-template sentinels ` thinking` and ` response` inside `content`.
The provider must remove those sentinels before the message is persisted or shown, and it must preserve the private reasoning by moving it into the same `reasoning_content` shape used by reasoning-capable model responses.
The bug is scoped to GLM 5.1 FP8 because the marker pair is specific to that chat template and because the provider already has GLM-specific message repair in `message_end`.
The failure is user-visible: leaked private reasoning pollutes the answer, contaminates future context, and exposes chain-of-thought text that should not be part of the assistant-visible message.
The implementation must be boring: one cleanup helper, one hook integration point, tests through the provider hook, and no new provider-wide abstractions.

## Quality Gate

- This PRD is intentionally expanded in-place before `/ship` because the bead owner required `prd.md` to be at least 600 lines before implementation acceptance.
- The expansion is normative. It does not add scope beyond the original requirements; it makes edge cases, invariants, and verification explicit.
- Implementation remains scoped to `index.ts` and the bead-specific GLM CoT tests.

## Scope

### In Scope
- Detect complete, ordered GLM 5.1 leaked marker pairs in assistant text content.
- Strip ` thinking` and ` response` from the visible `content` field for GLM 5.1 only.
- Extract the text between markers and assign it to `reasoning_content` when non-empty after trimming.
- Leave `reasoning_content` absent when the extracted private section is empty after trimming.
- Preserve visible response text after ` response` as the assistant answer.
- Preserve prefix text before ` thinking` when present because it is already visible content.
- Preserve non-text content blocks, including existing tool call blocks.
- Run cleanup before GLM raw tool-call repair so parsed tool calls operate on cleaned answer text.
- Keep partial leaks unchanged because guessing would corrupt content.
- Keep marker pairs inside fenced Markdown code blocks unchanged because those markers are visible code examples, not template sentinels.
- Add tests for all marker presence patterns required by the original bead.

### Out of Scope
- Non-GLM model cleanup.
- Streaming-specific cleanup.
- Server-side vLLM parser configuration.
- Changing Makora model metadata, pricing, context length, or model defaults.
- Changing `before_provider_request` thinking controls.
- Rewriting tool-call parsers other than the minimal integration needed to keep GLM tool calls working after cleanup.
- Broad provider refactors.
- Compatibility shims or deprecated paths.

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|-------------|----------|---------------------|
| R1 | Strip complete GLM 5.1 ` thinking` + ` response` marker pairs from assistant content. | MUST | Cleaned message text contains neither marker. |
| R2 | Move non-empty leaked reasoning text to `reasoning_content`. | MUST | Text between markers appears in `reasoning_content` after trimming. |
| R3 | Do not set `reasoning_content` for empty private sections. | MUST | Empty marker pair cleans content but does not add a meaningless empty field. |
| R4 | Do not alter non-GLM messages. | MUST | DeepSeek/Kimi/Qwen marker-like text passes through unchanged. |
| R5 | Do not alter incomplete marker leaks. | MUST | Thinking-only and response-only text returns unchanged. |
| R6 | Do not alter reversed marker order. | MUST | ` response` before ` thinking` returns unchanged. |
| R7 | Do not alter marker pairs inside fenced Markdown code blocks. | SHOULD | Code samples containing marker text pass through unchanged. |
| R8 | Preserve GLM tool-call repair after cleanup. | MUST | Raw `<tool_call>` XML after the response marker still becomes a `toolCall` content block. |
| R9 | Keep implementation in the existing `message_end` hook. | MUST | No additional hook registration is added for this behavior. |
| R10 | Keep implementation allocation-aware and simple. | SHOULD | Work is limited to messages that already reached GLM tool-call repair; no provider-wide scan is added. |

## Technical Context

- `index.ts` contains the provider registration, Makora model constants, tool-call parsers, content helpers, and hooks.
- `GLM_5_1_ID` is the authoritative model identifier for this bead: `zai-org/GLM-5.1-FP8`.
- `TOOL_CALL_REPAIR_MODELS` already includes GLM 5.1, so the hook already gates to the affected model family before cleanup.
- `ContentBlock` is the local structural contract for assistant message content.
- `extractText` concatenates text blocks and is the existing public seam for parser input inside this provider file.
- `buildRepairedContent` builds text plus `toolCall` blocks after raw tool-call parsing.
- `stripControlTokens` is the existing exact-string cleanup pattern to follow.
- The cleanup helper returns both cleaned content and extracted reasoning so the hook can merge it into the returned message.

## Acceptance Test Inventory
| ID | Scenario | Input Shape | Required Outcome |
|----|----------|-------------|------------------|
| A01 | GLM complete leak | ` thinking\nsecret\n response\nanswer` | content becomes `answer`; reasoning_content becomes `secret` |
| A02 | GLM no markers | `answer` | hook returns no replacement |
| A03 | GLM thinking-only | ` thinking\nsecret` | hook returns no replacement |
| A04 | GLM response-only | ` response\nanswer` | hook returns no replacement |
| A05 | GLM tool call after response | ` thinking... response...<tool_call>` | content text is cleaned and tool call block is parsed |
| A06 | GLM empty thinking | ` thinking response\nanswer` | content becomes `answer`; reasoning_content absent |
| A07 | GLM reversed markers | ` response answer thinking secret` | hook returns no replacement |
| A08 | Non-GLM marker text | DeepSeek content with markers | hook returns no replacement |
| A09 | Fenced code markers | Markdown code block with marker pair | hook returns no replacement |
| A10 | Existing toolCall block after cleanup | Text markers plus non-text block | non-text block preserved |

## Detailed Behavioral Contract

### Contract Clause C01
- C01.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C01.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C01.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C01.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C01.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C01.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C02
- C02.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C02.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C02.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C02.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C02.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C02.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C03
- C03.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C03.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C03.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C03.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C03.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C03.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C04
- C04.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C04.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C04.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C04.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C04.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C04.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C05
- C05.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C05.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C05.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C05.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C05.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C05.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C06
- C06.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C06.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C06.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C06.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C06.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C06.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C07
- C07.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C07.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C07.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C07.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C07.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C07.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C08
- C08.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C08.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C08.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C08.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C08.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C08.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C09
- C09.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C09.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C09.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C09.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C09.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C09.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C10
- C10.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C10.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C10.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C10.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C10.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C10.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C11
- C11.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C11.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C11.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C11.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C11.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C11.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C12
- C12.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C12.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C12.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C12.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C12.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C12.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C13
- C13.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C13.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C13.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C13.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C13.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C13.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C14
- C14.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C14.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C14.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C14.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C14.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C14.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C15
- C15.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C15.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C15.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C15.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C15.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C15.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C16
- C16.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C16.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C16.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C16.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C16.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C16.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C17
- C17.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C17.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C17.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C17.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C17.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C17.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C18
- C18.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C18.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C18.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C18.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C18.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C18.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C19
- C19.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C19.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C19.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C19.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C19.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C19.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C20
- C20.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C20.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C20.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C20.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C20.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C20.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C21
- C21.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C21.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C21.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C21.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C21.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C21.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C22
- C22.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C22.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C22.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C22.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C22.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C22.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C23
- C23.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C23.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C23.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C23.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C23.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C23.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C24
- C24.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C24.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C24.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C24.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C24.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C24.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C25
- C25.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C25.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C25.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C25.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C25.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C25.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C26
- C26.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C26.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C26.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C26.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C26.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C26.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C27
- C27.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C27.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C27.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C27.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C27.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C27.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C28
- C28.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C28.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C28.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C28.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C28.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C28.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C29
- C29.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C29.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C29.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C29.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C29.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C29.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C30
- C30.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C30.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C30.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C30.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C30.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C30.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C31
- C31.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C31.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C31.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C31.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C31.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C31.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C32
- C32.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C32.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C32.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C32.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C32.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C32.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C33
- C33.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C33.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C33.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C33.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C33.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C33.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C34
- C34.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C34.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C34.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C34.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C34.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C34.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C35
- C35.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C35.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C35.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C35.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C35.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C35.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C36
- C36.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C36.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C36.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C36.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C36.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C36.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C37
- C37.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C37.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C37.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C37.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C37.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C37.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C38
- C38.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C38.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C38.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C38.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C38.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C38.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C39
- C39.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C39.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C39.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C39.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C39.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C39.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C40
- C40.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C40.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C40.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C40.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C40.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C40.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C41
- C41.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C41.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C41.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C41.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C41.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C41.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C42
- C42.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C42.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C42.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C42.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C42.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C42.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C43
- C43.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C43.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C43.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C43.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C43.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C43.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C44
- C44.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C44.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C44.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C44.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C44.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C44.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C45
- C45.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C45.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C45.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C45.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C45.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C45.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C46
- C46.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C46.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C46.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C46.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C46.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C46.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C47
- C47.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C47.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C47.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C47.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C47.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C47.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C48
- C48.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C48.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C48.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C48.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C48.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C48.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C49
- C49.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C49.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C49.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C49.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C49.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C49.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C50
- C50.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C50.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C50.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C50.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C50.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C50.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C51
- C51.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C51.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C51.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C51.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C51.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C51.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C52
- C52.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C52.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C52.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C52.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C52.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C52.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C53
- C53.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C53.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C53.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C53.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C53.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C53.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C54
- C54.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C54.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C54.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C54.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C54.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C54.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C55
- C55.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C55.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C55.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C55.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C55.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C55.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C56
- C56.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C56.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C56.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C56.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C56.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C56.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C57
- C57.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C57.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C57.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C57.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C57.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C57.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C58
- C58.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C58.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C58.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C58.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C58.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C58.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C59
- C59.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C59.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C59.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C59.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C59.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C59.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C60
- C60.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C60.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C60.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C60.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C60.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C60.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C61
- C61.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C61.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C61.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C61.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C61.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C61.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C62
- C62.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C62.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C62.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C62.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C62.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C62.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C63
- C63.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C63.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C63.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C63.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C63.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C63.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C64
- C64.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C64.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C64.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C64.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C64.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C64.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C65
- C65.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C65.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C65.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C65.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C65.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C65.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C66
- C66.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C66.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C66.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C66.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C66.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C66.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C67
- C67.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C67.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C67.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C67.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C67.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C67.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C68
- C68.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C68.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C68.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C68.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C68.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C68.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C69
- C69.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C69.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C69.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C69.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C69.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C69.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C70
- C70.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C70.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C70.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C70.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C70.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C70.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C71
- C71.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C71.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C71.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C71.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C71.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C71.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C72
- C72.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C72.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C72.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C72.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C72.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C72.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C73
- C73.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C73.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C73.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C73.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C73.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C73.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C74
- C74.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C74.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C74.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C74.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C74.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C74.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C75
- C75.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C75.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C75.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C75.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C75.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C75.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C76
- C76.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C76.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C76.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C76.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C76.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C76.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C77
- C77.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C77.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C77.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C77.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C77.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C77.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C78
- C78.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C78.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C78.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C78.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C78.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C78.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C79
- C79.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C79.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C79.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C79.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C79.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C79.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

### Contract Clause C80
- C80.1 Cleanup is eligible only after the hook confirms `msg.role === "assistant"`.
- C80.2 Cleanup is eligible only when the message model exactly equals `zai-org/GLM-5.1-FP8`.
- C80.3 The helper treats the first complete ordered marker pair as the leaked template boundary.
- C80.4 If the pair is absent, incomplete, reversed, or inside a fenced code sample, the original content follows the existing no-change path.
- C80.5 When the pair is valid, visible text before ` thinking` and visible text after ` response` form the new text content.
- C80.6 Extracted reasoning is trimmed before assignment so template newlines do not leak into `reasoning_content`.

## Requirement Traceability Matrix

| Requirement | Code Area | Test Evidence | Verification Command |
|-------------|-----------|---------------|----------------------|
| R1 | `stripGlmCotMarkers` | both-marker test | `npx tsx tests/glm-cot-strip.test.ts` |
| R2 | `stripGlmCotMarkers` return value | reasoning_content assertion | `npx tsx tests/glm-cot-strip.test.ts` |
| R3 | hook message spread | empty-thinking assertion | `npx tsx tests/glm-cot-strip.test.ts` |
| R4 | model guard in `message_end` | non-GLM assertion | `npx tsx tests/glm-cot-strip.test.ts` |
| R5 | complete-pair guard | partial marker assertions | `npx tsx tests/glm-cot-strip.test.ts` |
| R6 | ordered marker guard | wrong-order assertion | `npx tsx tests/glm-cot-strip.test.ts` |
| R7 | fence guard | fenced code assertion | `npx tsx tests/glm-cot-strip.test.ts` |
| R8 | parse after cleanup | tool-call assertion | `npx tsx tests/glm-cot-strip.test.ts` |
| R9 | existing hook body | provider fake-pi hook count assertion | `npx tsx tests/glm-cot-strip.test.ts` |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| False positive on prose containing marker words | Require GLM model guard, complete ordered pair, and response marker boundary. |
| Corrupting code examples | Skip marker pairs inside fenced Markdown code blocks. |
| Breaking tool-call parsing | Run cleanup before existing raw tool-call parser and test tool-call path. |
| Leaking empty reasoning field | Only spread `reasoning_content` when the extracted string is non-empty. |
| Changing non-GLM behavior | Keep exact model ID check and non-GLM regression test. |
| Adding overhead to all messages | Stay inside existing GLM-capable `message_end` path; no new hook. |

## Success Criteria

- GLM complete marker leaks are cleaned.
- Extracted private reasoning is preserved in `reasoning_content`.
- Non-GLM output is unchanged.
- Partial, reversed, and fenced-code marker text is unchanged.
- GLM tool-call repair still works after cleanup.
- The bead-specific test command passes.
- Project build/check commands still exit zero.

