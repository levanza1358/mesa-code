import { isMainThread, parentPort, workerData } from "node:worker_threads";

import { scanMesaCodeDataDirectory, type MesaCodeDataSizeScanRequest } from "./mesa-code-data-size-scanner.js";

type WorkerResponse =
  | { ok: true; result: Awaited<ReturnType<typeof scanMesaCodeDataDirectory>> }
  | { ok: false; error: string };

const workerParentPort = parentPort;
if (!isMainThread && workerParentPort) {
  void scanMesaCodeDataDirectory(workerData as MesaCodeDataSizeScanRequest)
    .then((result) => {
      workerParentPort.postMessage({ ok: true, result } satisfies WorkerResponse);
    })
    .catch((error) => {
      workerParentPort.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : "unknown worker error",
      } satisfies WorkerResponse);
    });
}
