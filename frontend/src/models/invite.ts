// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Invite: any = {
  checkInvite: async (inviteCode) => {
    return await fetch(`${API_BASE}/invite/${inviteCode}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { invite: null, error: e.message };
      });
  },
  acceptInvite: async (inviteCode: any, newUserInfo = {}) => {
    return await fetch(`${API_BASE}/invite/${inviteCode}`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(newUserInfo),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default Invite;
