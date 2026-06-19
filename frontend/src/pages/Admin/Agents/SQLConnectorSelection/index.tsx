// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import React, { useEffect, useState, useRef } from "react";
import useAgentSQLConnections from "@/hooks/useAgentSQLConnections";
import DBConnection from "./DBConnection";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import NewSQLConnection from "./SQLConnectionModal";
import { useModal } from "@/hooks/useModal";
import SQLAgentImage from "@/media/agents/sql-agent.png";
import Toggle from "@/components/lib/Toggle";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";

type SQLConnection = {
  database_id: string;
  action?: string;
  [key: string]: any;
};

type AgentSQLConnectorSelectionProps = {
  skill?: string;
  title?: string;
  description?: string;
  toggleSkill?: (skill: string) => void;
  enabled?: boolean;
  setHasChanges?: (hasChanges: boolean) => void;
  hasChanges?: boolean;
};

export default function AgentSQLConnectorSelection({
  skill,
  title,
  description,
  toggleSkill,
  enabled = false,
  setHasChanges,
  hasChanges = false,
}: AgentSQLConnectorSelectionProps): JSX.Element {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [connections, setConnections] = useState<SQLConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const prevHasChanges = useRef(hasChanges);

  const {
    connections: swrConnections,
    isLoading: swrLoading,
    refresh,
  } = useAgentSQLConnections() as {
    connections: SQLConnection[];
    isLoading: boolean;
    refresh: () => void;
  };

  // Sync SWR data into local state when it loads
  useEffect(() => {
    if (!swrLoading) {
      setConnections(swrConnections);
      setLoading(false);
    }
  }, [swrLoading, swrConnections]);

  // Refresh from backend when save completes (hasChanges: true -> false)
  useEffect(() => {
    if (prevHasChanges.current === true && hasChanges === false) {
      refresh();
    }
    prevHasChanges.current = hasChanges;
  }, [hasChanges, refresh]);

  function handleRemoveConnection(databaseId: string) {
    setHasChanges?.(true);
    setConnections((prev) =>
      prev.map((conn) => {
        if (conn.database_id === databaseId)
          return { ...conn, action: "remove" };
        return conn;
      }),
    );
  }

  function handleUpdateConnection(updatedConnection: SQLConnection) {
    setHasChanges?.(true);
    setConnections((prev) =>
      prev.map((conn) =>
        conn.database_id === updatedConnection.originalDatabaseId
          ? updatedConnection
          : conn,
      ),
    );
  }

  function handleAddConnection(newConnection: SQLConnection) {
    setHasChanges?.(true);
    setConnections((prev) => [...prev, newConnection]);
  }

  return (
    <>
      <div className="p-2">
        <div className="flex flex-col gap-y-[18px] max-w-[500px]">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-x-2">
              <Database
                size={24}
                color="var(--theme-text-primary)"
                weight="bold"
              />
              <label
                htmlFor="name"
                className="text-theme-text-primary text-md font-bold"
              >
                {title}
              </label>
            </div>
            <Toggle
              size="lg"
              enabled={enabled}
              onChange={() => toggleSkill?.(skill || "")}
            />
          </div>
          <img
            src={SQLAgentImage}
            alt={t("skills.sqlConnector.alt")}
            className="w-full rounded-md"
          />
          <p className="text-theme-text-secondary text-opacity-60 text-xs font-medium py-1.5">
            {description}
          </p>
          {enabled && (
            <>
              <input
                name="system::agent_sql_connections"
                type="hidden"
                value={JSON.stringify(connections)}
              />
              <input
                type="hidden"
                value={JSON.stringify(
                  connections.filter((conn) => conn.action !== "remove"),
                )}
              />
              <div className="flex flex-col mt-2 gap-y-2">
                <p className="text-theme-text-primary font-semibold text-sm">
                  {t("skills.sqlConnector.connectionsTitle")}
                </p>
                <div className="flex flex-col gap-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <CircleNotch
                        size={24}
                        className="animate-spin text-theme-text-primary"
                      />
                    </div>
                  ) : (
                    connections
                      .filter((connection) => connection.action !== "remove")
                      .map((connection) => (
                        <DBConnection
                          key={connection.database_id}
                          connection={connection as any}
                          onRemove={handleRemoveConnection}
                          onUpdate={handleUpdateConnection}
                          setHasChanges={setHasChanges}
                          connections={connections as any}
                        />
                      ))
                  )}
                  <button
                    type="button"
                    onClick={openModal}
                    className="w-fit relative flex h-[40px] items-center border-none hover:bg-theme-bg-secondary rounded-lg"
                  >
                    <div className="flex w-full gap-x-2 items-center p-4">
                      <div className="bg-theme-bg-secondary p-2 rounded-lg h-[24px] w-[24px] flex items-center justify-center">
                        <Plus
                          weight="bold"
                          size={14}
                          className="shrink-0 text-theme-text-primary"
                        />
                      </div>
                      <p className="text-left text-theme-text-primary text-sm">
                        {t("skills.sqlConnector.newConnection")}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <NewSQLConnection
        isOpen={isOpen}
        closeModal={closeModal}
        setHasChanges={setHasChanges}
        onSubmit={handleAddConnection}
        connections={connections as any}
      />
      <Tooltip
        id="edit-sql-connection-tooltip"
        content="Edit SQL connection"
        place="top"
        delayShow={300}
        className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
      />
      <Tooltip
        id="delete-sql-connection-tooltip"
        content="Delete SQL connection"
        place="top"
        delayShow={300}
        className="tooltip !text-xs !opacity-100 !max-w-[250px] !whitespace-normal !break-words"
      />
    </>
  );
}
