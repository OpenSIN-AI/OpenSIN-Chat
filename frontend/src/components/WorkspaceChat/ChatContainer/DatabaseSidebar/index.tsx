// SPDX-License-Identifier: MIT
import { useState, useMemo, useCallback } from "react";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { CheckSquare } from "@phosphor-icons/react/dist/csr/CheckSquare";
import { Square } from "@phosphor-icons/react/dist/csr/Square";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { usePoliticians } from "@/hooks/usePoliticians";
import useDocuments from "@/hooks/useDocuments";
import Politician from "@/models/politician";
import { swrFetcher } from "@/utils/swrFetcher";
import ChatSidebar, { useDatabaseSidebar } from "../ChatSidebar";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { Filters } from "./components/Filters";
import { ProfileCard } from "./components/ProfileCard";
import { PoliticiansTab } from "./components/PoliticiansTab";
import { SpeechesTab } from "./components/SpeechesTab";
import { DrucksachenTab } from "./components/DrucksachenTab";

interface DatabaseSidebarProps {
  workspace?: { slug?: string } | null;
}

export default function DatabaseSidebar({ workspace }: DatabaseSidebarProps) {
  const { sidebarOpen, closeSidebar } = useDatabaseSidebar();
  const { t } = useTranslation();
  const {
    politicians,
    loading,
    error,
    refresh,
    filters: { query, setQuery, party, setParty, state, setState },
  } = usePoliticians();
  const { mutate: mutateDocuments } = useDocuments();

  const { data: partiesData } = useSWR("/api/politician/parties", swrFetcher, {
    revalidateOnFocus: false,
  });
  const { data: statesData } = useSWR("/api/politician/states", swrFetcher, {
    revalidateOnFocus: false,
  });

  const parties = useMemo(
    () => (partiesData?.parties || []).filter(Boolean).sort(),
    [partiesData],
  );
  const states = useMemo(
    () => (statesData?.states || []).filter(Boolean).sort(),
    [statesData],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);

  // Speech search state
  const [speechQuery, setSpeechQuery] = useState("");
  const [speechResults, setSpeechResults] = useState<any[]>([]);
  const [speechLoading, setSpeechLoading] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "politicians" | "speeches" | "drucksachen"
  >("politicians");

  const [dipQuery, setDipQuery] = useState("");
  const [dipResults, setDipResults] = useState<any[]>([]);
  const [dipLoading, setDipLoading] = useState(false);
  const [dipError, setDipError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const workspaceSlug = workspace?.slug;

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === politicians.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(politicians.map((p) => p.id)));
    }
  }, [politicians, selected.size]);

  const addPoliticianToWorkspace = useCallback(
    async (id: string) => {
      if (!workspaceSlug) return;
      setAddError(null);
      setAdding((prev) => new Set(prev).add(id));
      try {
        const result = await Politician.addToWorkspace(id, workspaceSlug);
        if (!result.success) {
          setAddError(
            result.error ||
              t("sidebar.database.addFailed", "Hinzufügen fehlgeschlagen"),
          );
        } else {
          await mutateDocuments();
        }
      } catch (e) {
        setAddError(
          e instanceof Error
            ? e.message
            : t("sidebar.database.addFailed", "Hinzufügen fehlgeschlagen"),
        );
      } finally {
        setAdding((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [workspaceSlug, mutateDocuments, t],
  );

  const addSelectedToWorkspace = useCallback(async () => {
    if (!workspaceSlug) return;
    setAddError(null);
    const ids = Array.from(selected);
    setAdding(new Set(ids));
    let failed = 0;
    for (const id of ids) {
      const result = await Politician.addToWorkspace(id, workspaceSlug);
      if (!result.success) {
        failed++;
        setAddError(
          result.error ||
            t("sidebar.database.addFailed", "Hinzufügen fehlgeschlagen"),
        );
      }
    }
    if (failed === 0) {
      setSelected(new Set());
    }
    await mutateDocuments();
    setAdding(new Set());
  }, [workspaceSlug, selected, mutateDocuments, t]);

  const allSelected =
    politicians.length > 0 && selected.size === politicians.length;

  const searchSpeeches = useCallback(async () => {
    if (!speechQuery.trim()) return;
    setSpeechLoading(true);
    setSpeechError(null);
    try {
      const { results, error } = await Politician.searchSpeeches(speechQuery, {
        limit: 10,
      });
      if (error) setSpeechError(error);
      else setSpeechResults(results);
    } catch (e) {
      setSpeechError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSpeechLoading(false);
    }
  }, [speechQuery]);

  const searchDrucksachen = useCallback(async () => {
    if (!dipQuery.trim()) return;
    setDipLoading(true);
    setDipError(null);
    try {
      const { results, error } = await Politician.searchDrucksachen(dipQuery, {
        limit: 10,
      });
      if (error) setDipError(error);
      else setDipResults(results);
    } catch (e) {
      setDipError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setDipLoading(false);
    }
  }, [dipQuery]);

  const openProfile = useCallback(
    async (id: string) => {
      setProfileLoading(true);
      setProfileData(null);
      setProfileError(null);
      try {
        const data = (await Politician.getById(id)) as {
          politician?: any;
        } | null;
        if (data?.politician) setProfileData(data.politician);
      } catch (e) {
        setProfileError(
          e instanceof Error
            ? e.message
            : t("common.loadError", "Fehler beim Laden"),
        );
      } finally {
        setProfileLoading(false);
      }
    },
    [t],
  );

  return (
    <ChatSidebar isOpen={sidebarOpen} minWidth={420}>
      <div className="w-full h-full bg-theme-bg-sidebar flex flex-col overflow-hidden">
        <PanelHeader
          icon={<Database size={15} weight="fill" />}
          title={t("sidebar.database.title", "Politiker-Datenbank")}
          actions={
            <button
              onClick={refresh}
              type="button"
              disabled={loading}
              className="text-theme-text-muted hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
              aria-label={t("common.refresh", "Aktualisieren")}
            >
              <ArrowClockwise
                size={13}
                weight="bold"
                className={loading ? "animate-spin" : ""}
              />
            </button>
          }
          onClose={closeSidebar}
        />

        <Filters
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setProfileData(null);
          }}
          query={query}
          onQueryChange={setQuery}
          party={party}
          onPartyChange={setParty}
          state={state}
          onStateChange={setState}
          parties={parties}
          states={states}
          speechQuery={speechQuery}
          onSpeechQueryChange={setSpeechQuery}
          onSearchSpeeches={searchSpeeches}
          speechLoading={speechLoading}
          dipQuery={dipQuery}
          onDipQueryChange={setDipQuery}
          onSearchDrucksachen={searchDrucksachen}
          dipLoading={dipLoading}
        />

        {/* Bulk action bar */}
        {politicians.length > 0 && (
          <div className="px-4 py-2 flex items-center justify-between border-b border-theme-border shrink-0">
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-1.5 text-xs text-theme-text-muted hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare
                  size={14}
                  weight="fill"
                  className="text-blue-500"
                />
              ) : (
                <Square size={14} />
              )}
              {allSelected
                ? t("sidebar.database.deselectAll", "Auswahl aufheben")
                : t("sidebar.database.selectAll", "Alle auswählen")}
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={addSelectedToWorkspace}
                disabled={adding.size > 0 || !workspaceSlug}
                className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md px-2 py-1 transition-colors"
              >
                <Plus size={12} weight="bold" />
                {t("sidebar.database.addSelected", "{{count}} hinzufügen", {
                  count: selected.size,
                })}
              </button>
            )}
          </div>
        )}

        {!workspaceSlug && (
          <div className="px-4 py-2 text-xs text-amber-400 bg-amber-950/20 border-b border-amber-900/30">
            {t(
              "sidebar.database.noWorkspace",
              "Kein Workspace ausgewählt — Quellen-Hinzufügen deaktiviert.",
            )}
          </div>
        )}

        {addError && (
          <div className="px-4 py-2 text-xs text-red-400 bg-red-950/20 border-b border-red-900/30">
            {addError}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 no-scroll flex flex-col gap-2">
          {profileError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2">
              <Warning size={16} weight="fill" className="flex-shrink-0" />
              <span>
                {t("common.loadError", "Fehler beim Laden")}: {profileError}
              </span>
            </div>
          )}
          {profileData ? (
            <ProfileCard
              profileData={profileData}
              adding={adding}
              workspaceSlug={workspaceSlug}
              onBack={() => setProfileData(null)}
              onAddToWorkspace={addPoliticianToWorkspace}
            />
          ) : activeTab === "speeches" ? (
            <SpeechesTab
              speechLoading={speechLoading}
              speechError={speechError}
              speechResults={speechResults}
              speechQuery={speechQuery}
            />
          ) : activeTab === "drucksachen" ? (
            <DrucksachenTab
              dipLoading={dipLoading}
              dipError={dipError}
              dipResults={dipResults}
              dipQuery={dipQuery}
            />
          ) : (
            <PoliticiansTab
              politicians={politicians}
              loading={loading}
              error={error}
              selected={selected}
              adding={adding}
              workspaceSlug={workspaceSlug}
              onToggleSelected={toggleSelected}
              onOpenProfile={openProfile}
              onAddToWorkspace={addPoliticianToWorkspace}
              onRefresh={refresh}
            />
          )}
        </div>
      </div>
    </ChatSidebar>
  );
}
