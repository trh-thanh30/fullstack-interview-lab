import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function extractPdfText(path: string) {
  try {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", "-enc", "UTF-8", path, "-"],
      { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 },
    );

    return stdout;
  } catch (error) {
    if (isMissingBinaryError(error)) {
      throw new Error(
        "pdftotext is required for PDF ingestion. Install Poppler and ensure pdftotext is on PATH.",
        { cause: error },
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`pdftotext failed for ${path}: ${message}`, { cause: error });
  }
}

function isMissingBinaryError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
