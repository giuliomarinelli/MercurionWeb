import process from "node:process";

const SAFE_GIT_SUBCOMMANDS = new Set([
  "status",
  "diff",
  "log",
  "show",
  "grep",
  "rev-parse",
  "ls-files",
  "ls-tree",
  "cat-file",
  "name-rev",
  "describe",
]);

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    }),
  );
}

function getCommand(payload) {
  let toolArgs = payload?.toolArgs ?? payload?.tool_input;

  if (typeof toolArgs === "string") {
    try {
      toolArgs = JSON.parse(toolArgs);
    } catch {
      return toolArgs;
    }
  }

  if (toolArgs && typeof toolArgs === "object") {
    if (typeof toolArgs.command === "string") return toolArgs.command;
    if (typeof toolArgs.cmd === "string") return toolArgs.cmd;
  }

  return "";
}

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  deny("Git read-only policy could not parse the preToolUse payload; denying fail-closed.");
  process.exit(0);
}

const toolName = String(payload?.toolName ?? payload?.tool_name ?? "").toLowerCase();
if (!new Set(["bash", "powershell", "shell"]).has(toolName)) process.exit(0);

const command = getCommand(payload);
if (!command) process.exit(0);

// Autonomous MercurionWeb sessions must not mutate GitHub state through the CLI.
if (/(^|[\s;&|()])gh(?:\.exe)?\s+/i.test(command)) {
  deny("GitHub CLI is disabled for autonomous Development Sessions; repository and remote GitHub state are human-managed.");
  process.exit(0);
}

const gitInvocation = /(^|[\s;&|()])git(?:\.exe)?\s+([^\s;&|()]+)/gi;
let match;
while ((match = gitInvocation.exec(command)) !== null) {
  const subcommand = match[2].toLowerCase();
  if (!SAFE_GIT_SUBCOMMANDS.has(subcommand)) {
    deny(
      `Git is read-only during autonomous Development Sessions. Subcommand '${subcommand}' is not permitted.`,
    );
    process.exit(0);
  }
}

// Empty output means the normal Copilot permission flow applies.
process.exit(0);
