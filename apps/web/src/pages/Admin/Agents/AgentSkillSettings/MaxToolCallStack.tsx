// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import debounce from "lodash.debounce";
import System from "@/models/system";
import useSystemSettings from "@/hooks/useSystemSettings";

export default function MaxToolCallStack() {
  const { t } = useTranslation();
  const { settings, loading } = useSystemSettings();
  const [maxCallStack, setMaxCallStack] = useState<number>(
    () => parseInt(settings?.AgentSkillMaxToolCalls as string, 10) || 10,
  );

  const debouncedUpdateMaxCallStack = useMemo(() => {
    const fn = debounce(async (newMaxCallStack: number) => {
      await System.updateSystem({
        AgentSkillMaxToolCalls: newMaxCallStack.toString(),
      });
    }, 800);
    return fn;
  }, []);

  return (
    <div className="flex flex-col gap-y-2 mt-4">
      <div className="flex items-center gap-x-4 mt-2">
        <div className="flex flex-col gap-y-1 flex-1">
          <label className="block text-md font-medium text-theme-text-primary">
            {t("agent.settings.max-tool-calls.title")}
          </label>
          <p className="text-xs text-theme-text-secondary">
            {t("agent.settings.max-tool-calls.description")}
          </p>
        </div>
        <input
          type="number"
          name="agentSkillMaxToolCalls"
          min={1}
          value={maxCallStack}
          disabled={loading}
          onChange={(e) => {
            if (Number(e.target.value) < 1) return;
            debouncedUpdateMaxCallStack(Number(e.target.value));
            setMaxCallStack(parseInt(e.target.value, 10));
          }}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          className="border border-white/10 bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-[80px] p-2.5 text-center"
          placeholder="10"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
