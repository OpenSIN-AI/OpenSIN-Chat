// SPDX-License-Identifier: MIT
// Purpose: Modal for creating or editing SQL database connections for the SQL agent.
// Docs: SQLConnectionModal.doc.md
import { useState, useEffect, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import ModalWrapper from "@/components/ModalWrapper";
import { WarningOctagon, X } from "@phosphor-icons/react";
import { DB_LOGOS } from "./DBConnection";
import System from "@/models/system";
import showToast from "@/utils/toast";
import Toggle from "@/components/lib/Toggle";

type DatabaseEngine = "postgresql" | "mysql" | "sql-server";

interface SQLConnection {
  database_id: string;
  engine: DatabaseEngine | string;
  username?: string;
  password?: string;
  host?: string;
  port?: string;
  database?: string;
  schema?: string | null;
  encrypt?: boolean;
  action?: string;
  originalDatabaseId?: string | null;
  connectionString?: string;
  [key: string]: any;
}

interface SQLConnectionModalProps {
  isOpen: boolean;
  closeModal: () => void;
  onSubmit: (connection: SQLConnection) => void;
  setHasChanges?: (hasChanges: boolean) => void;
  existingConnection?: SQLConnection | null;
  connections?: SQLConnection[];
}

interface ConnectionConfig {
  name: string;
  username: string | null;
  password: string | null;
  host: string | null;
  port: string | null;
  database: string | null;
  schema: string | null;
  encrypt: boolean;
}

interface ConnectionStringParams {
  engine: DatabaseEngine | string;
  username?: string | null;
  password?: string | null;
  host?: string | null;
  port?: string | null;
  database?: string | null;
  encrypt?: boolean;
}

/**
 * Converts a string to a URL-friendly slug format.
 * Matches backend slugify behavior for consistent database_id generation.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Assembles a database connection string based on the engine type and configuration.
 */
function assembleConnectionString({
  engine,
  username = "",
  password = "",
  host = "",
  port = "",
  database = "",
  encrypt = false,
}: ConnectionStringParams): string | null {
  if ([username, password, host, database].every((i) => !!i) === false)
    return `Please fill out all the fields above.`;
  switch (engine) {
    case "postgresql":
      return `postgres://${username}:${password}@${host}:${port}/${database}`;
    case "mysql":
      return `mysql://${username}:${password}@${host}:${port}/${database}`;
    case "sql-server":
      return `mssql://${username}:${password}@${host}:${port}/${database}?encrypt=${encrypt}`;
    default:
      return null;
  }
}

const DEFAULT_ENGINE: DatabaseEngine = "postgresql";
const DEFAULT_CONFIG: ConnectionConfig = {
  name: "",
  username: null,
  password: null,
  host: null,
  port: null,
  database: null,
  schema: null,
  encrypt: false,
};

export default function SQLConnectionModal({
  isOpen,
  closeModal,
  onSubmit,
  setHasChanges,
  existingConnection = null,
  connections = [],
}: SQLConnectionModalProps): React.ReactPortal | null {
  const { t } = useTranslation();
  const isEditMode = !!existingConnection;
  const [engine, setEngine] = useState<DatabaseEngine>(DEFAULT_ENGINE);
  const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONFIG);
  const [isValidating, setIsValidating] = useState(false);

  // Sync state when modal opens - useState initial values only run once on mount,
  // so we need this effect to update state when the modal is reopened
  useEffect(() => {
    if (!isOpen) return;

    if (existingConnection) {
      setEngine(existingConnection.engine as DatabaseEngine);
      setConfig({
        name: existingConnection.database_id || "",
        username: existingConnection.username ?? null,
        password: existingConnection.password ?? null,
        host: existingConnection.host ?? null,
        port: existingConnection.port ?? null,
        database: existingConnection.database ?? null,
        schema: existingConnection.schema ?? null,
        encrypt: existingConnection?.encrypt ?? false,
      });
    } else {
      setEngine(DEFAULT_ENGINE);
      setConfig(DEFAULT_CONFIG);
    }
  }, [isOpen, existingConnection]);

  // Track original database ID to send to server for updating if in edit mode
  const originalDatabaseId = isEditMode
    ? existingConnection?.database_id
    : null;

  if (!isOpen) return null;

  function handleClose() {
    setEngine(DEFAULT_ENGINE);
    setConfig(DEFAULT_CONFIG);
    closeModal();
  }

  function onFormChange(e: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    setConfig({
      name: (form.get("name") as string)?.trim() || "",
      username: (form.get("username") as string)?.trim() || null,
      password: (form.get("password") as string) || null,
      host: (form.get("host") as string)?.trim() || null,
      port: (form.get("port") as string)?.trim() || null,
      database: (form.get("database") as string)?.trim() || null,
      schema: (form.get("schema") as string)?.trim() || null,
      encrypt: form.get("encrypt") === "true",
    });
  }

  /**
   * Checks if a connection name (slugified) already exists in the connections list.
   * For edit mode, excludes the original connection being edited.
   */
  function isDuplicateConnectionName(slugifiedName: string): boolean {
    // Get active connections (not marked for removal)
    const activeConnections = connections.filter(
      (conn) => conn.action !== "remove",
    );

    // Check for duplicates, excluding the original connection in edit mode
    return activeConnections.some((conn) => {
      // In edit mode, skip the original connection being edited
      if (isEditMode && conn.database_id === originalDatabaseId) {
        return false;
      }
      return conn.database_id === slugifiedName;
    });
  }

  /**
   * Handles form submission for both creating new connections and updating existing ones.
   */
  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    const form = new FormData(e.currentTarget);
    const connectionString = assembleConnectionString({ engine, ...config });

    // Slugify the database_id immediately to match backend behavior
    const slugifiedDatabaseId = slugify(form.get("name") as string);

    // Check for duplicate connection names before validation
    if (isDuplicateConnectionName(slugifiedDatabaseId)) {
      showToast(
        t("sqlConnection.duplicateError", { name: slugifiedDatabaseId }),
        "error",
        { clear: true },
      );
      return;
    }

    setIsValidating(true);
    try {
      // Validate that we can actually connect to this database
      const { success, error } = await System.validateSQLConnection(
        engine,
        connectionString,
      );
      if (!success) {
        showToast(error || t("sqlConnection.connectionFailed"), "error", {
          clear: true,
        });
        setIsValidating(false);
        return;
      }

      const connectionData: SQLConnection = {
        engine,
        database_id: slugifiedDatabaseId,
        connectionString,
        schema: engine === "postgresql" ? config.schema : null,
      };

      if (isEditMode) {
        // EDIT MODE: Send update action with originalDatabaseId
        onSubmit({
          ...connectionData,
          action: "update",
          originalDatabaseId: originalDatabaseId,
        });
      } else {
        // CREATE MODE: Send add action
        onSubmit({
          ...connectionData,
          action: "add",
        });
      }

      setHasChanges?.(true);
      handleClose();
    } catch (error: any) {
      console.error("Error validating connection:", error);
      showToast(
        error?.message || t("sqlConnection.validationFailed"),
        "error",
        { clear: true },
      );
    } finally {
      setIsValidating(false);
    }
    return false;
  }

  // Cannot do nested forms, it will cause all sorts of issues, so we portal this out
  // to the parent container form so we don't have nested forms.
  return createPortal(
    <ModalWrapper isOpen={isOpen}>
      <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
        <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
          <div className="relative p-6 border-b rounded-t border-theme-modal-border">
            <div className="w-full flex gap-x-2 items-center">
              <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
                {isEditMode
                  ? t("sqlConnection.editTitle")
                  : t("sqlConnection.newTitle")}
              </h3>
            </div>
            <button
              onClick={handleClose}
              type="button"
              className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
            >
              <X size={24} weight="bold" className="text-white" />
            </button>
          </div>
          <form
            id="sql-connection-form"
            onChange={onFormChange}
            onSubmit={handleUpdate}
          >
            <div className="px-7 py-6">
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                <p className="text-sm text-white/60">
                  {isEditMode
                    ? t("sqlConnection.descriptionEdit")
                    : t("sqlConnection.descriptionNew")}
                </p>
                <div className="flex flex-col w-full">
                  <div className="border border-red-800 bg-zinc-800 light:bg-red-200/50 p-4 rounded-lg flex items-center gap-x-2 text-sm text-red-400 light:text-red-500">
                    <WarningOctagon size={28} className="shrink-0" />
                    <p>
                      <b>{t("sqlConnection.warningLabel")}</b>{" "}
                      {t("sqlConnection.warningText")}{" "}
                      <i>{t("sqlConnection.warningInstructed")}</i>{" "}
                      {t("sqlConnection.warningToOnlyPerform")}{" "}
                      <b>{t("sqlConnection.warningDoesNotPrevent")}</b>{" "}
                      {t("sqlConnection.warningDoesNotPrevent2")}{" "}
                      <b>{t("sqlConnection.warningReadOnly")}</b>{" "}
                      {t("sqlConnection.warningReadOnly2")}
                    </p>
                  </div>

                  <label className="block mb-2 text-sm font-medium text-white mt-4">
                    {t("sqlConnection.selectEngine")}
                  </label>
                  <div className="grid md:grid-cols-4 gap-4 grid-cols-2">
                    <DBEngine
                      provider="postgresql"
                      active={engine === "postgresql"}
                      onClick={() => setEngine("postgresql")}
                    />
                    <DBEngine
                      provider="mysql"
                      active={engine === "mysql"}
                      onClick={() => setEngine("mysql")}
                    />
                    <DBEngine
                      provider="sql-server"
                      active={engine === "sql-server"}
                      onClick={() => setEngine("sql-server")}
                    />
                  </div>
                </div>

                <div className="flex flex-col w-full">
                  <label className="block mb-2 text-sm font-medium text-white">
                    {t("sqlConnection.connectionName")}
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                    placeholder={t("sqlConnection.connectionNamePlaceholder")}
                    required={true}
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={config.name || ""}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col">
                    <label className="block mb-2 text-sm font-medium text-white">
                      {t("sqlConnection.databaseUser")}
                    </label>
                    <input
                      type="text"
                      name="username"
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                      placeholder={t("sqlConnection.databaseUserPlaceholder")}
                      required={true}
                      autoComplete="off"
                      spellCheck={false}
                      defaultValue={config.username || ""}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block mb-2 text-sm font-medium text-white">
                      {t("sqlConnection.databasePassword")}
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                      placeholder={t(
                        "sqlConnection.databasePasswordPlaceholder",
                      )}
                      required={true}
                      autoComplete="off"
                      spellCheck={false}
                      defaultValue={config.password || ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-white">
                      {t("sqlConnection.serverEndpoint")}
                    </label>
                    <input
                      type="text"
                      name="host"
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                      placeholder={t("sqlConnection.serverEndpointPlaceholder")}
                      required={true}
                      autoComplete="off"
                      spellCheck={false}
                      defaultValue={config.host || ""}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-white">
                      {t("sqlConnection.port")}
                    </label>
                    <input
                      type="text"
                      name="port"
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                      placeholder={t("sqlConnection.portPlaceholder")}
                      required={false}
                      autoComplete="off"
                      spellCheck={false}
                      defaultValue={config.port || ""}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="block mb-2 text-sm font-medium text-white">
                    {t("sqlConnection.database")}
                  </label>
                  <input
                    type="text"
                    name="database"
                    className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                    placeholder={t("sqlConnection.databasePlaceholder")}
                    required={true}
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={config.database || ""}
                  />
                </div>

                {engine === "postgresql" && (
                  <div className="flex flex-col">
                    <label className="block mb-2 text-sm font-medium text-white">
                      {t("sqlConnection.schemaOptional")}
                    </label>
                    <input
                      type="text"
                      name="schema"
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                      placeholder={t("sqlConnection.schemaPlaceholder")}
                      required={false}
                      autoComplete="off"
                      spellCheck={false}
                      defaultValue={config.schema || ""}
                    />
                  </div>
                )}

                {engine === "sql-server" && (
                  <Toggle
                    name="encrypt"
                    value="true"
                    size="md"
                    label={t("sqlConnection.enableEncryption")}
                    enabled={config.encrypt}
                  />
                )}

                <p className="text-theme-text-secondary text-sm">
                  {t(assembleConnectionString({ engine, ...config }) || "")}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-theme-modal-border px-7 pb-6">
              <button
                type="button"
                onClick={handleClose}
                className="transition-all duration-300 text-white hover:bg-zinc-700 light:hover:bg-theme-bg-primary px-4 py-2 rounded-lg text-sm"
              >
                {t("sqlConnection.cancel")}
              </button>
              <button
                type="submit"
                form="sql-connection-form"
                disabled={isValidating}
                className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {isValidating
                  ? t("sqlConnection.validating")
                  : t("sqlConnection.saveConnection")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalWrapper>,
    document.getElementById("workspace-agent-settings-container"),
  );
}

interface DBEngineProps {
  provider: DatabaseEngine | string;
  active: boolean;
  onClick: () => void;
}

function DBEngine({ provider, active, onClick }: DBEngineProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col p-4 border border-white/40 bg-zinc-800 light:bg-theme-settings-input-bg rounded-lg w-fit hover:bg-zinc-700 ${
        active ? "!bg-blue-500/50" : ""
      }`}
    >
      <img
        src={DB_LOGOS[provider]}
        className="h-[100px] rounded-md"
        alt={provider}
      />
    </button>
  );
}

export type { SQLConnection };
