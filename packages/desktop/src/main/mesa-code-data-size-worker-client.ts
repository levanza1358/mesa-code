import { Worker } from "node:worker_threads";

import {
  isMesaCodeDataSizeScanResult,
  type MesaCodeDataSizeScanRequest,
  type MesaCodeDataSizeScanResult,
} from "./mesa-code-data-size-scanner.js";

export function scanMesaCodeDataDirectoryInWorker(
  request: MesaCodeDataSizeScanRequest,
  signal: AbortSignal,
): Promise<MesaCodeDataSizeScanResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./mesa-code-data-size-worker.js", import.meta.url), {
      workerData: request,
    });
    let settled = false;

    const finish = (run: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", abort);
      run();
    };
    const abort = () => {
      void worker.terminate();
      finish(() => reject(new DOMException("MesaCode data size scan aborted", "AbortError")));
    };

    worker.once("message", (message: unknown) => {
      const response = message as { ok?: unknown; result?: unknown; error?: unknown };
      if (response.ok === true && isMesaCodeDataSizeScanResult(response.result)) {
        finish(() => resolve(response.result as MesaCodeDataSizeScanResult));
        return;
      }
      finish(() =>
        reject(
          new Error(
            response.ok === false && typeof response.error === "string"
              ? response.error
              : "Invalid MesaCode data size worker response",
          ),
        ),
      );
    });
    worker.once("error", (error) => finish(() => reject(error)));
    worker.once("exit", (code) => {
      if (code !== 0) {
        finish(() => reject(new Error(`MesaCode data size worker exited with code ${code}`)));
      }
    });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    worker.unref();
  });
}
