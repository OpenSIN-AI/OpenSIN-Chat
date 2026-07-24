// SPDX-License-Identifier: MIT
// Purpose: SIN-Gmail skill panel backed by the local Himalaya CLI.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toggle, { SimpleToggleSwitch } from "@/components/lib/Toggle";
import { useTranslation } from "react-i18next";
import debounce from "lodash.debounce";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { TerminalWindow } from "@phosphor-icons/react/dist/csr/TerminalWindow";
import { Key } from "@phosphor-icons/react/dist/csr/Key";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import GMailIcon from "./gmail.png";
import { useGmailAgent } from "@/hooks/useGoogleAgent";
import { getGmailSkills, filterSkillCategories } from "./utils";
import { Link } from "react-router";
import paths from "@/utils/paths";

interface GMailSkillPanelProps {
  title: string;
  skill: string;
  toggleSkill: (skill: string) => void;
  enabled?: boolean;
  disabled?: boolean;
  setHasChanges?: (hasChanges: boolean) => void;
  hasChanges?: boolean;
}

interface HimalayaStatus {
  provider?: string;
  isConfigured?: boolean;
  binaryAvailable?: boolean;
  binary?: string;
  version?: string;
  configPath?: string;
  runtimeError?: string;
  accounts?: Array<{ id: string; label: string; email: string }>;
}

export default function GMailSkillPanel({
  title,
  skill,
  toggleSkill,
  enabled = false,
  disabled = false,
  setHasChanges,
  hasChanges = false,
}: GMailSkillPanelProps): JSX.Element {
  const { t } = useTranslation();
  const [disabledSkills, setDisabledSkills] = useState<string[]>([]);
  const prevHasChanges = useRef(hasChanges);
  const skillCategories = getGmailSkills(t);

  const {
    disabledSkills: swrDisabledSkills,
    config,
    isLoading,
    refresh,
  } = useGmailAgent();
  const status = (config || {}) as HimalayaStatus;

  useEffect(() => {
    if (!isLoading) setDisabledSkills(swrDisabledSkills);
  }, [isLoading, swrDisabledSkills]);

  useEffect(() => {
    if (prevHasChanges.current === true && hasChanges === false) refresh();
    prevHasChanges.current = hasChanges;
  }, [hasChanges, refresh]);

  function toggleGmailSkill(skillName: string) {
    setHasChanges?.(true);
    setDisabledSkills((current) =>
      current.includes(skillName)
        ? current.filter((entry) => entry !== skillName)
        : [...current, skillName],
    );
  }

  return (
    <div className="p-2">
      <div className="flex max-w-[560px] flex-col gap-y-[18px]">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-x-2">
            <img src={GMailIcon} alt="SIN-Gmail" className="h-6 w-6" />
            <label className="text-md font-bold text-theme-text-primary">
              {title}
            </label>
          </div>
          <Toggle
            size="lg"
            enabled={enabled}
            disabled={disabled}
            onChange={() => toggleSkill(skill)}
          />
        </div>

        <p className="text-xs font-medium leading-5 text-theme-text-secondary">
          Gmail läuft lokal über den gemeinsamen <strong>SIN-Gmail</strong>
          -Skill und die Rust-CLI <strong>Himalaya</strong>. Es gibt keine
          Google-Cloud-App, keinen OAuth-Client und keine Apps-Script-Bridge.
          App-Passwörter bleiben ausschließlich im macOS-Keychain.
        </p>

        <Link
          to={paths.emailCenter()}
          className="flex items-center justify-between gap-3 rounded-lg border border-theme-sidebar-border/60 bg-theme-bg-secondary/40 p-3 transition-colors hover:bg-theme-bg-secondary"
        >
          <div>
            <p className="text-sm font-semibold text-theme-text-primary">
              E-Mail Zentrale öffnen
            </p>
            <p className="mt-1 text-xs leading-5 text-theme-text-secondary">
              Himalaya-Konten, gemeinsames Postfach, Gruppen und KI-Workflows
              verwalten.
            </p>
          </div>
          <span className="shrink-0 text-lg text-theme-text-secondary">→</span>
        </Link>

        {enabled && (
          <>
            <input
              name="system::disabled_gmail_skills"
              type="hidden"
              value={disabledSkills.join(",")}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <CircleNotch
                  size={24}
                  className="animate-spin text-theme-text-primary"
                />
              </div>
            ) : (
              <>
                <RuntimeStatus status={status} />
                {status.isConfigured && (
                  <SkillsSection
                    skillCategories={skillCategories}
                    disabledSkills={disabledSkills}
                    onToggle={toggleGmailSkill}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RuntimeStatus({ status }: { status: HimalayaStatus }): JSX.Element {
  const accounts = status.accounts || [];
  const okay = Boolean(status.isConfigured);
  return (
    <div className="overflow-hidden rounded-lg border border-theme-sidebar-border/50">
      <div className="flex items-center gap-2 bg-theme-bg-secondary/30 p-3">
        {okay ? (
          <CheckCircle size={17} weight="fill" className="text-green-500" />
        ) : (
          <Warning size={17} weight="fill" className="text-orange-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-theme-text-primary">
            {okay
              ? "SIN-Gmail ist einsatzbereit"
              : "SIN-Gmail benötigt Einrichtung"}
          </p>
          <p className="mt-0.5 text-[11px] text-theme-text-secondary">
            {status.version ||
              status.runtimeError ||
              "Himalaya-Status unbekannt"}
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-theme-sidebar-border/50 p-3">
        <div className="flex items-start gap-2">
          <TerminalWindow
            size={16}
            className="mt-0.5 shrink-0 text-theme-text-secondary"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-text-muted">
              CLI und Konfiguration
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-theme-text-secondary">
              {status.binary || "himalaya nicht gefunden"}
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-theme-text-secondary">
              {status.configPath || "~/.config/himalaya/config.toml"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Key
            size={16}
            className="mt-0.5 shrink-0 text-theme-text-secondary"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-text-muted">
              Keychain-Sicherheit
            </p>
            <p className="mt-1 text-[11px] leading-5 text-theme-text-secondary">
              OpenSIN liest keine App-Passwörter. Himalaya ruft sie bei Bedarf
              direkt über <code>security find-generic-password</code> aus dem
              macOS-Keychain ab.
            </p>
          </div>
        </div>

        {accounts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <span
                key={account.id}
                className="rounded-full border border-theme-sidebar-border bg-theme-bg-primary px-2.5 py-1 text-[10px] text-theme-text-secondary"
              >
                <strong className="text-theme-text-primary">
                  {account.id}
                </strong>
                {account.email ? ` · ${account.email}` : ""}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-[11px] leading-5 text-orange-500">
            Richte ein Konto mit dem gemeinsamen <code>sin-gmail</code>-Skill
            oder mit <code>himalaya account configure &lt;alias&gt;</code> ein
            und lade die Seite neu.
          </div>
        )}
      </div>
    </div>
  );
}

interface SkillSearchInputProps {
  onSearch: (value: string) => void;
}

function SkillSearchInput({ onSearch }: SkillSearchInputProps): JSX.Element {
  const { t } = useTranslation();
  const debouncedSearch = useMemo(
    () => debounce((value: string) => onSearch(value), 300),
    [onSearch],
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  return (
    <div className="relative">
      <input
        type="search"
        placeholder={t("agent.skill.gmail.searchSkills")}
        onChange={(event) => debouncedSearch(event.target.value)}
        className="search-input w-full rounded-lg border border-theme-sidebar-border bg-theme-bg-primary py-2 pl-9 pr-3 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/50"
      />
      <MagnifyingGlass
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary"
        weight="bold"
      />
    </div>
  );
}

function SkillsSection({
  skillCategories,
  disabledSkills,
  onToggle,
}: {
  skillCategories: ReturnType<typeof getGmailSkills>;
  disabledSkills: string[];
  onToggle: (skillName: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearch = useCallback((value: string) => setSearchTerm(value), []);
  const filteredCategories = useMemo(
    () => filterSkillCategories(skillCategories, searchTerm),
    [skillCategories, searchTerm],
  );

  return (
    <div className="mt-4 flex flex-col gap-y-4">
      <SkillSearchInput onSearch={handleSearch} />
      {Object.keys(filteredCategories).length > 0 ? (
        <div className="flex flex-col gap-y-4">
          {Object.entries(filteredCategories).map(([key, category]) => (
            <CategorySection
              key={key}
              category={category}
              disabledSkills={disabledSkills}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-theme-text-secondary">
          {t("agent.skill.gmail.noSkillsFound")}
        </p>
      )}
    </div>
  );
}

function CategorySection({
  category,
  disabledSkills,
  onToggle,
}: {
  category: { title: string; icon: Icon; skills: any[] };
  disabledSkills: string[];
  onToggle: (skillName: string) => void;
}): JSX.Element {
  const Icon = category.icon;
  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center gap-x-2 px-1">
        <Icon size={18} className="text-theme-text-primary" />
        <span className="text-sm font-medium text-theme-text-primary">
          {category.title}
        </span>
      </div>
      <div className="flex flex-col gap-y-2">
        {category.skills.map((entry) => (
          <div
            key={entry.name}
            className={`flex items-center justify-between rounded-lg border p-2 ${
              disabledSkills.includes(entry.name)
                ? "border-theme-sidebar-border/30 bg-theme-bg-secondary/30"
                : "border-theme-sidebar-border/50 bg-theme-bg-secondary/50"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-100 light:text-slate-900">
                {entry.title}
              </span>
              <span className="text-xs text-slate-100/50 light:text-slate-900/50">
                {entry.description}
              </span>
            </div>
            <SimpleToggleSwitch
              enabled={!disabledSkills.includes(entry.name)}
              onChange={() => onToggle(entry.name)}
              size="md"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
