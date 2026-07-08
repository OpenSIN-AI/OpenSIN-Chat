// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import logger from "@/utils/logger";

const Document: any = {
  createFolder: async (name) => {
    return await fetch(`${API_BASE}/document/create-folder`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) => res.json())
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  moveToFolder: async (files: any, folderName: any) => {
    const data = {
      files: (files as any).map((file) => ({
        from: file.folderName ? `${file.folderName}/${file.name}` : file.name,
        to: `${folderName}/${file.name}`,
      })),
    };

    return await fetch(`${API_BASE}/document/move-files`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default Document;
