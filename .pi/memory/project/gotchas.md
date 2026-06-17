---
purpose: Known pitfalls and warnings
updated: 2026-06-17
---

# Gotchas: omp-makora-provider

## Active Warnings

| Date | Area | Gotcha | Impact | Mitigation |
|------|------|--------|--------|------------|
| 2026-06 | vLLM | GLM 5.1 tool calls crash vLLM (500) on follow-up requests when assistant messages contain `tool_calls` field | Conversation breaks after first tool call | `context` hook strips tool_calls and converts to `<tool_call>` XML text |
| 2026-06 | vLLM | Kimi K2.6/K2.7 streaming tool_choice is broken — no delta.tool_calls emitted | Tool calls arrive as raw special tokens in text | `before_provider_request` sets tool_choice: "none" + skip_special_tokens: false; `message_end` reparses |
| 2026-06 | vLLM | Qwen 3.6 streaming tool_choice is broken — same as Kimi | Tool calls arrive as `<function=...>` XML in text | Same repair path as Kimi; also handles `█` delimiters |
| 2026-06 | vLLM | DeepSeek V4 thinking params — vLLM ignores `thinking: { type }` (official DeepSeek API format) | No reasoning returned if using pi's deepseek thinkingFormat | `before_provider_request` rewrites to vLLM-native params (chat_template_kwargs.thinking, include_reasoning) |
| 2026-06 | vLLM | DeepSeek V4 Flash needs BOTH `include_reasoning: true` AND `chat_template_kwargs.thinking: true` | `include_reasoning` alone returns `reasoning: null` on this vLLM build | Both params set in rewriteVllmPayload |
| 2026-06 | vLLM | MiniMax M3 uses `chat_template_kwargs.enable_thinking` (not `.thinking` like DeepSeek) | Different param name than other enable_thinking models | Separate ENABLE_THINKING_VLLM_MODELS set with MiniMax-specific rewrite |
| 2026-06 | vLLM | GLM 5.1 CoT leak — on some builds, disabling reasoning may leak chain-of-thought into content | Model outputs thinking when it shouldn't | Known upstream issue (vllm#31319); no client-side fix possible |
| 2026-06 | API | Developer role silently dropped by all Makora vLLM chat templates | Prompts with `role: "developer"` are lost | `supportsDeveloperRole: false` for all models |
| 2026-06 | Data | models.json is auto-generated — manual edits are overwritten on sync | Lost overrides, stale data | Always edit patch.json or custom-models.json instead |
| 2026-06 | Data | Reasoning field varies by model (reasoning vs reasoning_content) | Missing reasoning if field name mismatch | OMP/pi checks `reasoning_content` first; patch.json sets `requiresReasoningContentOnAssistantMessages` for models that need it |
| 2026-06 | Tests | test-reasoning.ts covers 7 models but no automated CI | Manual testing only, regressions possible between syncs | Run test-reasoning.ts after each model sync or patch change |
| 2026-06 | Tool repair | Tool call parsers use regex — brittle against format changes | Parsing fails silently (catches JSON parse errors, returns empty) | Add unit tests for parseGlmToolCalls, parseKimiToolCalls, parseQwenToolCalls |
