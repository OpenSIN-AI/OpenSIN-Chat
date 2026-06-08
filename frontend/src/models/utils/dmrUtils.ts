// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import { safeJsonParse } from "@/utils/request";

interface DownloadResponse {
  success: boolean;
  error?: string | null;
}

interface ProgressData {
  type: "success" | "error" | "progress";
  percentage?: number;
  error?: string;
  message?: string;
}

const DMRUtils: any = {
  /**
   * Download a DMR model.
   * @param modelId - The ID of the model to download.
   * @param basePath - The base path for the model.
   * @param progressCallback - The callback to receive the progress percentage.
   * @returns Promise with download status
   */
  downloadModel: async function (
    modelId: string,
    basePath: string = "",
    progressCallback: (percentage: number) => void = () => {},
  ): Promise<DownloadResponse> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      try {
        const response = await fetch(`${API_BASE}/utils/dmr/download-model`, {
          method: "POST",
          headers: baseHeaders(),
          body: JSON.stringify({ modelId, basePath }),
        });

        if (!response.ok)
          throw new Error("Error downloading model: " + response.statusText);
        const reader = response.body!.getReader();
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) {
            done = true;
            resolve({ success: true });
          } else {
            const chunk = new TextDecoder("utf-8").decode(value);
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data:")) {
                const data = safeJsonParse(line.slice(5)) as ProgressData;
                switch (data?.type) {
                  case "success":
                    done = true;
                    resolve({ success: true });
                    break;
                  case "error":
                    done = true;
                    resolve({
                      success: false,
                      error: data?.error || data?.message,
                    });
                    break;
                  case "progress":
                    progressCallback(data?.percentage || 0);
                    break;
                  default:
                    break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error downloading model:", error);
        resolve({
          success: false,
          error:
            (error as Error)?.message ||
            "An error occurred while downloading the model",
        });
      }
    });
  },
  // Uninstall a DMR model is not supported via the API
};

export default DMRUtils;
export type { DownloadResponse, ProgressData };
