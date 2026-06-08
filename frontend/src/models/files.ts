// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url, { headers: baseHeaders() }).then((res) => {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  });

const StorageFiles: any = {
  /**
   * Download a file from the server
   * @param {string} filename - The filename to download
   * @returns {Promise<Blob|null>}
   */
  download: async function (storageFilename: any) {
    return await fetch(
      `${API_BASE}/agent-skills/generated-files/${encodeURIComponent(storageFilename)}`,
      { headers: baseHeaders() },
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to download file");
        return res.blob();
      })
      .catch((e) => {
        console.error("Download failed:", e);
        return null;
      });
  },
};

/**
 * Reusable SWR hook for the agent-generated filesystem listing.
 * Replaces ad-hoc useEffect + fetch + useState in the sidebars and gives
 * cache de-duplication, shared loading/error state, and a `refresh()` helper.
 * @returns {{ files: any[], error: any, isLoading: boolean, refresh: () => void }}
 */
export function useGeneratedFiles() {
  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE}/utils/filesystem`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );
  return { files: data?.files ?? [], error, isLoading, refresh: mutate };
}

export default StorageFiles;
