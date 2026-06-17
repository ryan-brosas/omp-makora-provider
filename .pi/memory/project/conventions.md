---
purpose: How we build — naming, code style, workflow, agent conventions
updated: 2026-06-17
---

# Conventions: omp-makora-provider

## Naming

- **Files:** kebab-case (scripts/update-models.js), camelCase where conventional (custom-models.json)
- **Functions:** camelCase (TypeScript)
- **Constants:** UPPER_SNAKE_CASE (PROVIDER_ID, BASE_URL, model ID sets)
- **Model IDs:** `<org>/<Model-Name>` (as returned by Makora API)
- **Bead slugs:** kebab-case

## Languages by Purpose

| Purpose | Language | Notes |
|---------|----------|-------|
| Provider extension | TypeScript (strict) | index.ts — the main plugin entry point |
| Model sync script | JavaScript (ESM) | scripts/update-models.js |
| Model definitions | JSON | models.json, patch.json, custom-models.json |
| Tests | TypeScript | test-reasoning.ts |
| Documentation | Markdown | README.md, AGENTS.md |

## Data Flow (Critical Convention)

```
models.json (auto-generated, DO NOT EDIT)
    → apply patch.json (manual overrides — EDIT THIS)
    → merge custom-models.json (non-API models — EDIT THIS)
    → README table (auto-generated, DO NOT EDIT)
```

- **Never edit models.json** — edit patch.json instead
- **Never edit the README model table** — run `node scripts/update-models.js` instead
- **patch.json keys are model IDs** — entries merge via shallow object spread
- **custom-models.json is an array** — full model objects, same schema as models.json

## Git

- Branch: `<type>/<bead-id>-<slug>`
- Commit: conventional commits (feat:, fix:, chore:, docs:, test:)

## Workflow

1. Triage — `bv --robot-triage`
2. Claim — `br update <id> --claim`
3. Implement — follow plan
4. Verify — run commands, no claims without evidence
5. Close — `br close <id> --suggest-next`
6. Sync — `br sync --flush-only`

## Agent Conventions

- Evidence before claims
- Read before edit
- Ask before destructive
- One task per session
- Never implement without a bead or plan
- Never edit models.json directly
