// SPDX-License-Identifier: MIT
// Docs: AgentClarifyingQuestions.doc.md
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleNotch } from "@phosphor-icons/react";
import debounce from "lodash.debounce";
import Toggle from "@/components/lib/Toggle";
import Admin from "@/models/admin";
import useSystemSettings from "@/hooks/useSystemSettings";

export default function AgentClarifyingQuestions(): JSX.Element {
  const { t } = useTranslation();
  const { settings, loading } = useSystemSettings();
  const enabled = !!settings.AgentClarifyingQuestionsEnabled;
  const [maxPerTurn, setMaxPerTurn] = useState(
    () => parseInt(settings.AgentClarifyingQuestionsMaxPerTurn, 10) || 3,
  );

  const debouncedUpdateMaxPerTurn = useMemo(
    () =>
      debounce(async (value: number) => {
        await Admin.updateSystemPreferences({
          agent_clarifying_questions_max_per_turn: String(value),
        });
      }, 800),
    [],
  );

  async function toggleEnabled(next: boolean) {
    await Admin.updateSystemPreferences({
      agent_clarifying_questions_enabled: String(next),
    });
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-x-1">
        <label className="block text-md font-medium text-white flex items-center gap-x-1">
          {t("agent.settings.clarifying-questions.title")}{" "}
          <i className="ml-1 text-xs text-white pl-2 bg-blue-500/40 rounded-md px-2 py-0.5">
            {t("agent.settings.clarifying-questions.beta-badge")}
          </i>
        </label>
      </div>
      <div className="flex items-center gap-x-4">
        <p className="text-xs text-white/60">
          {t("agent.settings.clarifying-questions.description")}
        </p>
        {loading ? (
          <CircleNotch
            size={16}
            className="shrink-0 animate-spin text-theme-text-primary"
          />
        ) : (
          <Toggle
            size="lg"
            name="agentClarifyingQuestionsEnabled"
            enabled={enabled}
            onChange={toggleEnabled}
          />
        )}
      </div>
      {enabled && (
        <>
          <div className="flex items-center gap-x-4">
            <div className="flex flex-col gap-y-1 flex-1">
              <label className="block text-md font-medium text-white">
                {t("agent.settings.clarifying-questions.max-per-turn.title")}
              </label>
              <p className="text-xs text-white/60">
                {t(
                  "agent.settings.clarifying-questions.max-per-turn.description",
                )}
              </p>
            </div>
            <input
              type="number"
              name="agentClarifyingQuestionsMaxPerTurn"
              min={1}
              value={maxPerTurn}
              onChange={(e) => {
                if (parseInt(e.target.value, 10) < 1) return;
                debouncedUpdateMaxPerTurn(e.target.value);
                setMaxPerTurn(parseInt(e.target.value, 10));
              }}
              onWheel={(e) => (e.target as HTMLElement).blur()}
              className="border border-white/10 bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-[80px] p-2.5 text-center"
              placeholder="3" // eslint-disable-line i18next/no-literal-string
              autoComplete="off"
            />
          </div>
        </>
      )}
    </div>
  );
}
