// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";
import System from "@/models/system";

export const ADMIN_WORKSPACES_KEY = "admin/workspaces";

export default function useAdminWorkspaces() {
  const { data, error, isLoading, mutate } = useSWR(
    ADMIN_WORKSPACES_KEY,
    async () => {
      const [users, workspaces, settings] = await Promise.all([
        Admin.users(),
        Admin.workspaces(),
        System.keys(),
      ]);
      return {
        users,
        workspaces,
        deletionProtected: settings?.WorkspaceDeletionProtection === true,
      };
    },
  );

  return {
    users: data?.users ?? [],
    workspaces: data?.workspaces ?? [],
    deletionProtected: data?.deletionProtected ?? false,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
