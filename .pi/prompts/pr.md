---
description: "Create GitHub PR from bead artifacts. Gathers PRD, evidence, review, changelog → generates PR body → pushes → links back to br."
argument-hint: "<bead-id>"
---

You are creating a GitHub PR for a completed bead.

## Resolve Bead ID

```bash
BEAD_ID=$(bash .pi/scripts/resolve-bead.sh "$1") || exit 1
```

Use `$BEAD_ID` (not `$1`) in all commands below.

## Prerequisites (CHECK FIRST)

Before doing ANYTHING, verify:

1. Bead is closed: `br show $BEAD_ID --json`
   - If status is not `closed`: STOP. Tell user: "Run /verify and /review first — bead not closed."
2. Review approved: `rg "APPROVE" .beads/artifacts/$BEAD_ID/review-report.md`
   - If no APPROVE: STOP. Tell user: "Run /review first — no approved review found."
3. Evidence exists: `test -f .beads/artifacts/$BEAD_ID/completion-evidence.json`
   - If missing: STOP. Tell user: "Run /verify first — no completion evidence."
4. Git remote exists: `git remote -v`
   - If no remote: STOP. Tell user: "No git remote configured. Add one with `git remote add origin <url>`."

Do NOT proceed without all four.

## Phase 1: Gather Context

Read these files:

```bash
cat .beads/artifacts/$BEAD_ID/prd.md                    # PRD — summary, requirements, scope
cat .beads/artifacts/$BEAD_ID/completion-evidence.json  # Evidence — verification results
cat .beads/artifacts/$BEAD_ID/review-report.md          # Review — findings, verdict
```

Run these commands:

```bash
git diff $(git log --oneline | head -1 | cut -d' ' -f1)^..HEAD --stat  # Changed files
git branch --show-current                                                # Current branch
br show $BEAD_ID --json                                                  # Bead details
```

## Phase 2: Check Branch

```bash
BRANCH=$(git branch --show-current)
```

If on `main` or `master`:
- Ask user: "Currently on `$BRANCH`. Create a feature branch? (y/n)"
- If yes: `git checkout -b feat/$BEAD_ID`
- If no: continue on current branch

If on a feature branch: continue.

## Phase 3: Generate PR Body

Construct the PR body from gathered context. Use this structure:

```markdown
## Summary

[From PRD Problem section — one paragraph describing what this PR does and why]

## What Changed

[From PRD Scope section — bullet list of what's in scope]

## Acceptance Criteria

[From completion-evidence.json requirements_met — checklist]

- [x] [requirement 1] — [evidence]
- [x] [requirement 2] — [evidence]
- [ ] [requirement if FAILED] — [evidence]

## Review

[From review-report.md — verdict + findings summary]

**Verdict:** [APPROVE/BLOCK]
**Findings:** [count by severity]

## Changed Files

[From git diff --stat — table of files changed]

## Artifacts

- PRD: `.beads/artifacts/$BEAD_ID/prd.md`
- Plan: `.beads/artifacts/$BEAD_ID/plan.md`
- Evidence: `.beads/artifacts/$BEAD_ID/completion-evidence.json`
- Review: `.beads/artifacts/$BEAD_ID/review-report.md`

## Br Bead

- Bead: `$BEAD_ID`
- Status: closed
- Priority: [from br show]
```

## Phase 4: Ask Before Push

Show the user:
- Current branch
- Remote URL
- Changed files count
- PR title

Ask: "Ready to push and create PR? (y/n)"

If no: STOP. Tell user: "Aborted. Changes are committed locally."
If yes: continue.

## Phase 5: Push and Create PR

```bash
git push -u origin HEAD
```

If push fails (e.g., upstream not set): follow git's instructions to set upstream.

Try `gh pr create`:

```bash
gh pr create --title "[bead-id] title" --body "<generated body>" --base main
```

If `gh` is not installed or fails:
- Output the PR body to the user
- Tell user: "gh not available. Copy the body above and create PR manually at: <remote-url>/pull/new/<branch>"

## Phase 6: Link Back

If PR was created successfully:

```bash
br comments add $BEAD_ID --message "PR: <pr-url>"
```

## Phase 6b: Seed Honcho Memory

If honcho is connected (`honcho_status`), save PR link to persistent memory:

```bash
honcho_remember "PR for $BEAD_ID: <pr-url>"
```

This links the PR to the bead in honcho memory.

## Phase 7: Report

```
PR: <url> (or "manual — body output above")
Bead: $BEAD_ID
Branch: <branch>
Review: <verdict>
Evidence: <pass count>/<total>

Next steps:
1. Request review (if team workflow)
2. Merge when approved
3. Delete branch after merge
```

## Guardrails

- Ask before push — never auto-push
- If review is BLOCK, do not create PR — tell user to fix findings first
- If evidence has FAIL requirements, warn but allow PR creation (user decides)
- Cap PR body at 65536 characters (GitHub limit)
- If on main without wanting a feature branch, warn but proceed
