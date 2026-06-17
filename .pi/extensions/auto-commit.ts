/**
 * Auto-Commit Extension
 *
 * Commits at phase boundaries to keep the workspace clean.
 *
 * Mechanisms:
 * 1. /close command — wraps br close + auto-commit (primary path)
 * 2. tool_call + tool_result hooks — catches raw `br close` in bash (safety net)
 * 3. /commit command — manual escape hatch
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// --- State for tool_call → tool_result correlation ---
// Map keyed by toolCallId to handle parallel br close calls

interface PendingEntry {
  command: string;
  id: string;
  reason: string | null;
}

const pendingAutoCommits = new Map<string, PendingEntry>();

// Mutex to prevent parallel git operations from racing
let gitMutex: Promise<void> = Promise.resolve();

// --- Helpers ---

function withGitMutex<T>(fn: () => Promise<T>): Promise<T> {
  const result = gitMutex.then(fn, fn);
  gitMutex = result.then(() => {}, () => {});
  return result;
}

async function gitCommitSafe(
  exec: ExtensionAPI["exec"],
  message: string,
): Promise<{ committed: boolean; error?: string }> {
  return withGitMutex(async () => {
    const { code: addCode } = await exec("git", ["add", "-A"]);
    if (addCode !== 0) return { committed: false, error: "git add failed" };

    const { stdout: status } = await exec("git", ["status", "--porcelain"]);
    if (!status.trim()) return { committed: false, error: "nothing to commit" };

    const { code: commitCode } = await exec("git", ["commit", "-m", message]);
    if (commitCode !== 0) return { committed: false, error: "git commit failed" };

    return { committed: true };
  });
}

function extractBeadId(command: string): string | null {
  const match = command.match(/\bbr\s+close\s+([\w][\w-]*)/);
  return match?.[1] ?? null;
}

function extractReason(command: string): string | null {
  const quoted = command.match(/--reason\s+"([^"]+)"/);
  if (quoted) return quoted[1];
  const unquoted = command.match(/--reason\s+(\S+)/);
  if (unquoted) return unquoted[1];
  return null;
}

async function beadTitle(
  exec: ExtensionAPI["exec"],
  id: string,
): Promise<string | null> {
  try {
    const { stdout, code } = await exec("br", ["show", id, "--json"]);
    if (code !== 0) return null;
    const data = JSON.parse(stdout);
    return data?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

async function composeCloseMessage(
  exec: ExtensionAPI["exec"],
  id: string,
  reason?: string | null,
): Promise<string> {
  const title = await beadTitle(exec, id);
  const label = title ?? id;
  return reason ? `close: ${label} — ${reason}` : `close: ${label}`;
}

function parseArgs(args: string): { id: string | null; reason: string | null } {
  const idMatch = args.match(/([\w][\w-]*)/);
  const reasonMatch =
    args.match(/--reason\s+"([^"]+)"/) || args.match(/--reason\s+(\S+)/);
  return {
    id: idMatch?.[1] ?? null,
    reason: reasonMatch?.[1] ?? null,
  };
}

// --- Extension ---

export default function autoCommit(pi: ExtensionAPI): void {
  // --- /close command ---
  // Wraps br close + auto-commit in one atomic operation.
  // Usage: /close <bead-id> [--reason "text"] [--suggest-next] [--json]

  pi.registerCommand("close", {
    description: "Close a bead and auto-commit",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify(
          "Usage: /close <bead-id> [--reason \"text\"] [--suggest-next]",
          "error",
        );
        return;
      }

      const { id, reason } = parseArgs(args);

      if (!id) {
        ctx.ui.notify(
          "Could not parse bead ID from args. Usage: /close <bead-id> [--reason \"text\"]",
          "error",
        );
        return;
      }

      // Build safe command array — no shell interpolation
      const cmdArgs = ["close", id, "--json"];
      if (reason) cmdArgs.push("--reason", reason);

      // Run br close with array args (no shell injection)
      const { stdout: brOutput, code: exitCode } = await pi.exec("br", cmdArgs);

      if (exitCode !== 0) {
        ctx.ui.notify(
          `br close failed (exit ${exitCode}):\n${brOutput}`,
          "error",
        );
        return;
      }

      // Auto-commit
      const message = await composeCloseMessage(pi.exec, id, reason);
      const result = await gitCommitSafe(pi.exec, message);

      if (result.committed) {
        ctx.ui.notify(`✅ Committed: ${message}`, "info");
      } else if (result.error === "nothing to commit") {
        ctx.ui.notify("Bead closed, no changes to commit.", "info");
      } else {
        ctx.ui.notify(
          `Bead closed but commit failed: ${result.error}`,
          "warning",
        );
      }

      // Show br output
      if (brOutput.trim()) {
        ctx.ui.notify(brOutput.trim(), "info");
      }
    },
  });

  // --- /commit command ---
  // Manual escape hatch: commit all dirty state right now.

  pi.registerCommand("commit", {
    description: "Commit all staged and unstaged changes",
    handler: async (args, ctx) => {
      const message = args?.trim() || "chore: manual checkpoint";
      const result = await gitCommitSafe(pi.exec, message);

      if (result.committed) {
        ctx.ui.notify(`✅ Committed: ${message}`, "info");
      } else if (result.error === "nothing to commit") {
        ctx.ui.notify("Nothing to commit — workspace is clean.", "info");
      } else {
        ctx.ui.notify(`Commit failed: ${result.error}`, "error");
      }
    },
  });

  // --- Safety net: catch raw `br close` in bash ---
  // If the user types `br close <id>` directly (not via /close),
  // detect it and auto-commit after successful execution.
  // Uses Map to handle parallel br close calls correctly.

  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return;
    const input = event.input as { command?: string };
    if (!input.command) return;

    const id = extractBeadId(input.command);
    if (!id) return;

    const reason = extractReason(input.command);
    pendingAutoCommits.set(event.toolCallId, {
      command: input.command,
      id,
      reason,
    });
  });

  pi.on("tool_result", async (event) => {
    if (event.toolName !== "bash") return;
    const pending = pendingAutoCommits.get(event.toolCallId);
    if (!pending) return;

    pendingAutoCommits.delete(event.toolCallId);

    // Only commit if the command succeeded
    if (event.isError) return;

    const message = await composeCloseMessage(pi.exec, pending.id, pending.reason);
    const result = await gitCommitSafe(pi.exec, message);

    if (result.committed) {
      // Append commit notification to the tool result
      return {
        content: [
          ...(Array.isArray(event.content) ? event.content : []),
          { type: "text" as const, text: `\n[auto-commit] ✅ ${message}` },
        ],
      };
    }
  });
}
