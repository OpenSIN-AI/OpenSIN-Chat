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

const LemonadeUtils = {
  /**
   * Download a Lemonade model.
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
        const response = await fetch(
          `${API_BASE}/utils/lemonade/download-model`,
          {
            method: "POST",
            headers: baseHeaders(),
            body: JSON.stringify({ modelId, basePath }),
          },
        );

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

  /**
   * Delete a Lemonade model from local storage.
   * If the model is currently loaded, it will be unloaded first.
   * @param modelId - The ID of the model to delete.
   * @param basePath - The base path of the Lemonade server.
   * @returns Promise with deletion status
   */
  deleteModel: async function (
    modelId: string,
    basePath: string = "",
  ): Promise<DownloadResponse & { message?: string }> {
    try {
      const response = await fetch(`${API_BASE}/utils/lemonade/delete-model`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ modelId, basePath }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "An error occurred while deleting the model",
        };
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error("Error deleting model:", error);
      return {
        success: false,
        error:
          (error as Error)?.message ||
          "An error occurred while deleting the model",
      };
    }
  },
};

export default LemonadeUtils;
export type { DownloadResponse, ProgressData };
