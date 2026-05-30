# pi-makora-provider

Makora provider extension for [pi](https://github.com/earendil-works/pi-mono) — access open-weight models through the [Makora](https://inference.makora.com) inference optimization API.

## Models

| Model | ID | Reasoning | Notes |
|-------|----|-----------|-------|
| DeepSeek V4 Flash | `deepseek-ai/DeepSeek-V4-Flash` | No | Reasoning not supported on Makora's vLLM deployment |
| DeepSeek V4 Pro | `deepseek-ai/DeepSeek-V4-Pro` | No | Reasoning not supported on Makora's vLLM deployment |
| GLM 5.1 FP8 | `zai-org/GLM-5.1-FP8` | Yes | `enable_thinking` via `qwen-chat-template`; `zaiToolStream` enabled for tool streaming; CoT may leak into content on some vLLM builds |
| GPT-OSS 120B | `openai/gpt-oss-120b` | Yes | Reasoning always on |
| HY3 Preview | `hy3-preview` | No | |
| Kimi K2.6 NVFP4 | `nvidia/Kimi-K2.6-NVFP4` | Yes | Reasoning on by default; `tool_choice` stripped at request time (vLLM limitation) |
| Llama 3.3 70B FP8 | `amd/Llama-3.3-70B-Instruct-FP8-KV` | No | |
| Qwen 3.6 27B NVFP4 | `unsloth/Qwen3.6-27B-NVFP4` | Yes | `enable_thinking` via `qwen-chat-template` |
| Qwen 3.6 35B A3B NVFP4 | `unsloth/Qwen3.6-35B-A3B-NVFP4` | Yes | `enable_thinking` via `qwen-chat-template` |

## Setup

### API Key

Add your Makora API key to `~/.pi/agent/auth.json` (recommended):

```json
{
  "makora": { "type": "api_key", "key": "your-api-key" }
}
```

Or set it as an environment variable:

```bash
export MAKORA_OPTIMIZE_TOKEN=your-api-key
```

### Usage

```bash
pi -e /path/to/pi-makora-provider
```

Then use `/model` to select from available Makora models.

## Model Resolution

Makora does not expose a `/v1/models` endpoint, so models are statically defined in `models.json`. The resolution pipeline is:

```
embedded models.json → apply patch.json → merge custom-models.json
```

- **models.json**: Curated model definitions with per-model `baseUrl` overrides (each model lives at `https://inference.makora.com/{slug}/v1`). All models start as `reasoning: false` (conservative default).
- **patch.json**: Enables reasoning + thinkingFormat + supportsReasoningEffort for models that support it. Also adds vLLM-specific compat flags (e.g. `zaiToolStream` for GLM 5.1).
- **custom-models.json**: User-added models not in the embedded list

## Patching Models

Edit `patch.json` to override fields on existing models without modifying `models.json`:

```json
{
  "deepseek-ai/DeepSeek-V4-Flash": {
    "contextWindow": 1000000,
    "maxTokens": 384000,
    "reasoning": true,
    "compat": {
      "thinkingFormat": "qwen-chat-template",
      "supportsReasoningEffort": true
    }
  }
}
```

## Adding Custom Models

Add entries to `custom-models.json`:

```json
[
  {
    "id": "my-org/my-model",
    "name": "My Custom Model",
    "reasoning": false,
    "input": ["text"],
    "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
    "contextWindow": 131072,
    "maxTokens": 16384,
    "baseUrl": "https://inference.makora.com/my-model-slug/v1"
  }
]
```

## API Notes

- Each model is accessible at its own URL slug: `https://inference.makora.com/{slug}/v1/chat/completions`
- The API is OpenAI-compatible (chat completions format)
- No `/v1/models` endpoint is available; models must be manually maintained
- All models are hosted on vLLM
- The `developer` role is not supported (prompts are silently dropped); `supportsDeveloperRole` is set to `false` for all models

## vLLM Caveats

These issues are common to all vLLM-hosted providers and affect Makora models:

- **GLM 5.1 tool streaming**: vLLM's streaming parser omits `delta.tool_calls` when the model decides to call tools, finishing with `finish_reason: "tool_calls"` but an empty delta. `zaiToolStream: true` is set in patch.json to send `tool_stream: true` in the request, which forces the explicit tool streaming path. See [vllm-project/vllm#31319](https://github.com/vllm-project/vllm/issues/31319).

- **GLM 5.1 CoT leak**: On some vLLM builds, disabling reasoning may still leak chain-of-thought into `content` terminated by a `` ``` `` marker. See [vllm-project/vllm#31319](https://github.com/vllm-project/vllm/issues/31319).

- **Kimi K2.6 tool choice**: vLLM's Kimi deployment does not support the `tool_choice` parameter (missing `--enable-auto-tool-choice` / `--tool-call-parser`). The extension strips `tool_choice` from the payload via `before_provider_request` so tool use still works — the model can call tools, it just can't be forced via the parameter.

- **DeepSeek V4 reasoning**: The current vLLM deployment does not support DeepSeek V4 reasoning mode. `reasoning_content` is always null even when `thinking` is enabled. Both DeepSeek V4 models are registered as `reasoning: false`.
