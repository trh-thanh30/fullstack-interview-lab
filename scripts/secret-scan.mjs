import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const skippedDirectories = new Set([".agents", ".aws", ".codex", ".git", ".idea", ".next", ".pnpm-store", ".vercel", ".vscode", "node_modules", "coverage", "dist", "build", "out"]);
const tracked = walk(process.cwd())
  .filter((file) => !file.endsWith("pnpm-lock.yaml") && !file.split("/").at(-1)?.startsWith(".env"))
  .filter((file) => {
    try { return statSync(file).isFile() && statSync(file).size < 2_000_000; } catch { return false; }
  });

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile()) files.push(relative(process.cwd(), absolute));
  }
  return files;
}

const patterns = [
  ["Google API key", /AIza[0-9A-Za-z_-]{30,}/g],
  ["GitHub token", /gh[pousr]_[0-9A-Za-z]{30,}/g],
  ["AWS access key", /AKIA[0-9A-Z]{16}/g],
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
const findings = [];
for (const file of tracked) {
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${file}: ${label}`);
  }
}
if (findings.length) {
  console.error(`Potential secrets detected:\n${findings.join("\n")}`);
  process.exitCode = 1;
} else {
  console.info(`Secret scan passed (${tracked.length} files).`);
}
