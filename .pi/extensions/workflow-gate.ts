/**
 * Workflow Gate Extension
 *
 * Blocks write tools (edit/write) until PRD and plan artifacts exist for the active bead.
 * Enforces the workflow: /brainstorm → /create → /plan → /ship → /verify → /review
 *
 * Mechanisms:
 * 1. tool_call hook — intercepts edit/write, blocks if prerequisites missing
 * 2. Auto-detects active bead from br list
 * 3. Bypass via PI_SKIP_WORKFLOW=1 env var
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";

// --- Helpers ---

/**
 * Check if a path is a workflow file (always allowed to write).
 * Workflow files: .beads/ and .pi/
 */
function isWorkflowPath(path: string): boolean {
  return path.startsWith(".beads/") || path.startsWith(".pi/") || path === ".beads" || path === ".pi";
}

/**
 * Check if a bash command is read-only (always allowed).
 * Read-only commands: cat, grep, ls, find, head, tail, wc, git status, git diff, git log, bv, br (non-mutating)
 */
function isReadOnlyBash(command: string): boolean {
  const trimmed = command.trim();

  // Always allow these commands (read-only patterns)
  const readOnlyPatterns = [
    /^(cat|less|more|head|tail|wc|file|stat|du|df)\s/,
    /^(grep|rg|ag|find|fd|ls|tree|which|whereis|type)\s/,
    /^(git\s+(status|diff|log|show|branch|remote|rev-parse|describe))\b/,
    /^(bv|br)\s+(show|list|search|stale|doctor|stats|lint|dep|blocked|sync)/,
    /^(bv\s+--robot-)/,  // All bv robot commands are read-only
    /^(echo|printf)\s+(?!.*[>|])/,  // echo without redirect
    /^(npx|npm|node|python|cargo)\s+(test|run|build|check|clippy|fmt)/,  // build/test
    /^(test|true|false)$/,  // no-op commands
  ];

  // Allow env var check and simple commands
  if (trimmed.startsWith("echo ") && !trimmed.includes(">") && !trimmed.includes(">>")) {
    return true;
  }

  return readOnlyPatterns.some((p) => p.test(trimmed));
}

/**
 * Get the active bead ID from br list.
 * Returns the most recently updated open/in_progress bead, or null if none.
 */
async function getActiveBead(exec: ExtensionAPI["exec"]): Promise<string | null> {
  try {
    const { stdout, code } = await exec("br", [
      "list",
      "--status", "open",
      "--status", "in_progress",
      "--json",
    ]);
    if (code !== 0) return null;

    const data = JSON.parse(stdout);
    const issues = data.issues || data;
    if (!Array.isArray(issues) || issues.length === 0) return null;

    // Sort by updated_at descending, return most recent
    issues.sort((a: { updated_at?: string }, b: { updated_at?: string }) => {
      const aTime = a.updated_at || "";
      const bTime = b.updated_at || "";
      return bTime.localeCompare(aTime);
    });

    return issues[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if prerequisites exist for the active bead.
 * Returns { hasPrd: boolean, hasPlan: boolean }
 */
function checkPrereqs(beadId: string): { hasPrd: boolean; hasPlan: boolean } {
  const prdPath = `.beads/artifacts/${beadId}/prd.md`;
  const planPath = `.beads/artifacts/${beadId}/plan.md`;

  return {
    hasPrd: existsSync(prdPath),
    hasPlan: existsSync(planPath),
  };
}

// --- Extension ---

export default function workflowGate(pi: ExtensionAPI): void {
  // Track active bead per session (refreshed on each tool call)
  let cachedBeadId: string | null = null;
  let cacheTimestamp = 0;
  const CACHE_TTL_MS = 30_000; // 30 seconds

  async function resolveActiveBead(exec: ExtensionAPI["exec"]): Promise<string | null> {
    const now = Date.now();
    if (cachedBeadId && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedBeadId;
    }
    cachedBeadId = await getActiveBead(exec);
    cacheTimestamp = now;
    return cachedBeadId;
  }

  // --- tool_call interceptor ---
  pi.on("tool_call", async (event, ctx) => {
    // Check bypass flag
    if (process.env.PI_SKIP_WORKFLOW === "1") return;

    const toolName = event.toolName;

    // Always allow read tool
    if (toolName === "read") return;

    // Always allow ls, find, grep (read-only tools)
    if (toolName === "ls" || toolName === "find" || toolName === "grep") return;

    // Handle edit/write tools
    if (toolName === "edit" || toolName === "write") {
      const input = event.input as { path?: string };
      const path = input.path;

      if (!path) return; // No path, can't block

      // Always allow workflow paths
      if (isWorkflowPath(path)) return;

      // Check active bead
      const activeBead = await resolveActiveBead(pi.exec);
      if (!activeBead) return; // No active bead, allow

      // Allow writes to the active bead's own artifact directory
      // (needed for PRD/plan creation — chicken-and-egg)
      if (path.startsWith(`.beads/artifacts/${activeBead}/`)) return;

      // Check prerequisites
      const prereqs = checkPrereqs(activeBead);

      if (!prereqs.hasPrd) {
        return {
          block: true,
          reason: `Workflow gate: No PRD found for active bead ${activeBead}. Run /create first to write the PRD before editing implementation files.`,
        };
      }

      if (!prereqs.hasPlan) {
        return {
          block: true,
          reason: `Workflow gate: No plan found for active bead ${activeBead}. Run /plan first to write the plan before editing implementation files.`,
        };
      }

      // Both PRD and plan exist — allow
      return;
    }

    // Handle bash tool — soft gate (warn but allow)
    if (toolName === "bash") {
      const input = event.input as { command?: string };
      const command = input.command;
      if (!command) return;

      // Always allow read-only bash
      if (isReadOnlyBash(command)) return;

      // For non-read-only bash, check prerequisites but only warn (don't block)
      const activeBead = await resolveActiveBead(pi.exec);
      if (!activeBead) return;

      const prereqs = checkPrereqs(activeBead);

      if (!prereqs.hasPrd) {
        console.debug(`[workflow-gate] Warning: bash command modifying files without PRD for ${activeBead}`);
      } else if (!prereqs.hasPlan) {
        console.debug(`[workflow-gate] Warning: bash command modifying files without plan for ${activeBead}`);
      }
    }
  });
}
