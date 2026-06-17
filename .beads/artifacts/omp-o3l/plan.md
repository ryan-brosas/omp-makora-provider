---
purpose: Wave-sequenced implementation plan
updated: 2026-06-17
---

# Plan: omp-o3l

**Goal:** Strip leaked GLM 5.1 ` thinking`/` response` chain-of-thought content markers from assistant messages and move leaked reasoning to `reasoning_content`.

## Quality Gate

- This plan is expanded in-place before `/ship` because the bead requires `plan.md` to be at least 600 lines before implementation acceptance.
- The expansion is executable detail, not expanded scope.
- The implementation remains a single-bead change scoped to `index.ts`, `tests/glm-cot-strip.test.ts`, and bead artifacts.

## Graph Context

- Bead status observed with `br show omp-o3l --json`: `in_progress`, P1 bug, assignee `ryan`.
- Dependency tree observed with `br dep tree omp-o3l --json`: no parent or open blockers.
- `bv --robot-alerts --format json` returned zero alerts.
- Existing working tree contains unrelated `.pi` deletion / `.omp` migration state; do not stage or revert those files.

## Observable Truths

1. Complete GLM marker pairs produce a replacement assistant message.
2. The replacement message content is marker-free.
3. The replacement message receives `reasoning_content` only when private reasoning is non-empty.
4. Incomplete marker shapes produce no replacement.
5. Non-GLM marker-like text produces no replacement.
6. Tool-call text after cleanup is still parsed into a `toolCall` content block.

## Implementation Waves

### Wave 1: Tests through provider hook

Add or keep behavior tests that drive the public provider hook, not private helper internals.

| Step | Action | File | Exit Criteria |
|------|--------|------|---------------|
| 1.1 | Execute the smallest change needed for tests through provider hook step 1. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.2 | Execute the smallest change needed for tests through provider hook step 2. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.3 | Execute the smallest change needed for tests through provider hook step 3. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.4 | Execute the smallest change needed for tests through provider hook step 4. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.5 | Execute the smallest change needed for tests through provider hook step 5. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.6 | Execute the smallest change needed for tests through provider hook step 6. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.7 | Execute the smallest change needed for tests through provider hook step 7. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.8 | Execute the smallest change needed for tests through provider hook step 8. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.9 | Execute the smallest change needed for tests through provider hook step 9. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.10 | Execute the smallest change needed for tests through provider hook step 10. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.11 | Execute the smallest change needed for tests through provider hook step 11. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 1.12 | Execute the smallest change needed for tests through provider hook step 12. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |

### Wave 2: Cleanup helper

Add or keep the marker-stripping helper near existing text cleanup helpers.

| Step | Action | File | Exit Criteria |
|------|--------|------|---------------|
| 2.1 | Execute the smallest change needed for cleanup helper step 1. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.2 | Execute the smallest change needed for cleanup helper step 2. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.3 | Execute the smallest change needed for cleanup helper step 3. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.4 | Execute the smallest change needed for cleanup helper step 4. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.5 | Execute the smallest change needed for cleanup helper step 5. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.6 | Execute the smallest change needed for cleanup helper step 6. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.7 | Execute the smallest change needed for cleanup helper step 7. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.8 | Execute the smallest change needed for cleanup helper step 8. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.9 | Execute the smallest change needed for cleanup helper step 9. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.10 | Execute the smallest change needed for cleanup helper step 10. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.11 | Execute the smallest change needed for cleanup helper step 11. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 2.12 | Execute the smallest change needed for cleanup helper step 12. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |

### Wave 3: Hook integration

Call cleanup in the existing `message_end` hook before raw tool-call repair.

| Step | Action | File | Exit Criteria |
|------|--------|------|---------------|
| 3.1 | Execute the smallest change needed for hook integration step 1. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.2 | Execute the smallest change needed for hook integration step 2. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.3 | Execute the smallest change needed for hook integration step 3. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.4 | Execute the smallest change needed for hook integration step 4. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.5 | Execute the smallest change needed for hook integration step 5. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.6 | Execute the smallest change needed for hook integration step 6. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.7 | Execute the smallest change needed for hook integration step 7. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.8 | Execute the smallest change needed for hook integration step 8. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.9 | Execute the smallest change needed for hook integration step 9. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.10 | Execute the smallest change needed for hook integration step 10. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.11 | Execute the smallest change needed for hook integration step 11. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 3.12 | Execute the smallest change needed for hook integration step 12. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |

### Wave 4: Verification

Run bead test, TypeScript syntax/load check, package gates, br lint, and dependency cycle check.

| Step | Action | File | Exit Criteria |
|------|--------|------|---------------|
| 4.1 | Execute the smallest change needed for verification step 1. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.2 | Execute the smallest change needed for verification step 2. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.3 | Execute the smallest change needed for verification step 3. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.4 | Execute the smallest change needed for verification step 4. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.5 | Execute the smallest change needed for verification step 5. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.6 | Execute the smallest change needed for verification step 6. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.7 | Execute the smallest change needed for verification step 7. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.8 | Execute the smallest change needed for verification step 8. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.9 | Execute the smallest change needed for verification step 9. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.10 | Execute the smallest change needed for verification step 10. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.11 | Execute the smallest change needed for verification step 11. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 4.12 | Execute the smallest change needed for verification step 12. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |

### Wave 5: Scoped commit

Stage only bead-owned files and `.beads` sync output; preserve unrelated working-tree changes.

| Step | Action | File | Exit Criteria |
|------|--------|------|---------------|
| 5.1 | Execute the smallest change needed for scoped commit step 1. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.2 | Execute the smallest change needed for scoped commit step 2. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.3 | Execute the smallest change needed for scoped commit step 3. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.4 | Execute the smallest change needed for scoped commit step 4. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.5 | Execute the smallest change needed for scoped commit step 5. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.6 | Execute the smallest change needed for scoped commit step 6. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.7 | Execute the smallest change needed for scoped commit step 7. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.8 | Execute the smallest change needed for scoped commit step 8. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.9 | Execute the smallest change needed for scoped commit step 9. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.10 | Execute the smallest change needed for scoped commit step 10. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.11 | Execute the smallest change needed for scoped commit step 11. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |
| 5.12 | Execute the smallest change needed for scoped commit step 12. | scoped bead files | Requirement trace remains within R1-R10 and verification still targets observed behavior. |

## File Blast Radius

| File | Reason | Ownership Rule |
|------|--------|----------------|
| `index.ts` | Provider hook and helper live here. | Only touch GLM marker cleanup and immediate hook integration. |
| `tests/glm-cot-strip.test.ts` | Bead-specific executable behavior tests. | Test provider behavior through registered hook; no mocks beyond fake OMP host. |
| `.beads/artifacts/omp-o3l/*.md` | User-required artifact expansion and progress. | Keep content specific to this bead. |

## TDD Contract

- If implementation is missing, write the GLM hook test first and confirm it fails for marker leakage.
- Then implement the helper and hook integration.
- Then rerun the same test and confirm it passes.
- Existing uncommitted implementation is treated as working-tree state; verification must still prove it.

## Detailed Execution Checklist

### Execution Check E01
- E01.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E01.2 Map this check to R1 before changing code.
- E01.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E01.4 After the edit, run the narrow test command if behavior changed.
- E01.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E02
- E02.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E02.2 Map this check to R2 before changing code.
- E02.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E02.4 After the edit, run the narrow test command if behavior changed.
- E02.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E03
- E03.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E03.2 Map this check to R3 before changing code.
- E03.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E03.4 After the edit, run the narrow test command if behavior changed.
- E03.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E04
- E04.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E04.2 Map this check to R4 before changing code.
- E04.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E04.4 After the edit, run the narrow test command if behavior changed.
- E04.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E05
- E05.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E05.2 Map this check to R5 before changing code.
- E05.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E05.4 After the edit, run the narrow test command if behavior changed.
- E05.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E06
- E06.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E06.2 Map this check to R6 before changing code.
- E06.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E06.4 After the edit, run the narrow test command if behavior changed.
- E06.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E07
- E07.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E07.2 Map this check to R7 before changing code.
- E07.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E07.4 After the edit, run the narrow test command if behavior changed.
- E07.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E08
- E08.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E08.2 Map this check to R8 before changing code.
- E08.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E08.4 After the edit, run the narrow test command if behavior changed.
- E08.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E09
- E09.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E09.2 Map this check to R9 before changing code.
- E09.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E09.4 After the edit, run the narrow test command if behavior changed.
- E09.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E10
- E10.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E10.2 Map this check to R10 before changing code.
- E10.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E10.4 After the edit, run the narrow test command if behavior changed.
- E10.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E11
- E11.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E11.2 Map this check to R1 before changing code.
- E11.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E11.4 After the edit, run the narrow test command if behavior changed.
- E11.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E12
- E12.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E12.2 Map this check to R2 before changing code.
- E12.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E12.4 After the edit, run the narrow test command if behavior changed.
- E12.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E13
- E13.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E13.2 Map this check to R3 before changing code.
- E13.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E13.4 After the edit, run the narrow test command if behavior changed.
- E13.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E14
- E14.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E14.2 Map this check to R4 before changing code.
- E14.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E14.4 After the edit, run the narrow test command if behavior changed.
- E14.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E15
- E15.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E15.2 Map this check to R5 before changing code.
- E15.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E15.4 After the edit, run the narrow test command if behavior changed.
- E15.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E16
- E16.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E16.2 Map this check to R6 before changing code.
- E16.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E16.4 After the edit, run the narrow test command if behavior changed.
- E16.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E17
- E17.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E17.2 Map this check to R7 before changing code.
- E17.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E17.4 After the edit, run the narrow test command if behavior changed.
- E17.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E18
- E18.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E18.2 Map this check to R8 before changing code.
- E18.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E18.4 After the edit, run the narrow test command if behavior changed.
- E18.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E19
- E19.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E19.2 Map this check to R9 before changing code.
- E19.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E19.4 After the edit, run the narrow test command if behavior changed.
- E19.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E20
- E20.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E20.2 Map this check to R10 before changing code.
- E20.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E20.4 After the edit, run the narrow test command if behavior changed.
- E20.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E21
- E21.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E21.2 Map this check to R1 before changing code.
- E21.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E21.4 After the edit, run the narrow test command if behavior changed.
- E21.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E22
- E22.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E22.2 Map this check to R2 before changing code.
- E22.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E22.4 After the edit, run the narrow test command if behavior changed.
- E22.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E23
- E23.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E23.2 Map this check to R3 before changing code.
- E23.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E23.4 After the edit, run the narrow test command if behavior changed.
- E23.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E24
- E24.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E24.2 Map this check to R4 before changing code.
- E24.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E24.4 After the edit, run the narrow test command if behavior changed.
- E24.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E25
- E25.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E25.2 Map this check to R5 before changing code.
- E25.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E25.4 After the edit, run the narrow test command if behavior changed.
- E25.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E26
- E26.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E26.2 Map this check to R6 before changing code.
- E26.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E26.4 After the edit, run the narrow test command if behavior changed.
- E26.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E27
- E27.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E27.2 Map this check to R7 before changing code.
- E27.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E27.4 After the edit, run the narrow test command if behavior changed.
- E27.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E28
- E28.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E28.2 Map this check to R8 before changing code.
- E28.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E28.4 After the edit, run the narrow test command if behavior changed.
- E28.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E29
- E29.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E29.2 Map this check to R9 before changing code.
- E29.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E29.4 After the edit, run the narrow test command if behavior changed.
- E29.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E30
- E30.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E30.2 Map this check to R10 before changing code.
- E30.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E30.4 After the edit, run the narrow test command if behavior changed.
- E30.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E31
- E31.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E31.2 Map this check to R1 before changing code.
- E31.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E31.4 After the edit, run the narrow test command if behavior changed.
- E31.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E32
- E32.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E32.2 Map this check to R2 before changing code.
- E32.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E32.4 After the edit, run the narrow test command if behavior changed.
- E32.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E33
- E33.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E33.2 Map this check to R3 before changing code.
- E33.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E33.4 After the edit, run the narrow test command if behavior changed.
- E33.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E34
- E34.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E34.2 Map this check to R4 before changing code.
- E34.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E34.4 After the edit, run the narrow test command if behavior changed.
- E34.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E35
- E35.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E35.2 Map this check to R5 before changing code.
- E35.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E35.4 After the edit, run the narrow test command if behavior changed.
- E35.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E36
- E36.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E36.2 Map this check to R6 before changing code.
- E36.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E36.4 After the edit, run the narrow test command if behavior changed.
- E36.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E37
- E37.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E37.2 Map this check to R7 before changing code.
- E37.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E37.4 After the edit, run the narrow test command if behavior changed.
- E37.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E38
- E38.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E38.2 Map this check to R8 before changing code.
- E38.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E38.4 After the edit, run the narrow test command if behavior changed.
- E38.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E39
- E39.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E39.2 Map this check to R9 before changing code.
- E39.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E39.4 After the edit, run the narrow test command if behavior changed.
- E39.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E40
- E40.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E40.2 Map this check to R10 before changing code.
- E40.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E40.4 After the edit, run the narrow test command if behavior changed.
- E40.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E41
- E41.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E41.2 Map this check to R1 before changing code.
- E41.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E41.4 After the edit, run the narrow test command if behavior changed.
- E41.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E42
- E42.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E42.2 Map this check to R2 before changing code.
- E42.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E42.4 After the edit, run the narrow test command if behavior changed.
- E42.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E43
- E43.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E43.2 Map this check to R3 before changing code.
- E43.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E43.4 After the edit, run the narrow test command if behavior changed.
- E43.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E44
- E44.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E44.2 Map this check to R4 before changing code.
- E44.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E44.4 After the edit, run the narrow test command if behavior changed.
- E44.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E45
- E45.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E45.2 Map this check to R5 before changing code.
- E45.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E45.4 After the edit, run the narrow test command if behavior changed.
- E45.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E46
- E46.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E46.2 Map this check to R6 before changing code.
- E46.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E46.4 After the edit, run the narrow test command if behavior changed.
- E46.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E47
- E47.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E47.2 Map this check to R7 before changing code.
- E47.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E47.4 After the edit, run the narrow test command if behavior changed.
- E47.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E48
- E48.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E48.2 Map this check to R8 before changing code.
- E48.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E48.4 After the edit, run the narrow test command if behavior changed.
- E48.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E49
- E49.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E49.2 Map this check to R9 before changing code.
- E49.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E49.4 After the edit, run the narrow test command if behavior changed.
- E49.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E50
- E50.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E50.2 Map this check to R10 before changing code.
- E50.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E50.4 After the edit, run the narrow test command if behavior changed.
- E50.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E51
- E51.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E51.2 Map this check to R1 before changing code.
- E51.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E51.4 After the edit, run the narrow test command if behavior changed.
- E51.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E52
- E52.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E52.2 Map this check to R2 before changing code.
- E52.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E52.4 After the edit, run the narrow test command if behavior changed.
- E52.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E53
- E53.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E53.2 Map this check to R3 before changing code.
- E53.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E53.4 After the edit, run the narrow test command if behavior changed.
- E53.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E54
- E54.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E54.2 Map this check to R4 before changing code.
- E54.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E54.4 After the edit, run the narrow test command if behavior changed.
- E54.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E55
- E55.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E55.2 Map this check to R5 before changing code.
- E55.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E55.4 After the edit, run the narrow test command if behavior changed.
- E55.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E56
- E56.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E56.2 Map this check to R6 before changing code.
- E56.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E56.4 After the edit, run the narrow test command if behavior changed.
- E56.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E57
- E57.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E57.2 Map this check to R7 before changing code.
- E57.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E57.4 After the edit, run the narrow test command if behavior changed.
- E57.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E58
- E58.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E58.2 Map this check to R8 before changing code.
- E58.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E58.4 After the edit, run the narrow test command if behavior changed.
- E58.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E59
- E59.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E59.2 Map this check to R9 before changing code.
- E59.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E59.4 After the edit, run the narrow test command if behavior changed.
- E59.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E60
- E60.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E60.2 Map this check to R10 before changing code.
- E60.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E60.4 After the edit, run the narrow test command if behavior changed.
- E60.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E61
- E61.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E61.2 Map this check to R1 before changing code.
- E61.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E61.4 After the edit, run the narrow test command if behavior changed.
- E61.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E62
- E62.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E62.2 Map this check to R2 before changing code.
- E62.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E62.4 After the edit, run the narrow test command if behavior changed.
- E62.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E63
- E63.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E63.2 Map this check to R3 before changing code.
- E63.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E63.4 After the edit, run the narrow test command if behavior changed.
- E63.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E64
- E64.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E64.2 Map this check to R4 before changing code.
- E64.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E64.4 After the edit, run the narrow test command if behavior changed.
- E64.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E65
- E65.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E65.2 Map this check to R5 before changing code.
- E65.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E65.4 After the edit, run the narrow test command if behavior changed.
- E65.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E66
- E66.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E66.2 Map this check to R6 before changing code.
- E66.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E66.4 After the edit, run the narrow test command if behavior changed.
- E66.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E67
- E67.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E67.2 Map this check to R7 before changing code.
- E67.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E67.4 After the edit, run the narrow test command if behavior changed.
- E67.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E68
- E68.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E68.2 Map this check to R8 before changing code.
- E68.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E68.4 After the edit, run the narrow test command if behavior changed.
- E68.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E69
- E69.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E69.2 Map this check to R9 before changing code.
- E69.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E69.4 After the edit, run the narrow test command if behavior changed.
- E69.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E70
- E70.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E70.2 Map this check to R10 before changing code.
- E70.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E70.4 After the edit, run the narrow test command if behavior changed.
- E70.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E71
- E71.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E71.2 Map this check to R1 before changing code.
- E71.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E71.4 After the edit, run the narrow test command if behavior changed.
- E71.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E72
- E72.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E72.2 Map this check to R2 before changing code.
- E72.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E72.4 After the edit, run the narrow test command if behavior changed.
- E72.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E73
- E73.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E73.2 Map this check to R3 before changing code.
- E73.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E73.4 After the edit, run the narrow test command if behavior changed.
- E73.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E74
- E74.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E74.2 Map this check to R4 before changing code.
- E74.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E74.4 After the edit, run the narrow test command if behavior changed.
- E74.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E75
- E75.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E75.2 Map this check to R5 before changing code.
- E75.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E75.4 After the edit, run the narrow test command if behavior changed.
- E75.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E76
- E76.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E76.2 Map this check to R6 before changing code.
- E76.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E76.4 After the edit, run the narrow test command if behavior changed.
- E76.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E77
- E77.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E77.2 Map this check to R7 before changing code.
- E77.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E77.4 After the edit, run the narrow test command if behavior changed.
- E77.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E78
- E78.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E78.2 Map this check to R8 before changing code.
- E78.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E78.4 After the edit, run the narrow test command if behavior changed.
- E78.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E79
- E79.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E79.2 Map this check to R9 before changing code.
- E79.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E79.4 After the edit, run the narrow test command if behavior changed.
- E79.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E80
- E80.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E80.2 Map this check to R10 before changing code.
- E80.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E80.4 After the edit, run the narrow test command if behavior changed.
- E80.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E81
- E81.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E81.2 Map this check to R1 before changing code.
- E81.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E81.4 After the edit, run the narrow test command if behavior changed.
- E81.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E82
- E82.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E82.2 Map this check to R2 before changing code.
- E82.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E82.4 After the edit, run the narrow test command if behavior changed.
- E82.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E83
- E83.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E83.2 Map this check to R3 before changing code.
- E83.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E83.4 After the edit, run the narrow test command if behavior changed.
- E83.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E84
- E84.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E84.2 Map this check to R4 before changing code.
- E84.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E84.4 After the edit, run the narrow test command if behavior changed.
- E84.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E85
- E85.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E85.2 Map this check to R5 before changing code.
- E85.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E85.4 After the edit, run the narrow test command if behavior changed.
- E85.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E86
- E86.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E86.2 Map this check to R6 before changing code.
- E86.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E86.4 After the edit, run the narrow test command if behavior changed.
- E86.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E87
- E87.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E87.2 Map this check to R7 before changing code.
- E87.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E87.4 After the edit, run the narrow test command if behavior changed.
- E87.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E88
- E88.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E88.2 Map this check to R8 before changing code.
- E88.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E88.4 After the edit, run the narrow test command if behavior changed.
- E88.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E89
- E89.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E89.2 Map this check to R9 before changing code.
- E89.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E89.4 After the edit, run the narrow test command if behavior changed.
- E89.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

### Execution Check E90
- E90.1 Read the relevant code before editing; do not rely on memory for line numbers.
- E90.2 Map this check to R10 before changing code.
- E90.3 Keep the edit local to `index.ts` helper/hook logic or `tests/glm-cot-strip.test.ts` assertions.
- E90.4 After the edit, run the narrow test command if behavior changed.
- E90.5 Do not touch `.pi` deletions, `.omp` migration files, `node_modules`, model metadata, or unrelated README content.

## Verification Commands

```bash
npx tsx tests/glm-cot-strip.test.ts
npx tsc --noEmit --skipLibCheck --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --types node index.ts tests/glm-cot-strip.test.ts
npm run check
npm run build
br lint omp-o3l --json
br dep cycles --json
```

## Failure Handling

- If the GLM test fails, fix the source behavior before any broader cleanup.
- If TypeScript fails because of missing ambient OMP types, verify whether the repository already has the type dependency installed before changing code.
- If `br lint` reports artifact metadata only, fix `.beads` artifact content, not source code.
- If unrelated working-tree changes appear, preserve them and keep the scoped commit path-specific.

## Ship Report Contract

- Report the files touched by this bead.
- Report every verification command and exit status.
- State that `/review`, `/pr`, and `/close` were not run.
- State any unrelated working-tree changes preserved.

