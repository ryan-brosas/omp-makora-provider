---
purpose: Tech stack, versions, and verification commands
updated: 2026-06-17
---

# Tech Stack: omp-makora-provider

## Runtime

| Layer | Tool | Version |
|-------|------|---------|
| Language | TypeScript | strict mode (ESM) |
| Runtime | Node.js | LTS (v24+) |
| Platform | OMP (pi) | latest |
| SDK | @oh-my-pi/pi-coding-agent | latest (ExtensionAPI) |

## Key Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| @oh-my-pi/pi-coding-agent | Pi harness SDK (ExtensionAPI type, registerProvider, hooks) | latest |
| node:fs (built-in) | File I/O for reading JSON model definitions | built-in |
| br (beads_rust) | CLI task tracker | latest |
| bv (beads_viewer) | Graph intelligence | latest |

## Verification Commands

```bash
# Type-check (index.ts)
npx tsc --noEmit index.ts

# Model sync
MAKORA_OPTIMIZE_TOKEN=$TOKEN node scripts/update-models.js

# Reasoning test
MAKORA_OPTIMIZE_TOKEN=$TOKEN npx tsx test-reasoning.ts

# Lint bead
br lint <id> --json

# Graph state
bv --robot-triage
```

## Provider Architecture

- **index.ts** — Monolithic provider entry point (~500 lines). Registers provider, hooks (before_provider_request, message_end, context), loads JSON models, applies patches.
- **scripts/update-models.js** — Fetches from Makora `/v1/models` API, transforms to models.json format, applies patches for README generation.
- **models.json** — Auto-generated base models (DO NOT EDIT).
- **patch.json** — Manual overrides keyed by model ID (reasoning, compat, notes, limits).
- **custom-models.json** — Models not available via API (e.g., per-slug endpoints).

## Constraints

- No build step — index.ts is used directly by the OMP harness
- No external dependencies beyond pi SDK — uses built-in node:fs
- ESM only (`"type": "module"`)
- API key via MAKORA_OPTIMIZE_TOKEN env var or OMP's OAuth login flow
