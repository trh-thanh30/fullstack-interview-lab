import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const sourceRoot = join(process.cwd(), "src");
const testFilePattern = /\.(?:integration\.)?(?:test|spec)\.[cm]?[jt]sx?$/;
const files = await collectFiles(sourceRoot);
const misplacedTests = files
  .filter((path) => testFilePattern.test(path))
  .filter((path) => !relative(sourceRoot, path).split(sep).includes("tests"))
  .map((path) => relative(process.cwd(), path));

if (misplacedTests.length > 0) {
  console.error("Test files must live in the nearest tests/ directory:");

  for (const path of misplacedTests) {
    console.error(`- ${path}`);
  }

  process.exitCode = 1;
} else {
  console.info("Test layout is valid.");
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}
