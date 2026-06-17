---
purpose: Decision log for a bead
updated: 2026-06-17
---

# Decisions: omp-o3l

## Decision Log

| # | Decision | Rationale | Confidence |
|---|----------|-----------|------------|
| 1 | Use exact substring matching for ` thinking` and ` response` markers, not fuzzy regex | These are specific chat template tokens, not natural language. Exact matching avoids false positives. Pattern follows existing `stripControlTokens()`. | High |
| 2 | Integrate CoT stripping into the existing `message_end` hook (before tool call repair) | The hook already filters by model (`TOOL_CALL_REPAIR_MODELS` includes GLM 5.1) and role (`assistant`). Adding CoT stripping here reuses the same guard, minimal overhead. Stripping before tool call repair ensures cleaned text flows to `parseGlmToolCalls`. | High |
| 3 | Move leaked thinking content to `reasoning_content` field | When vLLM leaks thinking into `content`, the `reasoning_content` field arrives empty/null. Recovering the thinking into the proper field restores correct message structure for multi-turn conversations, matching what a properly-configured reasoning parser would produce. | High |
| 4 | Strip markers with leading space, not without | The GLM chat template tokenizes these as ` thinking` and ` response` — the leading space is part of the token. Stripping without the space risks false positives in natural language (e.g., "I'm thinking about it"). | High |
| 5 | Scope to GLM 5.1 only — not other GLM family models | Only `zai-org/GLM-5.1-FP8` is on Makora. Other GLM variants (4.7, 5.0) are not served. YAGNI. | High |
| 6 | Apply stripping in `message_end`, not `context` hook | `message_end` fires when each assistant message arrives — the right time to clean it. `context` fires when assembling multi-turn request history — too late; the contaminated content may already have affected the conversation. | High |
| 7 | CoT stripping is applied regardless of whether `reasoning_content` already has content | If the reasoning parser partially worked (some reasoning in `reasoning_content`, some leaked to `content`), we still strip the leaked portion from `content`. We append to existing `reasoning_content` rather than replacing. | High |
| 8 | Add a new dedicated function `stripGlmCotMarkers()` rather than extending `stripControlTokens()` | `stripControlTokens` handles vLLM control tokens (`<|im_start|>`, etc.) with simple replacement. CoT stripping needs marker-aware splitting (extract between markers, move to different field). Different semantics, different function. | High |

## Rejected Alternatives

| # | Alternative | Why Rejected | Risk if Re-introduced |
|---|-------------|--------------|----------------------|
| 1 | Create a new dedicated hook (`before_message_display`) for CoT stripping | Unnecessary. `message_end` already provides the right timing and model/role guards. Adding a new hook increases surface area with no benefit. | Adds hook overhead, potential ordering bugs between hooks. |
| 2 | Use `enable_thinking: false` to prevent thinking altogether | This disables reasoning entirely, degrading model quality. The bug isn't that thinking exists — it's that markers leak into content. | Degrades GLM 5.1 output quality significantly. |
| 3 | Server-side fix (ask Makora to configure reasoning parser) | Provider can't control Makora's vLLM deployment. Client-side fix is immediate and reliable. | N/A — would be ideal but not actionable. |
| 4 | Fuzzy regex for marker detection (e.g., `/\s*thinking/` with optional whitespace) | Over-fuzzy matching risks false positives in legitimate content. Exact substring with leading space is sufficient — the tokens are deterministic. | False positives strip legitimate content. |
| 5 | Strip markers in streaming path only | The bug manifests in non-streaming too. Streaming path has separate delta processing — would only fix half the problem. | Leaves non-streaming mode broken. |

## Assumptions

| # | Assumption | Validation | Invalidation Impact |
|---|------------|------------|---------------------|
| 1 | Makora's vLLM deployment does NOT have the `--reasoning-parser glm45` flag set | Validated — the index.ts comments explicitly state "vLLM may leak chain-of-thought into content." If this changes, CoT stripping becomes no-op (no markers to strip). | No behavioral impact — stripping is inert when markers are absent. |
| 2 | The ` thinking` and ` response` markers always appear with leading spaces in leaked content | Validated via vLLM issue #31319 tokenization output showing `" thinking"` as a token string. | Need to adjust search strings if vLLM changes tokenization. |
| 3 | Leaked thinking content never contains legitimate ` response` text nested within | Unknown — but ` response` with leading space is a special token. Natural text "response" wouldn't have leading space in typical paragraph flow. Even if false positive, impact is truncating a few trailing words of thinking content — not visible response content. | Minor: some thinking content truncated before reaching real response text. |
| 4 | CoT stripping before tool call repair won't interfere with `<tool_call>` XML parsing | Validated — ` thinking` and ` response` are distinct from `<tool_call>` / `<tool_name>` / `<parameters>` markers. These use different syntax. | Need to reorder operations: CoT strip after tool call parse, or parse from pre-strip text. |
