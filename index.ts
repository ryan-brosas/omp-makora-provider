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
 *   - DeepSeek V4 Pro: reasoning via chat_template_kwargs.thinking on vLLM.
 *     pi sends thinking: { type } via the "deepseek" thinkingFormat, but vLLM
 *     ignores that — the before_provider_request hook rewrites the payload to
 *     use chat_template_kwargs: { thinking: true } instead.
 *     Returns reasoning_content field.
 *   - DeepSeek V4 Flash: reasoning via include_reasoning +
 *     chat_template_kwargs.thinking on vLLM.
 *     The before_provider_request hook rewrites the payload to replace
 *     thinking: { type } with include_reasoning: true +
 *     chat_template_kwargs: { thinking: true }.
 *     include_reasoning alone returns reasoning: null on this vLLM build.
 *     Returns reasoning field.
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
 *   - Kimi K2.6 NVFP4 / Kimi K2.7 Code: reasoning always on by default;
 *     returns `reasoning` field. Can be toggled via enable_thinking.
 *   - Qwen 3.6 models: reasoning via chat_template_kwargs.enable_thinking;
 *     returns `reasoning` field.
 *   - MiniMax M3 MXFP8: reasoning via chat_template_kwargs.enable_thinking;
 *     returns reasoning_content field.
 *   - Llama 3.3 70B: not a reasoning model.
 *
 * Developer role is NOT supported by any of the chat templates on Makora's
 * vLLM deployment (prompts with role: "developer" are silently dropped).
 * supportsDeveloperRole is set to false for all models.
 *
 * Usage:
 *   # Install (once)
 *   omp plugin install omp-makora-provider
 *
 *   # Authenticate through OMP's login UI
 *   /login makora
 *
 *   # Optional explicit environment override
 *   export MAKORA_OPTIMIZE_TOKEN=your-api-key
 *
 * Then use /model to select from available Makora models.
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

function loadJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as T;
}

// Types

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
  notes?: string;
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
  vision?: {
    maxImagesPerRequest?: number;
  };
  baseUrl?: string;
  notes?: string;
  thinkingLevelMap?: Record<string, string | null>;
  headers?: Record<string, string>;
  compat?: Record<string, unknown>;
}

type PatchMap = Record<string, PatchEntry>;

interface MakoraOAuthCredentials {
  refresh: string;
  access: string;
  expires: number;
}

interface MakoraLoginCallbacks {
  onPrompt(prompt: { message: string; placeholder?: string; allowEmpty?: boolean }): Promise<string>;
  signal?: AbortSignal;
}

// Patch Application

function applyPatch(model: JsonModel, patch: PatchEntry): JsonModel {
  const result = { ...model };

  if (patch.name !== undefined) result.name = patch.name;
  if (patch.reasoning !== undefined) result.reasoning = patch.reasoning;
  if (patch.input !== undefined) result.input = patch.input;
  if (patch.contextWindow !== undefined) result.contextWindow = patch.contextWindow;
  if (patch.maxTokens !== undefined) result.maxTokens = patch.maxTokens;
  if (patch.vision !== undefined) result.vision = { ...patch.vision };
  if (patch.baseUrl !== undefined) result.baseUrl = patch.baseUrl;
  if (patch.notes !== undefined) result.notes = patch.notes;
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

// Extension Entry Point

const PROVIDER_ID = "makora";
const BASE_URL = "https://inference.makora.com/v1";
const API_KEY_ENV = "MAKORA_OPTIMIZE_TOKEN";

function resolveMakoraApiKey(): string | undefined {
  const envKey = process.env[API_KEY_ENV]?.trim();
  return envKey && envKey.length > 0 ? envKey : undefined;
}

function makeStaticCredentials(apiKey: string): MakoraOAuthCredentials {
  return {
    refresh: apiKey,
    access: apiKey,
    expires: 4102444800000,
  };
}

async function validateMakoraApiKey(apiKey: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  });
  if (response.ok) return;

  let message = `Makora API key rejected (${response.status} ${response.statusText})`;
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    message = body.error?.message ?? body.message ?? message;
  } catch {
    // Keep the status-derived message.
  }
  throw new Error(message);
}

async function loginMakora(callbacks: MakoraLoginCallbacks): Promise<MakoraOAuthCredentials> {
  const apiKey = (
    await callbacks.onPrompt({
      message: "Enter Makora API key:",
      placeholder: "Makora API key",
      allowEmpty: false,
    })
  ).trim();
  if (!apiKey) throw new Error("Makora API key is required");
  await validateMakoraApiKey(apiKey, callbacks.signal);
  return makeStaticCredentials(apiKey);
}
// ─── Model IDs ───────────────────────────────────────────────────────────────

const DS_PRO_ID = "deepseek-ai/DeepSeek-V4-Pro";
const DS_FLASH_ID = "deepseek-ai/DeepSeek-V4-Flash";
const MINIMAX_M3_ID = "MiniMaxAI/MiniMax-M3-MXFP8";

const GLM_5_1_ID = "zai-org/GLM-5.1-FP8";
const KIMI_K2_6_ID = "nvidia/Kimi-K2.6-NVFP4";
const KIMI_K2_7_ID = "moonshotai/Kimi-K2.7-Code";
const QWEN_3_6_27B_ID = "unsloth/Qwen3.6-27B-NVFP4";
const QWEN_3_6_35B_ID = "unsloth/Qwen3.6-35B-A3B-NVFP4";

const DS_VLLM_MODELS = new Set([DS_PRO_ID, DS_FLASH_ID]);
const ENABLE_THINKING_VLLM_MODELS = new Set([MINIMAX_M3_ID]);

// Models whose vLLM streaming parser is broken — tool calls arrive as raw text
const TOOL_CALL_REPAIR_MODELS = new Set([
  GLM_5_1_ID,
  KIMI_K2_6_ID,
  KIMI_K2_7_ID,
  QWEN_3_6_27B_ID,
  QWEN_3_6_35B_ID,
]);

// Models where we must disable native tool_choice so raw tokens pass through
const DISABLE_TOOL_CHOICE_MODELS = new Set([
  KIMI_K2_6_ID,
  KIMI_K2_7_ID,
  QWEN_3_6_27B_ID,
  QWEN_3_6_35B_ID,
]);

// GLM 5.1: assistant messages with tool_calls crash vLLM (500).
// We must strip tool_calls and convert back to <tool_call> XML on follow-up requests.
const GLM_TOOL_CALL_STRIP_MODELS = new Set([GLM_5_1_ID]);

// ─── vLLM thinking param rewrite ────────────────────────────────────────────

/**
 * Intercept the request payload for models that need vLLM-specific thinking
 * param rewrites.
 *
 * pi's "deepseek" thinkingFormat sends `thinking: { type: "enabled" }` which
 * is the official DeepSeek API format — but Makora's vLLM deployment ignores
 * it. vLLM requires different params depending on the model.
 */
function rewriteVllmPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const model = payload.model as string | undefined;
  if (!model) return payload;

  const p = { ...payload };

  if (DS_VLLM_MODELS.has(model)) {
    delete p.thinking;
    if (model === DS_PRO_ID) {
      const ctq = (p.chat_template_kwargs as Record<string, unknown>) ?? {};
      p.chat_template_kwargs = { ...ctq, thinking: true };
    } else if (model === DS_FLASH_ID) {
      p.include_reasoning = true;
      const ctq = (p.chat_template_kwargs as Record<string, unknown>) ?? {};
      p.chat_template_kwargs = { ...ctq, thinking: true };
    }
  } else if (ENABLE_THINKING_VLLM_MODELS.has(model)) {
    delete p.thinking;
    const ctq = (p.chat_template_kwargs as Record<string, unknown>) ?? {};
    p.chat_template_kwargs = { ...ctq, enable_thinking: true };
  }

  // Kimi K2.6 / K2.7 / Qwen 3.6: vLLM streaming tool_choice is broken.
  // Disable native tool_choice and let raw tokens through as text.
  if (DISABLE_TOOL_CHOICE_MODELS.has(model)) {
    p.tool_choice = "none";
    p.skip_special_tokens = false;
  }

  // GLM 5.1: force vLLM explicit tool streaming path so delta.tool_calls are emitted
  if (model === GLM_5_1_ID) {
    p.tool_stream = true;
  }

  return p;
}

// ─── Tool call text parsers ───────────────────────────────────────────────

interface ParsedToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** GLM 5.1 outputs Zhipu's native <tool_call> XML format as raw text. */
function parseGlmToolCalls(text: string): ParsedToolCall[] {
  const results: ParsedToolCall[] = [];
  const regex = /<tool_call>\s*<tool_name>([^<]+)<\/tool_name>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_call>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    const rawArgs = match[2].trim();
    try {
      const args = JSON.parse(rawArgs);
      if (typeof args === "object" && args !== null && !Array.isArray(args)) {
        results.push({ name, arguments: args as Record<string, unknown> });
      }
    } catch {
      console.warn(`makora: [GLM 5.1] failed to parse tool call args: ${rawArgs.slice(0, 200)}`);
    }
  }
  if (results.length === 0) {
    console.debug(`makora: [GLM 5.1] no tool calls extracted from text (${text.length}B)`);
  }
  return results;
}

/** Kimi K2.6 uses <|tool_call_begin|>...<|tool_call_end|> tokens. */
function parseKimiToolCalls(text: string): ParsedToolCall[] {
  const results: ParsedToolCall[] = [];
  const regex = /<\|tool_call_begin\|>([^\n]+)\n([\s\S]*?)<\|tool_call_end\|>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    const rawArgs = match[2].trim();
    try {
      const args = JSON.parse(rawArgs);
      if (typeof args === "object" && args !== null && !Array.isArray(args)) {
        results.push({ name, arguments: args as Record<string, unknown> });
      }
    } catch {
      console.warn(`makora: [Kimi] failed to parse tool call args: ${rawArgs.slice(0, 200)}`);
    }
  }
  if (results.length === 0) {
    console.debug(`makora: [Kimi] no tool calls extracted from text (${text.length}B)`);
  }
  return results;
}

/** Qwen 3.6 uses hermes-style <function=name>...</function> XML, sometimes with █ delimiters. */
function parseQwenToolCalls(text: string): ParsedToolCall[] {
  const results: ParsedToolCall[] = [];
  // Strip █ delimiters that sometimes appear
  const cleaned = text.replace(/█/g, "");
  const regex = /<function=([^>]+)>([\s\S]*?)<\/function>/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    const name = match[1].trim();
    const rawArgs = match[2].trim();
    try {
      const args = JSON.parse(rawArgs);
      if (typeof args === "object" && args !== null && !Array.isArray(args)) {
        results.push({ name, arguments: args as Record<string, unknown> });
      }
    } catch {
      console.warn(`makora: [Qwen] failed to parse tool call args: ${rawArgs.slice(0, 200)}`);
    }
  }
  if (results.length === 0) {
    console.debug(`makora: [Qwen] no tool calls extracted from text (${text.length}B)`);
  }
  return results;
}

function parseToolCallsFromText(model: string, text: string): ParsedToolCall[] {
  // Early return: skip regex scan if text lacks tool call markers
  if (!text.includes("<tool_call>") && !text.includes("<|tool_call_begin|>") && !text.includes("<function=")) {
    return [];
  }
  if (model === GLM_5_1_ID) return parseGlmToolCalls(text);
  if (model === KIMI_K2_6_ID || model === KIMI_K2_7_ID) return parseKimiToolCalls(text);
  if (model === QWEN_3_6_27B_ID || model === QWEN_3_6_35B_ID) return parseQwenToolCalls(text);
  return [];
}

// ─── GLM 5.1 tool_calls → XML converter ──────────────────────────────────

/** Convert ToolCall blocks back to GLM's native <tool_call> XML format. */
function toolCallsToGlmXml(toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>): string {
  return toolCalls.map(tc => {
    const argsJson = JSON.stringify(tc.arguments);
    return `<tool_call>\n<tool_name>${tc.name}</tool_name>\n<parameters>${argsJson}</parameters>\n</tool_call>`;
  }).join("\n");
}

// ─── Message repair helpers ──────────────────────────────────────────────

interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

/** Check if an assistant message already has properly parsed ToolCall blocks. */
function hasToolCallBlocks(content: ContentBlock[]): boolean {
  return content.some(block => block.type === "toolCall");
}

/** Extract concatenated text from TextContent blocks. */
function extractText(content: ContentBlock[]): string {
  return content
    .filter(block => block.type === "text")
    .map(block => (block as { text: string }).text)
    .join("");
}

/** Build a new content array with raw tool call text replaced by ToolCall blocks. */
function buildRepairedContent(
  original: ContentBlock[],
  parsed: ParsedToolCall[],
  textBeforeTools: string,
): ContentBlock[] {
  const result: ContentBlock[] = [];

  // Keep non-text blocks (thinking, etc.) and pre-tool text
  let addedText = false;
  for (const block of original) {
    if (block.type === "text") {
      if (!addedText) {
        if (textBeforeTools) {
          result.push({ type: "text", text: textBeforeTools });
        }
        addedText = true;
      }
      // Skip original text — replaced below
    } else {
      result.push(block);
    }
  }
  if (!addedText && textBeforeTools) {
    result.push({ type: "text", text: textBeforeTools });
  }

  // Append parsed tool calls
  for (let i = 0; i < parsed.length; i++) {
    const tc = parsed[i];
    result.push({
      type: "toolCall",
      id: `call_${randomUUID()}`,
      name: tc.name,
      arguments: tc.arguments,
    });
  }

  return result;
}

/** Find where tool call tokens begin in text. Returns text before the first tool call marker. */
function splitBeforeTools(model: string, text: string): string {
  if (model === GLM_5_1_ID) {
    const idx = text.indexOf("<tool_call>");
    return idx >= 0 ? text.slice(0, idx).trimEnd() : text;
  }
  if (model === KIMI_K2_6_ID || model === KIMI_K2_7_ID) {
    const idx = text.indexOf("<|tool_call_begin|>");
    return idx >= 0 ? text.slice(0, idx).trimEnd() : text;
  }
  if (model === QWEN_3_6_27B_ID || model === QWEN_3_6_35B_ID) {
    const cleaned = text.replace(/█/g, "");
    const idx = cleaned.indexOf("<function=");
    return idx >= 0 ? text.slice(0, idx).trimEnd() : text;
  }
  return text;
}

// ─── Provider entry point ──────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const embeddedModels = loadJson<JsonModel[]>("models.json");
  const customModels = loadJson<JsonModel[]>("custom-models.json");
  const patches = loadJson<PatchMap>("patch.json");

  const models = buildModels(embeddedModels, customModels, patches);

  const apiKey = resolveMakoraApiKey();

  pi.registerProvider(PROVIDER_ID, {
    name: "Makora",
    baseUrl: BASE_URL,
    ...(apiKey ? { apiKey } : {}),
    api: "openai-completions",
    models,
    oauth: {
      name: "Makora",
      login: loginMakora,
      async refreshToken(credentials: MakoraOAuthCredentials): Promise<MakoraOAuthCredentials> {
        return credentials;
      },
      getApiKey(credentials: MakoraOAuthCredentials): string {
        return credentials.access;
      },
    },
  });

  // vLLM thinking param rewrites + tool_choice disable for Kimi/Qwen
  pi.on("before_provider_request", (event) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload.model !== "string") return;
    return rewriteVllmPayload(payload);
  });

  // Parse raw tool call tokens into proper ToolCall blocks after each message
  pi.on("message_end", (event) => {
    const msg = event.message;
    if (msg.role !== "assistant") return;

    const model = (msg as Record<string, unknown>).model as string | undefined;
    if (!model || !TOOL_CALL_REPAIR_MODELS.has(model)) return;

    const content = msg.content as ContentBlock[];
    if (hasToolCallBlocks(content)) return; // already parsed — nothing to do

    const text = extractText(content);
    if (!text) return;

    const parsed = parseToolCallsFromText(model, text);
    if (parsed.length === 0) {
      console.debug(`makora: [${model}] tool call repair returned empty — raw text may contain unrecognized format`);
      return;
    }

    const textBefore = splitBeforeTools(model, text);
    const repaired = buildRepairedContent(content, parsed, textBefore);

    return {
      message: {
        ...msg,
        content: repaired,
      } as typeof msg,
    };
  });

  // GLM 5.1: strip tool_calls from assistant messages before follow-up requests.
  // vLLM crashes (500) on any assistant message containing a tool_calls field.
  pi.on("context", (event) => {
    const messages = event.messages;
    let changed = false;

    const repaired = messages.map((msg) => {
      if (msg.role !== "assistant") return msg;

      const model = (msg as Record<string, unknown>).model as string | undefined;
      if (!model || !GLM_TOOL_CALL_STRIP_MODELS.has(model)) return msg;

      const content = msg.content as ContentBlock[];
      const toolCalls = content.filter(block => block.type === "toolCall");
      if (toolCalls.length === 0) return msg;

      // Convert ToolCall blocks back to <tool_call> XML text
      const xmlText = toolCallsToGlmXml(toolCalls.map(tc => ({
        name: (tc as { name: string }).name,
        arguments: (tc as { arguments: Record<string, unknown> }).arguments,
      })));

      // Keep non-toolCall blocks, append XML as text
      const nonToolBlocks = content.filter(block => block.type !== "toolCall");
      const newContent = [
        ...nonToolBlocks,
        { type: "text", text: xmlText },
      ];

      changed = true;
      return { ...msg, content: newContent } as typeof msg;
    });

    if (changed) {
      return { messages: repaired };
    }
  });
}

