---
purpose: Project vision, goals, and success criteria
updated: 2026-06-17
---

# Project: omp-makora-provider

## The Goal

OMP provider plugin that exposes Makora-hosted open-weight models (DeepSeek V4, Kimi K2.6, GLM 5.1, Qwen 3.6, etc.) with client-side tool call repair for vLLM streaming parser bugs, thinking parameter rewrites, and multi-model reasoning field normalization.

## Success Criteria

1. **Installable** — `omp plugin install omp-makora-provider` works end-to-end
2. **All models functional** — reasoning, tool calling, multi-turn conversations work for every listed model
3. **vLLM workarounds robust** — tool call repair (GLM, Kimi, Qwen) and payload rewrites (DeepSeek, MiniMax) handle edge cases without data loss
4. **Model sync reliable** — `scripts/update-models.js` correctly regenerates models.json and README table
5. **Well-tested** — test-reasoning.ts passes for all reasoning models; tool call repair has automated coverage
6. **Documented** — AGENTS.md and README accurately describe data flow, patching, and common tasks

## Current Phase

- **Status:** active
- **Milestone:** Production hardening — tool call repair robustness, test coverage, edge case handling
- **Next:** Add comprehensive test coverage for tool call repair parsers (GLM, Kimi, Qwen)
