---
purpose: Architecture and design decisions for this bead
updated: 2026-06-17
---

# Decisions: omp-tool-call-repair-hardening-307

| # | Date | Decision | Rationale | Confidence |
|---|------|----------|-----------|------------|
| 1 | 2026-06-17 | Hardcode GLM_5_1_ID for zaiToolStream instead of compat lookup | Only one model uses zaiToolStream; plumbing compat through rewriteVllmPayload adds indirection without benefit. If more models need it, refactor to a Set pattern (like DISABLE_TOOL_CHOICE_MODELS). | High |
| 2 | 2026-06-17 | Use `crypto.randomUUID()` not `crypto.randomBytes` | `randomUUID()` is one call, returns kebab-case UUID string directly. No hex encoding needed. Standard UUID v4 format is human-debuggable. | High |
| 3 | 2026-06-17 | Place `parseToolCallsFromText` zero-result debug in `message_end` hook, not in the function | Keeps `parseToolCallsFromText` pure (no side effects). The caller (`message_end`) has full context (model name, whether text had markers) for meaningful diagnostic. | High |
| 4 | 2026-06-17 | Truncate raw args to 200 chars in warn messages | Prevents log flooding from malformed multi-KB JSON blocks. 200 chars is enough to see the structural issue (missing braces, wrong quotes, etc.) without spamming. | High |
| 5 | 2026-06-17 | Single wave of parallel changes + verification wave | All changes are in index.ts but touch independent sections. Parallel work avoids sequencing overhead. Verification is sequential by nature (inspect then test). | Medium |
