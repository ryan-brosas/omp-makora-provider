---
purpose: Wave-sequenced implementation plan
updated: 2026-06-17
---

# Plan: omp-tool-call-repair-hardening-307

**Goal:** Tool call repair pipeline emits diagnostics on failure, uses production-grade UUIDs, and implements the documented zaiToolStream feature.

## Graph Context

- **Blast radius:** `index.ts` only
- **Unblocks:** None (no downstream beads)
- **Blocked by:** omp-test-tool-call-parsers-8l6 (in_progress) — should complete first so unit tests exist, but no hard code dependency since our changes are additive
- **Critical path:** No — orphan bead
- **Forecast:** ~35 min (single file, 4 surgical changes)
- **Capacity:** 2 beads open (this + existing), 80 serial minutes, 0% parallelizable (both touch index.ts)
- **Graph position:** Orphan (sole node, no edges). Competing for index.ts with existing bead.

## Observable Truths

What must be TRUE for the goal to be achieved:

1. GLM 5.1 `before_provider_request` payloads include `tool_stream: true` when tools are present
2. All three parsers emit `console.warn` when `JSON.parse` fails on tool call arguments
3. `parseToolCallsFromText` returns `[]` immediately when text has no tool call marker strings
4. `buildRepairedContent` generates tool call IDs via `crypto.randomUUID()` (UUID v4 format)
5. TypeScript compiles cleanly (`npx tsc --noEmit index.ts`)
6. Existing parser tests (from omp-test-tool-call-parsers-8l6) continue to pass

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| Modified index.ts | All 4 changes (diagnostics, zaiToolStream, UUID, early-return) | `index.ts` | Need |
| (No new files) | — | — | — |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | 1.1 zaiToolStream fix, 1.2 UUID generation, 1.3 Early-return guard, 1.4 Diagnostic logging | Yes (4 independent sections of index.ts) | Existing bead complete (or at least its parser tests exist) | `npx tsc --noEmit index.ts` |
| 2 | 2.1 Verification: check zaiToolStream payload, UUID format, diagnostics fire, no regression | No (sequential checks) | Wave 1 complete | `npx tsx scripts/test-parsers.ts` exits 0; manual inspection of warnings |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-makora-provider
# Type check
npx tsc --noEmit index.ts

# Verify zaiToolStream is set (grep for tool_stream)
grep -n "tool_stream" index.ts

# Verify UUID import
grep -n "randomUUID" index.ts

# Verify diagnostics (grep for console.warn in parsers)
grep -n "console.warn" index.ts

# Run existing tests if available
npx tsx scripts/test-parsers.ts 2>/dev/null || echo "Test runner not yet available (depends on omp-test-tool-call-parsers-8l6)"
```
