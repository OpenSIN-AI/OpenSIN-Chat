// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

export const WORKSPACE_MEMBERS_KEY = "workspace/members";

export default function useWorkspaceMembers(workspaceId) {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? [WORKSPACE_MEMBERS_KEY, workspaceId] : null,
    async () => {
      const [users, workspaceUsers, adminWorkspaces] = await Promise.all([
        Admin.users(),
        Admin.workspaceUsers(workspaceId),
        Admin.workspaces(),
      ]);
      const adminWorkspace = adminWorkspaces.find((w) => w.id === workspaceId);
      return { users, workspaceUsers, adminWorkspace };
    },
  );

  return {
    users: data?.users ?? [],
    workspaceUsers: data?.workspaceUsers ?? [],
    adminWorkspace: data?.adminWorkspace ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
