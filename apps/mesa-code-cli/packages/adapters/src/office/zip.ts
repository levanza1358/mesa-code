// ============================================================
// OfficeDocumentAdapter — bounded ZIP container reader
// ============================================================
// Office Open XML containers (`.docx`, `.xlsx`, `.pptx`) and their ODF
// cousins are ZIP archives. The adapter reads only the handful of XML parts it
// needs and never extracts to disk, so the surface is a single in-memory
// lookup. This mirrors the entry-classification approach already used by the
// plugin `zip-source` reader so the two stay consistent.

import type { Entry, ZipFile } from "yauzl";

// `yauzl` is CommonJS; `esModuleInterop` makes the callable surface available
// under the namespace import, matching the existing `plugins/zip-source` reader.
import * as yauzlModule from "yauzl";

import { OfficeDocumentPortError } from "@mesa-code/contracts";

/** Guard against decompression bombs: cap the decompressed size of any part. */
const MAX_ENTRY_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;

/**
 * Extends `OfficeDocumentPortError` so the Read handlers map ZIP failures
 * through the same `code`-based path as every other adapter error. A bare
 * `Error` would carry no `code` and fall into the handler's unknown branch.
 */
export class OfficeZipError extends OfficeDocumentPortError {
  constructor(
    readonly kind: "io" | "corrupted" | "too_large",
    message: string,
    options?: ErrorOptions,
  ) {
    super(kind === "too_large" ? "unsupported_format" : "corrupted", message, options);
    this.name = "OfficeZipError";
  }
}

/**
 * Read selected entries out of a ZIP buffer. Returns a map keyed by the exact
 * entry name. Missing entries are simply absent rather than throwing so
 * callers can probe optional parts.
 */
export async function readZipEntries(
  buffer: Buffer,
  wanted: (name: string) => boolean,
): Promise<Map<string, Buffer>> {
  const zipFile = await openZip(buffer);
  const results = new Map<string, Buffer>();
  try {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      let settled = false;
      const settle = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        fn();
      };
      zipFile.on("error", (error: Error) => {
        settle(() => rejectPromise(new OfficeZipError("corrupted", error.message, { cause: error })));
      });
      zipFile.on("end", () => settle(resolvePromise));
      zipFile.on("entry", (entry: Entry) => {
        if (entry.fileName.endsWith("/") || !wanted(entry.fileName)) {
          zipFile.readEntry();
          return;
        }
        if (entry.uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES) {
          settle(() =>
            rejectPromise(
              new OfficeZipError(
                "too_large",
                `ZIP entry '${entry.fileName}' expands to ${entry.uncompressedSize} bytes which exceeds the ${MAX_ENTRY_UNCOMPRESSED_BYTES}-byte limit.`,
              ),
            ),
          );
          return;
        }
        zipFile.openReadStream(entry, (error, stream) => {
          if (error || !stream) {
            settle(() =>
              rejectPromise(
                new OfficeZipError(
                  "corrupted",
                  `Cannot open ZIP entry '${entry.fileName}': ${error?.message ?? "unknown error"}`,
                  { cause: error ?? undefined },
                ),
              ),
            );
            return;
          }
          const chunks: Buffer[] = [];
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("error", (streamError: Error) => {
            settle(() =>
              rejectPromise(
                new OfficeZipError("corrupted", streamError.message, { cause: streamError }),
              ),
            );
          });
          stream.on("end", () => {
            results.set(entry.fileName, Buffer.concat(chunks));
            if (!settled) zipFile.readEntry();
          });
        });
      });
      zipFile.readEntry();
    });
  } finally {
    zipFile.close();
  }
  return results;
}

function openZip(buffer: Buffer): Promise<ZipFile> {
  return new Promise<ZipFile>((resolvePromise, rejectPromise) => {
    yauzlModule.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zipFile) => {
      if (error || !zipFile) {
        rejectPromise(
          new OfficeZipError(
            "corrupted",
            `Could not open the ZIP container: ${error?.message ?? "unknown error"}`,
            { cause: error ?? undefined },
          ),
        );
        return;
      }
      resolvePromise(zipFile);
    });
  });
}

export type { Entry, ZipFile } from "yauzl";
