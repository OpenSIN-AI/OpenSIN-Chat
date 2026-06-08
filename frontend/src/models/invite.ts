// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";

const Invite = {
  checkInvite: async (inviteCode: any): Promise<any> => {
    return await fetch(`${API_BASE}/invite/${inviteCode}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { invite: null, error: e.message };
      });
  },
  acceptInvite: async (inviteCode: any, newUserInfo = {}: any): Promise<any> => {
    return await fetch(`${API_BASE}/invite/${inviteCode}`, {
      method: "POST",
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
