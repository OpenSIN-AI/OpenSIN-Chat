// SPDX-License-Identifier: MIT
// Purpose: Admin-only terminal execution page for server-side commands.
// Docs: frontend/src/pages/Admin/Terminal/index.doc.md
import Sidebar from "@/components/SettingsSidebar";
import System from "@/models/system";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import showToast from "@/utils/toast";
import CTAButton from "@/components/lib/CTAButton";

export default function AdminTerminal(): JSX.Element {
  const { t } = useTranslation();
  const [command, setCommand] = useState("");
  const [cwd, setCwd] = useState("/app");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    error?: string;
  } | null>(null);

  const handleExecute = async () => {
    if (!command.trim()) {
      showToast(t("terminal.missingCommand"), "error");
      return;
    }
    setLoading(true);
    setResult(null);
    const response = await System.execTerminalCommand({
      command: command.trim(),
      cwd: cwd.trim() || "/app",
    });
    setLoading(false);
    if (response.error) {
      if (response.error.includes("disabled") || response.status === 403) {
        showToast(t("terminal.disabled"), "error");
      } else {
        showToast(response.error, "error");
      }
    }
    setResult(response);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="flex gap-x-4 items-center">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("terminal.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("terminal.description")}
            </p>
            <p className="text-xs leading-[18px] font-base text-red-400 mt-2">
              {t("terminal.warning")}
            </p>
          </div>

          <div className="flex flex-col gap-y-4 mt-6">
            <div className="flex flex-col gap-y-2">
              <label className="text-sm font-medium text-theme-text-primary">
                {t("terminal.commandLabel")}
              </label>
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={t("terminal.commandPlaceholder")}
                className="w-full h-32 bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-theme-action-menu-item-hover"
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <label className="text-sm font-medium text-theme-text-primary">
                {t("terminal.cwdLabel")}
              </label>
              <input
                type="text"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="/app"
                className="w-full bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-theme-action-menu-item-hover"
              />
            </div>

            <div className="flex justify-start">
              <CTAButton
                onClick={handleExecute}
                disabled={loading || !command.trim()}
                className="mt-2"
              >
                {loading ? t("terminal.executing") : t("terminal.execute")}
              </CTAButton>
            </div>

            {result && (
              <div className="flex flex-col gap-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-theme-text-primary">
                    {t("terminal.output")}
                  </p>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      result.exitCode === 0 && !result.error
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {t("terminal.exitCode")}: {result.exitCode}
                  </span>
                </div>
                {result.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono whitespace-pre-wrap">
                    {result.error}
                  </div>
                )}
                {result.stdout && (
                  <div className="p-3 bg-black/50 border border-theme-border rounded-lg text-green-400 text-sm font-mono whitespace-pre-wrap min-h-[60px]">
                    {result.stdout}
                  </div>
                )}
                {result.stderr && (
                  <div className="p-3 bg-black/50 border border-theme-border rounded-lg text-yellow-400 text-sm font-mono whitespace-pre-wrap min-h-[60px]">
                    {result.stderr}
                  </div>
                )}
                {!result.stdout && !result.stderr && !result.error && (
                  <div className="p-3 bg-black/50 border border-theme-border rounded-lg text-theme-text-secondary text-sm font-mono">
                    {t("terminal.noOutput")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
