import { realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

export const pdfSourceFileAllowlist = [
  "Kiến trúc ứng dụng web.pdf",
  "system-degisn.pdf",
] as const;

export async function discoverAllowlistedPdfFiles(
  rootDirectory: string,
  allowedFiles: readonly string[] = pdfSourceFileAllowlist,
) {
  const canonicalRoot = await realpath(rootDirectory);

  if (!(await stat(canonicalRoot)).isDirectory()) {
    throw new Error(`PDF source root is not a directory: ${rootDirectory}`);
  }

  const files: string[] = [];

  for (const allowedFile of allowedFiles) {
    if (isAbsolute(allowedFile) || basename(allowedFile) !== allowedFile) {
      throw new Error(`PDF allowlist entry must be a filename: ${allowedFile}`);
    }

    const candidate = await realpath(resolve(canonicalRoot, allowedFile));
    const relativePath = relative(canonicalRoot, candidate);

    if (relativePath.startsWith(`..${sep}`) || relativePath === ".." || isAbsolute(relativePath)) {
      throw new Error(`PDF allowlist entry escapes source root: ${allowedFile}`);
    }

    if (!(await stat(candidate)).isFile() || !candidate.toLowerCase().endsWith(".pdf")) {
      throw new Error(`PDF allowlist entry is not a PDF file: ${allowedFile}`);
    }

    files.push(candidate);
  }

  return files.sort((left, right) => left.localeCompare(right));
}
