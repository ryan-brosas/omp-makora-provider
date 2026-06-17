---
purpose: Architecture decision records for bead
bead: omp-test-tool-call-parsers-8l6
updated: 2026-06-17
---

# Decisions: omp-test-tool-call-parsers-8l6

## Decision Log

| # | Date | Decision | Rationale | Confidence |
|---|------|----------|-----------|------------|
| 1 | 2026-06-17 | Zero-dependency test runner (tsx + inline assertions) | Plugin has no dependencies; adding vitest/jest would require package.json changes and `npm install`. Simple assertion-based runner keeps it lightweight and installable as-is. | High |
| 2 | 2026-06-17 | Inline parser functions in test file rather than importing from index.ts | ESM import from a sibling file via `file://` URL adds complexity. Inlining ensures tests are self-contained and don't depend on pi SDK types. | Medium |
| 3 | 2026-06-17 | Fix Qwen splitBeforeTools by using original text for both index and slice | Current code computes index on `█`-cleaned text but slices original. The fix: clean text first, then use both cleaned index AND cleaned slice. The `█` chars are delimiters between tool calls, not meaningful content. | High |
| 4 | 2026-06-17 | Default to [] for missing array JSON, {} for missing object JSON | `custom-models.json` is optional (no custom models is valid). `patch.json` is optional (no patches needed). `models.json` is NOT optional — it's the base model list. Missing models.json is a hard error. | High |

## Rejected Alternatives

- **Test framework (vitest/jest):** Adds complexity without value for this scope. 20+ test cases with inline assertions is sufficient.
- **Importing parsers from index.ts:** ESM path resolution adds fragility. Inlining guarantees test independence.
- **Not fixing splitBeforeTools:** The bug is currently harmless (█ only appears BETWEEN calls) but semantically wrong and fragile.
