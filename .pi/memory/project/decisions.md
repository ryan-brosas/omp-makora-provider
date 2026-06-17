---
purpose: Architecture decision records
updated: 2026-06-17
---

# Decisions: omp-makora-provider

## Decision Log

| # | Date | Decision | Rationale | Confidence |
|---|------|----------|-----------|------------|
| 1 | 2026-06 | Use br/bv for task tracking | pi-core template — graph-informed workflow | High |
| 2 | 2026-06 | Client-side tool call repair instead of waiting for vLLM fixes | vLLM streaming parser bugs for GLM/Kimi/Qwen are upstream issues with unknown fix timeline; client-side repair unblocks tool use immediately | High |
| 3 | 2026-06 | Monolithic index.ts instead of split modules | Single-file plugin with no build step; ~500 lines is manageable; splitting adds complexity without benefit for this scope | Medium |
| 4 | 2026-06 | JSON-based model definitions (models.json + patch.json + custom-models.json) instead of programmatic registration | Static files are easier to audit, diff, and sync from API; patch.json enables user overrides without code changes | High |
| 5 | 2026-06 | `before_provider_request` hook for vLLM param rewrites instead of per-model provider configs | Centralized payload transformation avoids duplicating logic across model registration; single hook handles all vLLM quirks | High |
| 6 | 2026-06 | `message_end` + `context` hooks for tool call repair instead of stream transformation | stream hooks would need to buffer and reassemble partial tokens; message_end gives complete text, context handles follow-up request normalization | High |
| 7 | 2026-06 | Makora API key as static OAuth credential (never expires) | Makora uses API tokens that don't rotate; OAuth flow provides uniform login UX without implementing refresh logic | Medium |
| 8 | 2026-06 | ESM (`"type": "module"`) | Pi harness loads plugins as ESM; consistent with modern Node.js ecosystem | High |
