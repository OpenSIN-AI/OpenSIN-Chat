// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import logger from "@/utils/logger";

const Embed: any = {
  embeds: async () => {
    return await fetch(`${API_BASE}/embeds`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.embeds || [])
      .catch((e) => {
        logger.error(e);
        return [];
      });
  },
  newEmbed: async (data: any) => {
    return await fetch(`${API_BASE}/embeds/new`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        logger.error(e);
        return { embed: null, error: e.message };
      });
  },
  updateEmbed: async (embedId: any, data: any) => {
    return await fetch(`${API_BASE}/embed/update/${embedId}`, {
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
  deleteEmbed: async (embedId: any) => {
    return await fetch(`${API_BASE}/embed/${embedId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok) return { success: true, error: null };
        throw new Error(res.statusText);
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  chats: async (offset: any = 0) => {
    return await fetch(`${API_BASE}/embed/chats`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ offset }),
    })
      .then((res) => res.json())
      .catch((e) => {
        logger.error(e);
        return { chats: [], hasPages: false, totalChats: 0 };
      });
  },
  deleteChat: async (chatId: any) => {
    return await fetch(`${API_BASE}/embed/chats/${chatId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default Embed;
