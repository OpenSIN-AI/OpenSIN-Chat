// SPDX-License-Identifier: MIT
import { useState } from "react";
import ConnectedBotCard from "./ConnectedBotCard";
import DetailsSection from "./DetailsSection";
import UsersSection from "./UsersSection";
import DisconnectedView from "./DisconnectedView";
import useTelegramUsers from "@/hooks/useTelegramUsers";

export default function ConnectedView({
  config,
  onDisconnected,
  onReconnected,
}: {
  config: { connected: boolean; bot_username: string };
  onDisconnected: () => void;
  onReconnected: () => void;
}) {
  const connected = config.connected;
  const [newToken, setNewToken] = useState("");
  const {
    pendingUsers,
    approvedUsers,
    refresh: fetchUsers,
  } = useTelegramUsers();

  if (!connected) {
    return (
      <DisconnectedView
        config={config}
        onReconnected={onReconnected}
        newToken={newToken}
        setNewToken={setNewToken}
      />
    );
  }

  return (
    <div className="flex flex-col gap-y-8 mt-8">
      <ConnectedBotCard config={config} />
      <DetailsSection config={config as any} onDisconnected={onDisconnected} />
      <UsersSection
        pendingUsers={pendingUsers}
        approvedUsers={approvedUsers}
        fetchUsers={fetchUsers}
      />
    </div>
  );
}
