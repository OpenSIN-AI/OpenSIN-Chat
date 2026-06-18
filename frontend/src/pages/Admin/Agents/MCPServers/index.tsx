// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import { useState, ReactNode, useEffect } from "react";
import { titleCase } from "text-case";
import { BookOpenText, ArrowClockwise, Warning } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import MCPLogo from "@/media/agents/mcp-logo.svg";
import MCPServers from "@/models/mcpServers";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import useMCPServers, { MCP_SERVERS_KEY } from "@/hooks/useMCPServers";
import { mutate } from "swr";

type MCPServer = {
  name: string;
  running: boolean;
  tools: any[];
  config?: {
    openafd?: {
      suppressedTools?: string[];
    };
  };
};

type MCPServerHeaderProps = {
  setMcpServers: (servers: MCPServer[]) => void;
  setSelectedMcpServer: (server: MCPServer | null) => void;
  children: (props: { loadingMcpServers: boolean }) => ReactNode;
};

export function MCPServerHeader({
  setMcpServers,
  setSelectedMcpServer,
  children,
}: MCPServerHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const { servers, isLoading, refresh } = useMCPServers();
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!initialLoaded && !isLoading) {
      setMcpServers(servers);
      setInitialLoaded(true);
    }
  }, [initialLoaded, isLoading, servers, setMcpServers]);

  const refreshMCPServers = () => {
    if (window.confirm(t("agent.mcp.refresh-confirm"))) {
      setReloading(true);
      MCPServers.forceReload()
        .then(({ servers = [] }: any) => {
          setSelectedMcpServer(null);
          setMcpServers(servers);
          mutate(MCP_SERVERS_KEY);
        })
        .catch((err) => {
          console.error(err);
          showToast(t("agent.mcp.refresh-failed"), "error", { clear: true });
        })
        .finally(() => {
          setReloading(false);
        });
    }
  };

  return (
    <>
      <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
        <div className="flex items-center gap-x-2">
          <img
            src={MCPLogo}
            className="w-6 h-6 light:invert"
            alt={t("common.mcpLogo")}
          />
          <p className="text-lg font-medium">{t("agent.mcp.title")}</p>
        </div>
        <div className="flex items-center gap-x-3">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="border-none text-theme-text-secondary hover:text-cta-button"
          >
            <BookOpenText size={16} />
          </a>
          <button
            type="button"
            onClick={refreshMCPServers}
            disabled={isLoading || reloading}
            className="border-none text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <ArrowClockwise
              size={16}
              className={isLoading || reloading ? "animate-spin" : ""}
            />
            <p className="text-sm">
              {isLoading || reloading
                ? `${t("common.loading")}...`
                : t("common.refresh")}
            </p>
          </button>
        </div>
      </div>
      {children({ loadingMcpServers: isLoading || reloading })}
    </>
  );
}

type MCPServersListProps = {
  isLoading?: boolean;
  servers?: MCPServer[];
  selectedServer?: MCPServer | null;
  handleClick?: (server: MCPServer) => void;
};

export function MCPServersList({
  isLoading = false,
  servers = [],
  selectedServer,
  handleClick,
}: MCPServersListProps): JSX.Element {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{`${t("agent.mcp.loading-from-config")}...`}</p>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          {t("agent.mcp.learn-more")}
        </a>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{t("agent.mcp.no-servers-found")}</p>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          {t("agent.mcp.learn-more")}
        </a>
      </div>
    );
  }

  return (
    <div className="bg-theme-bg-secondary text-white rounded-xl w-full md:min-w-[360px]">
      {servers.map((server, index) => (
        <MCPServerItem
          key={server.name}
          server={server}
          isFirst={index === 0}
          isLast={index === servers.length - 1}
          isSelected={selectedServer?.name === server.name}
          handleClick={() => handleClick?.(server)}
        />
      ))}
      <Tooltip
        id="mcp-server-warning"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs"
        content={t("agent.mcp.tool-warning")}
      />
    </div>
  );
}

type MCPServerItemProps = {
  server: MCPServer;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  handleClick?: () => void;
};

function MCPServerItem({
  server,
  isFirst,
  isLast,
  isSelected,
  handleClick,
}: MCPServerItemProps): JSX.Element {
  const { t } = useTranslation();
  const suppressedTools = server.config?.openafd?.suppressedTools || [];
  const enabledToolCount = server.tools.length - suppressedTools.length;
  const showWarning = enabledToolCount > 10;
  const running = server.running;

  return (
    <div
      className={`py-3 px-4 flex items-center justify-between ${
        isFirst ? "rounded-t-xl" : ""
      } ${
        isLast ? "rounded-b-xl" : "border-b border-white/10"
      } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
        isSelected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-x-2 text-sm font-light">
        {showWarning && (
          <Warning
            data-tooltip-id="mcp-server-warning"
            className="h-4 w-4 text-yellow-500"
          />
        )}
        {titleCase(server.name.replace(/[_-]/g, " "))}
      </div>
      <div className="flex items-center gap-x-2">
        <div
          className={`text-sm text-theme-text-secondary font-medium ${running ? "text-green-500" : "text-red-500"}`}
        >
          {running ? t("common.on") : t("common.stopped")}
        </div>
      </div>
    </div>
  );
}
