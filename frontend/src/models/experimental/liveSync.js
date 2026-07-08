// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import logger from "@/utils/logger";

const LiveDocumentSync = {
  featureFlag: "experimental_live_file_sync",
  toggleFeature: async function (updatedStatus = false) {
    return await fetch(`${API_BASE}/experimental/toggle-live-sync`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ updatedStatus }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not update status.");
        return true;
      })
      .then((res) => res)
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  queues: async function () {
    return await fetch(`${API_BASE}/experimental/live-sync/queues`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not update status.");
        return res.json();
      })
      .then((res) => res?.queues || [])
      .catch((e) => {
        logger.error(e);
        return [];
      });
  },

  // Should be in Workspaces but is here for now while in preview
  setWatchStatusForDocument: async function (slug, docPath, watchStatus) {
    return fetch(`${API_BASE}/workspace/${slug}/update-watch-status`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ docPath, watchStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.statusText || "Error setting watch status for document.",
          );
        }
        return true;
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
};

export default LiveDocumentSync;
