# pi-core

A pi template with br (beads) as the task tracking backbone. Graph-informed workflow — bv's 41 robot commands drive every phase. Clean, fast, minimal.

## The Workflow

Every piece of work flows through br beads. bv's graph intelligence informs every decision.

**Lean by default; burn tokens explicitly.** The normal workflow stays clean and predictable. Extra LLM/sub-agent calls are opt-in via `/deep-plan`, `/review-ensemble`, or `/council`.

```
/init → /brainstorm → /create → /plan → /ship → /verify → /review
```

Or load the **orchestrator** skill to chain these phases automatically — the agent reads the graph and decides which phase to enter next.

## Workflow Enforcement

The workflow-gate extension (`.pi/extensions/workflow-gate.ts`) enforces the workflow. It blocks `edit`/`write` tools until required artifacts exist.

**You MUST follow the workflow:**
1. /brainstorm → /create → /plan → /ship → /verify → /review → PR
2. Each prompt checks its prerequisites. If it says "run X first," do it.
3. Do not fight the gate. If blocked, run the prerequisite.

**What gets blocked:**
| Tool | Condition | Error |
|------|-----------|-------|
| edit | No PRD for active bead | "Run /create first" |
| edit | No plan for active bead | "Run /plan first" |
| write | Same as edit | Same |

**What always passes:**
- Reading files (read tool, read-only bash)
- Writing to `.beads/` and `.pi/` (workflow files)
- Running `bv`, `br`, `git status`, `git diff`

**Bypass:** `PI_SKIP_WORKFLOW=1` (emergencies only).

| Command | What It Does | bv Commands Used |
|---------|-------------|-----------------|
| `/init` | Initialize project memory + br workspace | — |
| `/brainstorm` | Ideation from graph data | triage, suggest, priority, label-attention, plan, search |
| `/create` | Formalize into bead + PRD | triage, suggest, plan, search, label-health, priority |
| `/plan` | Wave-sequence with blast radius | plan, insights, impact, impact-network, blocker-chain, forecast, capacity, file-hotspots, suggest |
| `/ship` | Implement with file awareness | triage, alerts, related, impact, file-beads, file-relations |
| `/verify` | Verify against blast radius | triage, alerts, impact, impact-network, blocker-chain, capacity |
| `/review` | Lean single-pass review with file history | impact, related, file-beads, file-relations, suggest |
| `/pr` | Create GitHub PR from artifacts, link back to br | changelog, comments |
| `/deep-plan` | TOKEN-BURN: scout + analyst enriched planning | plan, impact, impact-network, file-hotspots, forecast |
| `/review-ensemble` | TOKEN-BURN: bounded parallel correctness/security/performance review | impact, related, delegate tasks |
| `/council` | TOKEN-BURN: multi-perspective decision memo | impact, related, blocker-chain, delegate tasks |

## Auto-Commit Protocol

The `auto-commit` extension (`.pi/extensions/auto-commit.ts`) enforces commits at phase boundaries to keep the workspace clean.

### Phase Commits

| Phase | Trigger | Commit Message | How |
|-------|---------|----------------|-----|
| `/create` | Bead created + PRD written | `start: <bead-title>` | Agent runs `git add -A && git commit` after creating the bead |
| `/ship` | Implementation complete | `ship: <bead-title>` | Agent runs `git add -A && git commit` after /ship work |
| `/close` | Bead closed | `close: <bead-id> — <reason>` | Use `/close` command (auto-commits) |

### Commands

- **`/close <id> [--reason "text"]`** — Runs `br close` + auto-commit in one step. Prefer over raw `br close`.
- **`/commit [message]`** — Manual escape hatch. Commits all dirty state with the given message.

### Safety Net

If you run `br close <id>` directly in bash (not via `/close`), the extension detects it and auto-commits after success. But prefer `/close` — it's explicit.

### Rules

- Always commit after `/create` and `/ship` — these are agent-driven, not extension-driven
- If a commit has nothing to commit, that's fine — skip silently
- If `br close` fails, do NOT commit. Fix the blocker first, then retry.

## Sub-Agents

Sub-agents are opt-in helpers for deep modes and independent read-only checks. Configured in `.pi/settings.json`.

| Agent | Tools | Purpose |
|-------|-------|---------|
| `analyst` | read, bash | General analysis, review, synthesis |
| `scout` | read, bash | Codebase reconnaissance and file discovery |
| `reviewer-correctness` | read, bash | Logic errors, edge cases, contract violations |
| `reviewer-security` | read, bash | Injection, auth bypass, data exposure |
| `reviewer-performance` | read, bash | Complexity, memory, blocking I/O |

### When to Spawn

The main agent handles all implementation. Spawn sub-agents only when the user explicitly invokes a deep mode or when independent read-only review is needed:

| Intent | Why |
|--------|-----|
| `/deep-plan` | Scout + analyst enrichment before high-stakes planning |
| `/review-ensemble` | Bounded parallel specialist review |
| `/council` | Multi-perspective decision memo |
| Independent review before closing a bead | Worker distrust and spec/code drift checks |

### How to Spawn

```
delegate(agent="analyst", task="Review the auth module for security issues")
delegate(tasks=[
  { agent: "reviewer-correctness", task: "Review for logic errors" },
  { agent: "reviewer-security", task: "Review for security issues" }
])
```

### Worker Distrust

After every delegation, verify the result:
1. Read changed files directly (don't trust summaries)
2. Run verification commands
3. Check against acceptance criteria

### Model Configuration

Set models in `.pi/settings.json`:
```json
{
  "agents": {
    "scout": { "model": "xiaomi-token-plan-sgp/mimo-v2.5-pro", "thinkingLevel": "minimal" },
    "reviewer-correctness": { "model": "xiaomi-token-plan-sgp/mimo-v2.5-pro", "thinkingLevel": "high" }
  }
}
```

For Xiaomi token-plan MiMo models, Pi supports up to `thinkingLevel: "high"`; true `xhigh` requires another provider/model with explicit `xhigh` support. Keep fast reconnaissance agents lean, reserve `high` for explicit review/analysis token-burn lanes, and set `model: null` to inherit from parent session.

## bv Capabilities (41 robot commands)

| Category | Commands |
|----------|----------|
| **Triage** | robot-triage, robot-next, robot-alerts, robot-triage-by-label, robot-triage-by-track |
| **Planning** | robot-plan, robot-priority, robot-recipes |
| **Graph** | robot-insights, robot-graph |
| **Impact** | robot-impact, robot-impact-network, robot-causality, robot-blocker-chain |
| **Files** | robot-file-hotspots, robot-file-beads, robot-file-relations |
| **Related** | robot-related, robot-search |
| **History** | robot-diff, robot-history, robot-drift |
| **Forecast** | robot-forecast, robot-capacity |
| **Sprint** | robot-sprint-list, robot-sprint-show, robot-burndown |
| **Labels** | robot-label-health, robot-label-flow, robot-label-attention |
| **Hygiene** | robot-suggest, robot-orphans |
| **Correlations** | robot-explain-correlation, robot-confirm-correlation, robot-reject-correlation, robot-correlation-stats |
| **Schema** | robot-capabilities, robot-schema, robot-docs, robot-metrics, robot-help |

## br Conventions

- **Prefix:** `pi` (issues are `pi-001`, `pi-002`, ...)
- **Artifacts:** `.beads/artifacts/<bead-id>/` — prd.md, plan.md, solve-ledger.md, completion-evidence.json
- **Claim atomically:** `br update <id> --claim --json`
- **Inspect before mutate:** `br show <id> --json` before any state change
- **Sync safely:** `br sync --flush-only` after mutations
- **One task per session** — restart after `/close`
- **Use `/close` not `br close`** — auto-commits and catches errors
- **Notes survive compaction:** write COMPLETED / IN PROGRESS / NEXT / BLOCKERS
- **Priority:** P0=critical, P1=high, P2=medium, P3=low, P4=backlog (numbers, not words)

## Project Structure

```
pi-core/
├── AGENTS.md              # Delegates to .pi/AGENTS.md
├── .beads/                # br workspace (SQLite + JSONL)
├── .pi/
│   ├── AGENTS.md          # You are here — conventions, memory protocol, workflow
│   ├── settings.json
│   ├── skills/            # br + bv + cognitive tool skills
│   │   ├── br/SKILL.md
│   │   ├── bv/SKILL.md
│   │   ├── brainstorming/SKILL.md
│   │   ├── executing-plans/SKILL.md
│   │   ├── verification-before-completion/SKILL.md
│   │   ├── reconcile/SKILL.md
│   │   ├── orchestrator/SKILL.md
│   │   └── using-git-worktrees/SKILL.md
│   ├── agents/            # Sub-agent definitions (build, explore, review)
│   ├── extensions/        # Delegate + Honcho + Firecrawl + auto-commit
│   │   ├── delegate.ts    # Sub-agent delegation tool
│   │   ├── auto-commit.ts # Phase-boundary auto-commit (close, commit commands + hook)
│   │   ├── firecrawl.ts   # Web search, scrape, extract, map via Firecrawl
│   │   └── honcho/        # Honcho memory — 8 files, 10 tools, lifecycle hooks
│   ├── prompts/           # Graph-informed slash commands
│   ├── templates/         # Artifact templates
│   └── memory/
│       └── project/       # Durable project knowledge
├── package.json
└── README.md
```

## Philosophy

- **YAGNI** — if it doesn't solve a real problem today, it doesn't exist
- **Prune over pad** — more context is not better; fill the window with just the right information
- **Graph-informed** — every phase queries the graph before acting
- **Cognitive tools** — skills are decision trees, not reference manuals
- **Progressive disclosure** — lean core + references for deep content
- **Lean by default; burn tokens explicitly** — normal prompts avoid hidden sub-agent fanout; deep modes are opt-in
- **br is the backbone** — all work is tracked, all state is in beads
- **bv is the brain** — 41 robot commands for graph analysis
- **Honcho is the memory** — persistent cross-session memory with dialectic reasoning and theory-of-mind. ~1,500 lines, but the alternative is agents that forget everything between sessions. Worth the weight.
- **Agent-native** — designed for AI coding agents from day one

## Memory Protocol

At session start, load these files into context:

### Tier 1 — Always Load

```bash
cat .pi/memory/project/project.md      # What are we building?
cat .pi/memory/project/conventions.md  # How do we build?
```

These two files are the minimal viable context. Every agent session needs them.

### Tier 2 — On-Demand (load when relevant)

| File | Load When |
|------|-----------|
| `.pi/memory/project/tech-stack.md` | Task touches tooling, builds, or dependencies |
| `.pi/memory/project/gotchas.md` | Working near known hazards or debugging |
| `.pi/memory/project/decisions.md` | Making architectural choices or reviewing past decisions |

### Rules

- **Write-before-compaction** — extract durable facts to memory files BEFORE context fills
- **Consolidate, don't append** — rewrite files periodically, merge duplicates, remove stale entries
- **Context budget** — Tier 1 files must stay under 500 tokens combined
- **No secrets** — never write credentials, API keys, or tokens to memory files

## Guardrails

- Ask before commits, pushes, closes
- Never fabricate output
- Never expose secrets
- Max 3 fix cycles, then escalate
- completion-evidence.json must exist before br close
