/**
 * Makora Provider Extension
 *
 * Registers Makora (inference.makora.com) as a custom provider using the
 * OpenAI completions API.
 *
 * Makora is an inference optimization platform serving open-weight models via
 * a unified OpenAI-compatible API at https://inference.makora.com/v1. Each
 * model is hosted on vLLM and speaks the standard OpenAI chat completions
 * protocol. Most models use the shared provider baseUrl; models not yet
 * on the unified endpoint retain a per-model `baseUrl` override.
 *
 * Model resolution strategy: static models.json merged with custom-models.json
 *
 * Reasoning notes:
 *   - DeepSeek V4 Flash/Pro: reasoning NOT supported on Makora's current
 *     vLLM deployment (reasoning_content is always null).
 *   - GLM 5.1 FP8: reasoning via chat_template_kwargs.enable_thinking.
 *     NOTE: vLLM may leak chain-of-thought into content instead of the
 *     reasoning field on some builds. See
 *     https://github.com/vllm-project/vllm/issues/31319
 *     Also: vLLM's streaming parser omits delta.tool_calls when the model
 *     calls tools, finishing with finish_reason: "tool_calls" but an empty
 *     delta. Setting zaiToolStream: true sends tool_stream: true in the
 *     request, which forces vLLM to use the explicit tool streaming path
 *     that correctly emits tool call chunks.
 *   - GPT-OSS 120B: reasoning always on; returns `reasoning` field.
 *   - Kimi K2.6 NVFP4: reasoning always on by default; returns `reasoning`
 *     field. Can be toggled via enable_thinking.
 *   - Qwen 3.6 models: reasoning via chat_template_kwargs.enable_thinking;
 *     returns `reasoning` field.
 *   - Llama 3.3 70B: not a reasoning model.
 *
 * Developer role is NOT supported by any of the chat templates on Makora's
 * vLLM deployment (prompts with role: "developer" are silently dropped).
 * supportsDeveloperRole is set to false for all models.
 *
 * Tool use notes:
 *   - GLM 5.1, Kimi K2.6, and Qwen 3.6 all suffer from vLLM streaming
 *     tool call issues. The before_provider_request hook sets
 *     tool_choice: "none" and skip_special_tokens: false so that tool call
 *     tokens pass through as plain text in the streaming response. A
 *     message_end hook then parses the tokens back into structured toolCall
 *     blocks that pi can execute.
 *
 *   - GLM 5.1: Uses the █...█ (Unicode block element) format for tool
 *     calls (marked as special: true in the tokenizer, so
 *     skip_special_tokens: false is required). The zaiToolStream compat
 *     flag sends tool_stream: true (a ZAI-specific extension) which may
 *     help on newer vLLM builds but is not supported by stock vLLM.
 *
 *   - Kimi K2.6: Uses <|tool_call_begin|>...<|tool_call_end|> tokens
 *     (marked as special: false in the tokenizer, so they survive
 *     skip_special_tokens). Makora's vLLM is missing both
 *     --enable-auto-tool-choice and --tool-call-parser for this model.
 *
 *   - Qwen 3.6: Uses an XML-ish format within █...█:
 *     █\\n<function=name>\\n<parameter=key>\\nvalue\\n</parameter>\\n</function>\\n█
 *     Same vLLM flag limitation as Kimi.
 *   - GLM 5.1 and Qwen 3.6 may also emit bare hermes-style XML without
 *     █ delimiters when tool_choice: "none" bypasses vLLM's parser:
 *     <function=func_name>...<parameter=key>value</parameter>...</function>
 *   - GLM 5.1 may instead output its native Zhipu tool call format:
 *     <tool_call>name</tool_call>
 *     <tool_call>name<arg_key>k</arg_key><arg_value>v</arg_value></tool_call>
 *
 *   - If Makora later enables --tool-call-parser for these models or
 *     upgrades to a vLLM version with fixed streaming, the existing
 *     toolCall blocks from native parsing will be preserved as-is (the
 *     message_end hook only acts when it finds parseable tool tokens in
 *     text content and no existing toolCall blocks are already present).
 *
 * Usage:
 *   # Option 1: Store in auth.json (recommended)
 *   # Add to ~/.pi/agent/auth.json:
 *   #   "makora": { "type": "api_key", "key": "your-api-key" }
 *
 *   # Option 2: Set as environment variable
 *   export MAKORA_OPTIMIZE_TOKEN=your-api-key
 *
 *   # Run pi with the extension
 *   pi -e /path/to/pi-makora-provider
 *
 * Then use /model to select from available models.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import modelsData from "./models.json" with { type: "json" };
import customModelsData from "./custom-models.json" with { type: "json" };
import patchData from "./patch.json" with { type: "json" };

// ─── Types ────────────────────────────────────────────────────────────────

interface JsonModel {
  id: string;
  name: string;
  reasoning: boolean;
  input: string[];
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
  baseUrl?: string;
  thinkingLevelMap?: Record<string, string | null>;
  headers?: Record<string, string>;
  vision?: {
    maxImagesPerRequest?: number;
  };
  compat?: {
    supportsDeveloperRole?: boolean;
    supportsStore?: boolean;
    maxTokensField?: "max_completion_tokens" | "max_tokens";
    thinkingFormat?:
      | "openai"
      | "openrouter"
      | "deepseek"
      | "together"
      | "zai"
      | "qwen"
      | "qwen-chat-template";
    supportsReasoningEffort?: boolean;
    requiresReasoningContentOnAssistantMessages?: boolean;
    requiresToolResultName?: boolean;
    requiresAssistantAfterToolResult?: boolean;
    cacheControlFormat?: "anthropic";
  };
}

interface PatchEntry {
  name?: string;
  reasoning?: boolean;
  input?: string[];
  cost?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  contextWindow?: number;
  maxTokens?: number;
  baseUrl?: string;
  thinkingLevelMap?: Record<string, string | null>;
  headers?: Record<string, string>;
  compat?: Record<string, unknown>;
}

type PatchMap = Record<string, PatchEntry>;

// ─── Patch Application ───────────────────────────────────────────────────

function applyPatch(model: JsonModel, patch: PatchEntry): JsonModel {
  const result = { ...model };

  if (patch.name !== undefined) result.name = patch.name;
  if (patch.reasoning !== undefined) result.reasoning = patch.reasoning;
  if (patch.input !== undefined) result.input = patch.input;
  if (patch.contextWindow !== undefined) result.contextWindow = patch.contextWindow;
  if (patch.maxTokens !== undefined) result.maxTokens = patch.maxTokens;
  if (patch.baseUrl !== undefined) result.baseUrl = patch.baseUrl;
  if (patch.thinkingLevelMap !== undefined) result.thinkingLevelMap = { ...patch.thinkingLevelMap };
  if (patch.headers !== undefined) result.headers = { ...patch.headers };

  if (patch.cost) {
    result.cost = {
      input: patch.cost.input ?? result.cost.input,
      output: patch.cost.output ?? result.cost.output,
      cacheRead: patch.cost.cacheRead ?? result.cost.cacheRead,
      cacheWrite: patch.cost.cacheWrite ?? result.cost.cacheWrite,
    };
  }
  if (patch.compat) {
    result.compat = { ...(result.compat || {}), ...patch.compat };
  }

  if (!result.reasoning && result.compat?.thinkingFormat) {
    delete result.compat.thinkingFormat;
  }
  if (result.compat && Object.keys(result.compat).length === 0) {
    delete result.compat;
  }

  return result;
}

/** Merge static models with any user-defined custom models */
function buildModels(
  base: JsonModel[],
  custom: JsonModel[],
  patch: PatchMap
): JsonModel[] {
  const modelMap = new Map<string, JsonModel>();

  for (const model of base) {
    modelMap.set(model.id, model);
  }

  for (const [id, patchEntry] of Object.entries(patch)) {
    const existing = modelMap.get(id);
    if (existing) {
      modelMap.set(id, applyPatch(existing, patchEntry));
    }
  }

  for (const model of custom) {
    const existing = modelMap.get(model.id);
    const patchEntry = patch[model.id];
    if (existing && patchEntry) {
      modelMap.set(model.id, applyPatch(model, patchEntry));
    } else if (existing) {
      modelMap.set(model.id, model);
    } else if (patchEntry) {
      modelMap.set(model.id, applyPatch(model, patchEntry));
    } else {
      modelMap.set(model.id, model);
    }
  }

  return Array.from(modelMap.values());
}

// ─── Extension Entry Point ──────────────────────────────────────────────

const PROVIDER_ID = "makora";
const BASE_URL = "https://inference.makora.com/v1";

export default function (pi: ExtensionAPI) {
  const embeddedModels = modelsData as JsonModel[];
  const customModels = customModelsData as JsonModel[];
  const patches = patchData as PatchMap;

  const models = buildModels(embeddedModels, customModels, patches);

  // apiKey resolution order: auth.json ("makora" key) → MAKORA_OPTIMIZE_TOKEN env var
  pi.registerProvider(PROVIDER_ID, {
    name: "Makora",
    baseUrl: BASE_URL,
    apiKey: "$MAKORA_OPTIMIZE_TOKEN",
    api: "openai-completions",
    models,
  });

  // Models whose vLLM deployment has broken or missing tool call streaming.
  // Setting tool_choice: "none" bypasses the streaming parser; combined with
  // skip_special_tokens: false this lets tool call markers pass through as
  // plain text. The message_end hook re-parses them into toolCall blocks.
  //
  // GLM 5.1 is NOT in this list — it naturally emits <tool_call> XML as
  // text. Instead it is handled by the context hook below, which strips
  // tool_calls from assistant messages before follow-up requests to avoid
  // a ZAI/vLLM server crash (500: 'str object' has no attribute 'items').
  const TOOL_BYPASS_MODELS = new Set([
    "nvidia/Kimi-K2.6-NVFP4",
    "unsloth/Qwen3.6-27B-NVFP4",
    "unsloth/Qwen3.6-35B-A3B-NVFP4",
  ]);

  // Models that crash when an assistant message contains tool_calls.
  // For these, the context hook strips tool_calls and converts them to
  // the model's native text format before sending to vLLM.
  const TOOL_CALL_STRIP_MODELS = new Set([
    "zai-org/GLM-5.1-FP8",
  ]);

  // ─── context: strip tool_calls from assistant messages ──────────────
  //
  // Some model deployments (GLM via ZAI) crash when an assistant message
  // contains a tool_calls field — even a well-formed one. The workaround
  // is to strip tool_calls and inject them as text in the model's native
  // format before sending the follow-up request.
  pi.on("context", (event, _ctx) => {
    const messages = event.messages;
    const hasRelevantModel = messages.some(
      (m) => m.role === "assistant" &&
        m.provider === PROVIDER_ID &&
        typeof m.model === "string" &&
        TOOL_CALL_STRIP_MODELS.has(m.model)
    );
    if (!hasRelevantModel) return;

    const newMessages = messages.map((m) => {
      if (m.role !== "assistant") return m;
      const content = m.content as Array<{ type: string; [key: string]: unknown }>;
      if (!Array.isArray(content)) return m;

      const toolCalls = content.filter((b) => b.type === "toolCall");
      if (toolCalls.length === 0) return m;

      const nonToolContent = content.filter((b) => b.type !== "toolCall");

      // Convert tool calls to GLM native <tool_call> format
      const toolCallTexts = toolCalls.map((tc) => {
        const name = tc.name as string;
        const args = tc.arguments as Record<string, unknown>;
        const argKeys = Object.keys(args);
        if (argKeys.length === 0) return `<tool_call>${name}</tool_call>`;
        const argParts = argKeys.map((k) =>
          `<arg_key>${k}</arg_key><arg_value>${JSON.stringify(args[k])}</arg_value>`
        ).join("");
        return `<tool_call>${name}${argParts}</tool_call>`;
      });

      const newContent = [...nonToolContent];
      if (toolCallTexts.length > 0) {
        // Prepend tool call text to any existing text content
        const existingText = newContent.find((b) => b.type === "text");
        if (existingText) {
          existingText.text = toolCallTexts.join("") + (existingText.text as string || "");
        } else {
          newContent.unshift({ type: "text", text: toolCallTexts.join("") });
        }
      }

      return { ...m, content: newContent };
    });

    return { messages: newMessages };
  });

  pi.on("before_provider_request", (event, _ctx) => {
    const payload = event.payload as Record<string, unknown>;
    const modelId = payload.model as string | undefined;
    if (!modelId || !TOOL_BYPASS_MODELS.has(modelId)) return;
    if (!("tools" in payload)) return;

    // Bypass the (potentially broken) streaming tool parser and ensure
    // special token markers are not stripped from the delta text.
    return { ...payload, tool_choice: "none", skip_special_tokens: false };
  });

  // ─── Client-side tool call parsing ───────────────────────────────────
  //
  // When vLLM cannot parse tool calls server-side (missing
  // --tool-call-parser or broken streaming), the model's tool call markers
  // are emitted as raw text in the streaming delta. This hook detects
  // those markers and rewrites the assistant message with proper
  // toolCall blocks so pi's agent loop can execute the tools.
  //
  // If the upstream fixes tool call parsing, the delta.tool_calls will
  // contain proper toolCall blocks and the text content won't include
  // raw tool markers — the hook will find nothing to parse and return
  // without modifying anything.

  const GLM_TOOL_TOKEN = "\u2588";
  const GLM_TOOL_CALL_OPEN = "<tool_call>";
  const KIMI_SECTION_BEGIN = "<|tool_calls_section_begin|>";
  const QWEN_FUNC_BEGIN = "<function=";

  function parseGlmToolCalls(text: string) {
    // GLM format: █func_name\n█key▐value█...█  (Unicode block element tokens)
    // GLM 4.7+ variant: █func_name█key▐value█...█ (name on same line)
    // or zero-arg: █func_name█
    if (!text.includes(GLM_TOOL_TOKEN)) return null;

    const firstIdx = text.indexOf(GLM_TOOL_TOKEN);
    const contentBefore = text.slice(0, firstIdx).trim() || undefined;

    const toolCalls: {
      type: "toolCall";
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }[] = [];

    // Match each █...█ block
    const callPattern = /\u2588([\s\S]*?)\u2588/g;
    let match: RegExpExecArray | null;
    while ((match = callPattern.exec(text)) !== null) {
      const inner = match[1];

      // Extract function name: everything up to the first newline or ▐
      const nameEnd = inner.search(/\n|\u258c/);
      const name = nameEnd === -1 ? inner.trim() : inner.slice(0, nameEnd).trim();
      if (!name) continue;

      const argsText = nameEnd === -1 ? "" : inner.slice(nameEnd);
      const args: Record<string, unknown> = {};

      // Extract ▐key▐ value▐ pairs
      const argPattern = /\u258c(.*?)\u2590\s*([\s\S]*?)\u258c/g;
      let argMatch: RegExpExecArray | null;
      while ((argMatch = argPattern.exec(argsText)) !== null) {
        const key = argMatch[1].trim();
        const rawValue = argMatch[2];
        try {
          args[key] = JSON.parse(rawValue);
        } catch {
          args[key] = rawValue;
        }
      }

      toolCalls.push({
        type: "toolCall",
        id: `call_${Math.random().toString(36).slice(2, 10)}`,
        name,
        arguments: args,
      });
    }

    if (toolCalls.length === 0) return null;
    return { toolCalls, contentBefore };
  }

  function parseGlmToolCallsText(text: string) {
    // GLM/Zhipu native tool call format (without block-element delimiters).
    // When tool_choice: "none" bypasses vLLM's parser, GLM outputs a
    // proprietary XML format instead of Hermes <function=...>:
    //   <tool_call>func_name</tool_call>
    //   <tool_call>func_name<arg_key>key</arg_key><arg_value>value</arg_value></tool_call>
    if (!text.includes(GLM_TOOL_CALL_OPEN)) return null;

    const firstIdx = text.indexOf(GLM_TOOL_CALL_OPEN);
    const contentBefore = text.slice(0, firstIdx).trim() || undefined;

    const toolCalls: {
      type: "toolCall";
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }[] = [];

    const callPattern = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match: RegExpExecArray | null;
    while ((match = callPattern.exec(text)) !== null) {
      const inner = match[1].trim();

      // Name is everything up to the first newline or '<' (next child tag).
      const nameEnd = inner.search(/[\n<]/);
      const name = nameEnd === -1 ? inner.trim() : inner.slice(0, nameEnd).trim();
      if (!name) continue;

      const rest = nameEnd === -1 ? "" : inner.slice(nameEnd);
      const args: Record<string, unknown> = {};

      // Extract <arg_key>key</arg_key><arg_value>value</arg_value> pairs.
      const argPairs = rest.match(
        /<arg_key>([\s\S]*?)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/g
      );
      if (argPairs) {
        for (const pair of argPairs) {
          const keyMatch = pair.match(/<arg_key>([\s\S]*?)<\/arg_key>/);
          const valMatch = pair.match(/<arg_value>([\s\S]*?)<\/arg_value>/);
          if (!keyMatch || !valMatch) continue;
          const key = keyMatch[1].trim();
          const rawValue = valMatch[1].trim();
          try {
            args[key] = JSON.parse(rawValue);
          } catch {
            args[key] = rawValue;
          }
        }
      }

      toolCalls.push({
        type: "toolCall",
        id: `call_${Math.random().toString(36).slice(2, 10)}`,
        name,
        arguments: args,
      });
    }

    if (toolCalls.length === 0) return null;
    return { toolCalls, contentBefore };
  }

  function parseKimiToolCalls(text: string) {
    // Kimi format:
    //   <|tool_calls_section_begin|>
    //   <|tool_call_begin|>functions.name:0<|tool_call_argument_begin|>{json}<|tool_call_end|>
    //   ...
    //   <|tool_calls_section_end|>
    if (!text.includes(KIMI_SECTION_BEGIN)) return null;

    const sectionStart = text.indexOf(KIMI_SECTION_BEGIN);
    const contentBefore = text.slice(0, sectionStart).trim() || undefined;

    const toolCalls: {
      type: "toolCall";
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }[] = [];

    const callPattern =
      /<\|tool_call_begin\|>\s*([^<\s]+:\d+)\s*<\|tool_call_argument_begin\|>\s*([\s\S]*?)\s*<\|tool_call_end\|>/g;
    let match: RegExpExecArray | null;
    while ((match = callPattern.exec(text)) !== null) {
      const id = match[1];
      const name = id.split(":")[0].split(".").pop()!;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(match[2]);
      } catch {
        continue;
      }
      toolCalls.push({ type: "toolCall", id, name, arguments: args });
    }

    if (toolCalls.length === 0) return null;
    return { toolCalls, contentBefore };
  }

  function parseQwenToolCalls(text: string) {
    // Qwen 3.6 format (hermes-style XML within █...█):
    //   █\n<function=func_name>\n<parameter=key>\nvalue\n</parameter>\n</function>\n█
    // Multiple calls:
    //   █\n<function=func_1>...\n</function>\n█\n<function=func_2>...\n</function>\n█
    if (!text.includes(GLM_TOOL_TOKEN) || !text.includes(QWEN_FUNC_BEGIN))
      return null;

    const firstIdx = text.indexOf(GLM_TOOL_TOKEN);
    const contentBefore = text.slice(0, firstIdx).trim() || undefined;

    const toolCalls: {
      type: "toolCall";
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }[] = [];

    // Match each █...█ block
    const callPattern = /\u2588([\s\S]*?)\u2588/g;
    let match: RegExpExecArray | null;
    while ((match = callPattern.exec(text)) !== null) {
      const inner = match[1];

      // Must contain <function=...>
      const funcMatch = inner.match(/<function=([^>]+)>/);
      if (!funcMatch) continue;

      const name = funcMatch[1].trim();
      const args: Record<string, unknown> = {};

      // Extract <parameter=key>value</parameter> pairs
      const paramPattern = /<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g;
      let paramMatch: RegExpExecArray | null;
      while ((paramMatch = paramPattern.exec(inner)) !== null) {
        const key = paramMatch[1].trim();
        const rawValue = paramMatch[2].trim();
        try {
          args[key] = JSON.parse(rawValue);
        } catch {
          args[key] = rawValue;
        }
      }

      toolCalls.push({
        type: "toolCall",
        id: `call_${Math.random().toString(36).slice(2, 10)}`,
        name,
        arguments: args,
      });
    }

    if (toolCalls.length === 0) return null;
    return { toolCalls, contentBefore };
  }

  function parseBareHermesToolCalls(text: string) {
    // Bare hermes-style XML without █ delimiters. Both GLM and Qwen can
    // output this format when tool_choice: "none" bypasses vLLM's tool
    // parser — the models emit raw <function=...> XML in the text stream.
    //   <function=func_name>\n<parameter=key>\nvalue\n</parameter>\n</function>
    if (!text.includes(QWEN_FUNC_BEGIN)) return null;

    const firstIdx = text.indexOf(QWEN_FUNC_BEGIN);
    const contentBefore = text.slice(0, firstIdx).trim() || undefined;

    const toolCalls: {
      type: "toolCall";
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }[] = [];

    const callPattern = /<function=([^>]+)>([\s\S]*?)<\/function>/g;
    let match: RegExpExecArray | null;
    while ((match = callPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const inner = match[2];
      const args: Record<string, unknown> = {};

      const paramPattern = /<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g;
      let paramMatch: RegExpExecArray | null;
      while ((paramMatch = paramPattern.exec(inner)) !== null) {
        const key = paramMatch[1].trim();
        const rawValue = paramMatch[2].trim();
        try {
          args[key] = JSON.parse(rawValue);
        } catch {
          args[key] = rawValue;
        }
      }

      toolCalls.push({
        type: "toolCall",
        id: `call_${Math.random().toString(36).slice(2, 10)}`,
        name,
        arguments: args,
      });
    }

    if (toolCalls.length === 0) return null;
    return { toolCalls, contentBefore };
  }

  pi.on("message_end", (event, _ctx) => {
    const msg = event.message;
    if (msg.role !== "assistant") return;

    if (msg.provider !== PROVIDER_ID) return;

    // If vLLM already parsed tool calls *correctly* (upstream fix), keep them.
    // A toolCall block with a valid name is considered correctly parsed.
    // Broken/empty blocks from partial vLLM parsing are overwritten.
    const hasValidToolCalls = msg.content.some(
      (b): b is { type: "toolCall"; name: string } =>
        b.type === "toolCall" && !!b.name
    );
    if (hasValidToolCalls) return;

    // Only process text content blocks
    const textBlocks = msg.content.filter(
      (b): b is { type: "text"; text: string } => b.type === "text"
    );
    if (textBlocks.length === 0) return;

    const fullText = textBlocks.map((b) => b.text).join("");

    // Try parsers from most specific to least:
    //   1. Qwen with █ (requires both █ and <function=>)
    //   2. GLM native (<tool_call>...</tool_call>) — Zhipu proprietary format
    //   3. GLM with █ (just █ with ▌/▐ delimiters)
    //   4. Kimi (<|tool_call_begin|>)
    //   5. Bare hermes (<function=...> without █ delimiters)
    const parsed =
      parseQwenToolCalls(fullText) ??
      parseGlmToolCallsText(fullText) ??
      parseGlmToolCalls(fullText) ??
      parseKimiToolCalls(fullText) ??
      parseBareHermesToolCalls(fullText);
    if (!parsed) return;

    // Build new content: text before tool calls (if any) + toolCall blocks
    const newContent: (typeof msg.content)[number][] = [];

    if (parsed.contentBefore) {
      newContent.push({ type: "text", text: parsed.contentBefore });
    }

    for (const tc of parsed.toolCalls) {
      newContent.push(tc);
    }

    // If there were thinking blocks or other non-text content, preserve them
    for (const block of msg.content) {
      if (block.type !== "text") {
        newContent.push(block);
      }
    }

    return {
      message: {
        ...msg,
        content: newContent,
        stopReason: "toolUse" as const,
      },
    };
  });
}