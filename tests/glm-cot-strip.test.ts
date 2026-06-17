import { describe, expect, it } from "vitest";
import provider from "../index.ts";

type Handler = (event: { message: Record<string, unknown> }) => unknown;

interface FakePi {
  providers: Array<Record<string, unknown>>;
  handlers: Map<string, Handler[]>;
  registerProvider(id: string, config: Record<string, unknown>): void;
  on(event: string, handler: Handler): void;
}

const GLM_5_1_ID = "zai-org/GLM-5.1-FP8";
const DEEPSEEK_ID = "deepseek-ai/DeepSeek-V4-Pro";

function createFakePi(): FakePi {
  return {
    providers: [],
    handlers: new Map(),
    registerProvider(id, config) {
      this.providers.push({ id, config });
    },
    on(event, handler) {
      const existing = this.handlers.get(event) ?? [];
      existing.push(handler);
      this.handlers.set(event, existing);
    },
  };
}

function loadMessageEnd(): Handler {
  const pi = createFakePi();
  provider(pi as never);
  const handlers = pi.handlers.get("message_end") ?? [];
  expect(handlers).toHaveLength(1);
  return handlers[0]!;
}

function assistantMessage(model: string, text: string, extraContent: Record<string, unknown>[] = []) {
  return {
    role: "assistant",
    model,
    content: [
      { type: "text", text },
      ...extraContent,
    ],
  };
}

function runHook(message: Record<string, unknown>) {
  const hook = loadMessageEnd();
  return hook({ message }) as { message?: Record<string, unknown> } | undefined;
}

function expectMessage(result: { message?: Record<string, unknown> } | undefined): Record<string, unknown> {
  expect(result?.message).toBeTruthy();
  return result!.message!;
}

function textContent(message: Record<string, unknown>): string {
  const content = message.content as Array<Record<string, unknown>>;
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text as string)
    .join("");
}

function contentTypes(message: Record<string, unknown>): string[] {
  return (message.content as Array<Record<string, unknown>>).map((block) => block.type as string);
}

describe("GLM 5.1 leaked chain-of-thought marker stripping", () => {
  it("strips both markers and populates reasoning_content", () => {
    const msg = assistantMessage(GLM_5_1_ID, " thinking\nprivate reasoning\n response\nVisible answer.");
    const message = expectMessage(runHook(msg));
    expect(textContent(message)).toBe("Visible answer.");
    expect(message.reasoning_content).toBe("private reasoning");
    expect(textContent(message)).not.toMatch(/ thinking| response/);
  });

  it("passes through messages with neither marker unchanged", () => {
    const msg = assistantMessage(GLM_5_1_ID, "Visible answer without leaked markers.");
    expect(runHook(msg)).toBeUndefined();
  });

  it("passes through thinking-only partial leaks unchanged", () => {
    const msg = assistantMessage(GLM_5_1_ID, " thinking\nprivate reasoning without response marker");
    expect(runHook(msg)).toBeUndefined();
  });

  it("passes through response-only partial leaks unchanged", () => {
    const msg = assistantMessage(GLM_5_1_ID, " response\nVisible answer without thinking marker");
    expect(runHook(msg)).toBeUndefined();
  });

  it("cleans thinking before repairing GLM tool calls", () => {
    const msg = assistantMessage(
      GLM_5_1_ID,
      ' thinking\nI should call a tool.\n response\nI will check.\n<tool_call>\n<tool_name>lookup</tool_name>\n<parameters>{"query":"weather"}</parameters>\n</tool_call>'
    );
    const message = expectMessage(runHook(msg));
    expect(textContent(message)).toBe("I will check.");
    expect(message.reasoning_content).toBe("I should call a tool.");
    expect(contentTypes(message)).toEqual(["text", "toolCall"]);
    const toolCall = (message.content as Array<Record<string, unknown>>).find((block) => block.type === "toolCall");
    expect(toolCall?.name).toBe("lookup");
    expect(toolCall?.arguments).toEqual({ query: "weather" });
  });

  it("cleans content without setting reasoning_content when thinking is empty", () => {
    const msg = assistantMessage(GLM_5_1_ID, " thinking response\nVisible answer.");
    const message = expectMessage(runHook(msg));
    expect(textContent(message)).toBe("Visible answer.");
    expect(Object.prototype.hasOwnProperty.call(message, "reasoning_content")).toBe(false);
    expect(textContent(message)).not.toMatch(/ thinking| response/);
  });

  it("passes through wrong marker order unchanged", () => {
    const msg = assistantMessage(GLM_5_1_ID, " response\nVisible answer first. thinking\nlate reasoning");
    expect(runHook(msg)).toBeUndefined();
  });

  it("passes through non-GLM models unchanged even with marker text", () => {
    const msg = assistantMessage(DEEPSEEK_ID, " thinking\nnot GLM private text\n response\nVisible answer.");
    expect(runHook(msg)).toBeUndefined();
  });

  it("passes through marker pairs inside fenced code blocks unchanged", () => {
    const msg = assistantMessage(GLM_5_1_ID, "```\n thinking\nexample\n response\ncode\n```\nNo leak.");
    expect(runHook(msg)).toBeUndefined();
  });
});
