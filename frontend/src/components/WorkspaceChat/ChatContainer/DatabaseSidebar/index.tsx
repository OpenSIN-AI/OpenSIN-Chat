// SPDX-License-Identifier: MIT
import { useState, useMemo, useCallback } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Users } from "@phosphor-icons/react/dist/csr/Users";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { CheckSquare } from "@phosphor-icons/react/dist/csr/CheckSquare";
import { Square } from "@phosphor-icons/react/dist/csr/Square";
import { Microphone } from "@phosphor-icons/react/dist/csr/Microphone";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { Calendar } from "@phosphor-icons/react/dist/csr/Calendar";
import { Briefcase } from "@phosphor-icons/react/dist/csr/Briefcase";
import { MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { usePoliticians } from "@/hooks/usePoliticians";
import useDocuments from "@/hooks/useDocuments";
import Politician from "@/models/politician";
import { swrFetcher } from "@/utils/swrFetcher";
import ChatSidebar, { useDatabaseSidebar } from "../ChatSidebar";

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
        faction: "AfD",
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

  const openProfile = useCallback(async (id: string) => {
    setProfileLoading(true);
    setProfileData(null);
    setProfileError(null);
    try {
      const data = await Politician.getById(id);
      if (data?.politician) setProfileData(data.politician);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : t("common.loadError", "Fehler beim Laden"));
    } finally {
      setProfileLoading(false);
    }
  }, [t]);

  return (
    <ChatSidebar isOpen={sidebarOpen} minWidth={420}>
      <div className="w-full h-full bg-zinc-900 light:bg-white light:border-l light:border-slate-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <Database size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-theme-text-primary light:text-theme-text-primary">
            {t("sidebar.database.title", "Politiker-Datenbank")}
          </p>
          <button
            onClick={refresh}
            type="button"
            disabled={loading}
            className="text-zinc-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 mr-1"
            aria-label={t("common.refresh", "Aktualisieren")}
          >
            <ArrowClockwise
              size={13}
              weight="bold"
              className={loading ? "animate-spin" : ""}
            />
          </button>
          <button
            onClick={closeSidebar}
            type="button"
            aria-label={t("common.close", "Schließen")}
            className="text-theme-text-secondary light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 flex flex-col gap-2 border-b border-zinc-800 light:border-slate-200">
          {/* Tab toggle: Politicians | Speeches | Drucksachen */}
          <div className="flex gap-1 mb-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("politicians");
                setProfileData(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
                activeTab === "politicians"
                  ? "bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
                  : "bg-transparent text-zinc-500 light:text-slate-400 hover:text-zinc-300"
              }`}
            >
              <Users size={12} />
              {t("sidebar.database.tabPoliticians", "Politiker")}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("speeches");
                setProfileData(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
                activeTab === "speeches"
                  ? "bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
                  : "bg-transparent text-zinc-500 light:text-slate-400 hover:text-zinc-300"
              }`}
            >
              <Microphone size={12} />
              {t("sidebar.database.tabSpeeches", "Reden")}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("drucksachen");
                setProfileData(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
                activeTab === "drucksachen"
                  ? "bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
                  : "bg-transparent text-zinc-500 light:text-slate-400 hover:text-zinc-300"
              }`}
            >
              <FileText size={12} />
              {t("sidebar.database.tabDrucksachen", "Drucksachen")}
            </button>
          </div>

          {activeTab === "speeches" ? (
            /* Speech search input */
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 light:text-slate-400"
                />
                <input
                  type="search"
                  value={speechQuery}
                  onChange={(e) => setSpeechQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchSpeeches()}
                  placeholder={t(
                    "sidebar.database.speechSearch",
                    "Thema suchen (z.B. Klima)...",
                  )}
                  aria-label={t(
                    "sidebar.database.speechSearch",
                    "Thema suchen...",
                  )}
                  className="w-full border border-zinc-700 light:border-slate-300 rounded-md pl-8 pr-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-950 light:bg-white outline-none focus:border-blue-500 placeholder:text-zinc-500 light:placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={searchSpeeches}
                disabled={speechLoading || !speechQuery.trim()}
                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium border-none cursor-pointer transition-colors"
              >
                {speechLoading ? "..." : t("common.search", "Suchen")}
              </button>
            </div>
          ) : activeTab === "drucksachen" ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 light:text-slate-400"
                />
                <input
                  type="search"
                  value={dipQuery}
                  onChange={(e) => setDipQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchDrucksachen()}
                  placeholder={t(
                    "sidebar.database.dipSearch",
                    "Bundestags-Drucksachen durchsuchen...",
                  )}
                  aria-label={t(
                    "sidebar.database.dipSearch",
                    "Bundestags-Drucksachen durchsuchen...",
                  )}
                  className="w-full border border-zinc-700 light:border-slate-300 rounded-md pl-8 pr-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-950 light:bg-white outline-none focus:border-blue-500 placeholder:text-zinc-500 light:placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={searchDrucksachen}
                disabled={dipLoading || !dipQuery.trim()}
                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium border-none cursor-pointer transition-colors"
              >
                {dipLoading ? "..." : t("common.search", "Suchen")}
              </button>
            </div>
          ) : (
            /* Politician search filters */
            <>
              <div className="relative">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 light:text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("sidebar.database.search", "Name suchen...")}
                  aria-label={t("sidebar.database.search", "Name suchen...")}
                  className="w-full border border-zinc-700 light:border-slate-300 rounded-md pl-8 pr-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-950 light:bg-white outline-none focus:border-blue-500 placeholder:text-zinc-500 light:placeholder:text-slate-400"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  className="flex-1 border border-zinc-700 light:border-slate-300 rounded-md px-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-950 light:bg-white outline-none focus:border-blue-500 cursor-pointer"
                  aria-label={t("sidebar.database.partyFilter", "Partei")}
                >
                  <option value="">
                    {t("sidebar.database.allParties", "Alle Parteien")}
                  </option>
                  {parties.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="flex-1 border border-zinc-700 light:border-slate-300 rounded-md px-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-950 light:bg-white outline-none focus:border-blue-500 cursor-pointer"
                  aria-label={t("sidebar.database.stateFilter", "Bundesland")}
                >
                  <option value="">
                    {t("sidebar.database.allStates", "Alle Bundesländer")}
                  </option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Bulk action bar */}
        {politicians.length > 0 && (
          <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-800 light:border-slate-200 shrink-0">
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-1.5 text-xs text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
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
                className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-2 py-1 rounded-md border-none cursor-pointer transition-colors"
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
              <span>{t("common.loadError", "Fehler beim Laden")}: {profileError}</span>
            </div>
          )}
          {profileData ? (
            /* Profile Card View */
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setProfileData(null)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer self-start"
              >
                <ArrowLeft size={12} weight="bold" />
                {t("common.back", "Zurück")}
              </button>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200">
                <div className="w-12 h-12 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <Users
                    size={20}
                    className="text-zinc-400 light:text-slate-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-theme-text-primary light:text-theme-text-primary truncate">
                    {profileData.fullName ||
                      `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
                      profileData.id}
                  </p>
                  <p className="text-xs text-zinc-500 light:text-slate-400 truncate">
                    {profileData.party || "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-zinc-300 light:text-slate-600">
                {profileData.party && (
                  <div className="flex items-center gap-2">
                    <Briefcase
                      size={12}
                      className="text-zinc-500 flex-shrink-0"
                    />{" "}
                    {profileData.party}
                  </div>
                )}
                {profileData.state && (
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-zinc-500 flex-shrink-0" />{" "}
                    {profileData.state}
                  </div>
                )}
                {profileData.electoralDistrict && (
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-zinc-500 flex-shrink-0" />{" "}
                    {profileData.electoralDistrict}
                  </div>
                )}
                {profileData.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeSimple
                      size={12}
                      className="text-zinc-500 flex-shrink-0"
                    />{" "}
                    {profileData.email}
                  </div>
                )}
                {profileData.birthDate && (
                  <div className="flex items-center gap-2">
                    <Calendar
                      size={12}
                      className="text-zinc-500 flex-shrink-0"
                    />{" "}
                    {
                      new Date(profileData.birthDate)
                        .toISOString()
                        .split("T")[0]
                    }
                  </div>
                )}
                {profileData.profession && (
                  <div className="flex items-center gap-2">
                    <Briefcase
                      size={12}
                      className="text-zinc-500 flex-shrink-0"
                    />{" "}
                    {profileData.profession}
                  </div>
                )}
              </div>
              {profileData.bio && (
                <div className="p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
                    {t("sidebar.database.biography", "Biografie")}
                  </p>
                  <p className="text-xs text-zinc-300 light:text-slate-600 leading-relaxed">
                    {profileData.bio}
                  </p>
                </div>
              )}
              {profileData.stats && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 text-center">
                    <p className="text-lg font-bold text-theme-text-primary light:text-theme-text-primary">
                      {profileData.stats.speeches ?? 0}
                    </p>
                    <p className="text-[10px] text-zinc-500 light:text-slate-400">
                      {t("sidebar.database.statSpeeches", "Reden")}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 text-center">
                    <p className="text-lg font-bold text-theme-text-primary light:text-theme-text-primary">
                      {profileData.stats.votes ?? 0}
                    </p>
                    <p className="text-[10px] text-zinc-500 light:text-slate-400">
                      {t("sidebar.database.statVotes", "Abstimmungen")}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 text-center">
                    <p className="text-lg font-bold text-theme-text-primary light:text-theme-text-primary">
                      {profileData.stats.mandates ?? 0}
                    </p>
                    <p className="text-[10px] text-zinc-500 light:text-slate-400">
                      {t("sidebar.database.statMandates", "Mandate")}
                    </p>
                  </div>
                </div>
              )}
              {profileData.profileUrl && (
                <a
                  href={profileData.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ArrowSquareOut size={12} />
                  {t("sidebar.database.openProfile", "Profil öffnen")}
                </a>
              )}
              <button
                type="button"
                onClick={() => addPoliticianToWorkspace(profileData.id)}
                disabled={adding.has(profileData.id) || !workspaceSlug}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium border-none cursor-pointer transition-colors"
              >
                <Plus size={14} weight="bold" />
                {t(
                  "sidebar.database.addToWorkspace",
                  "Zum Workspace hinzufügen",
                )}
              </button>
            </div>
          ) : activeTab === "speeches" ? (
            /* Speech search results */
            <>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
                {t("sidebar.database.speechResults", "Reden-Suchergebnisse")}
              </p>

              {speechLoading && (
                <div className="flex flex-col gap-2">
                  {/* index key OK: static list */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-zinc-800 light:bg-slate-100 animate-pulse space-y-2"
                    >
                      <div className="h-3 w-24 rounded bg-zinc-700 light:bg-slate-200" />
                      <div className="h-2 w-full rounded bg-zinc-700 light:bg-slate-200" />
                      <div className="h-2 w-3/4 rounded bg-zinc-700 light:bg-slate-200" />
                    </div>
                  ))}
                </div>
              )}

              {speechError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400">
                  {speechError}
                </div>
              )}

              {!speechLoading &&
                !speechError &&
                speechResults.length === 0 &&
                speechQuery && (
                  <p className="text-xs text-zinc-500 italic">
                    {t("sidebar.database.noSpeeches", "Keine Reden gefunden.")}
                  </p>
                )}

              {!speechLoading &&
                !speechError &&
                speechResults.length === 0 &&
                !speechQuery && (
                  <p className="text-xs text-zinc-500 italic">
                    {t(
                      "sidebar.database.speechHint",
                      "Suche nach einem Thema, um passende Bundestagsreden zu finden.",
                    )}
                  </p>
                )}

              {speechResults.map((s, i) => (
                <div
                  key={s.id || i}
                  className="p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Microphone
                      size={12}
                      className="text-zinc-400 flex-shrink-0"
                    />
                    <p className="text-xs font-medium text-theme-text-primary light:text-theme-text-primary truncate">
                      {s.politicianName || s.politician_name || "—"}
                    </p>
                    {s.party && (
                      <span className="text-[10px] text-zinc-500 light:text-slate-400">
                        ({s.party})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 light:text-slate-600 leading-snug line-clamp-3">
                    {s.text || s.speechText || s.excerpt || "—"}
                  </p>
                  {s.date && (
                    <p className="text-[10px] text-zinc-500 light:text-slate-400 mt-1">
                      {s.date}
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : activeTab === "drucksachen" ? (
            /* DIP Drucksachen results */
            <>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
                {t("sidebar.database.dipResults", "Bundestags-Drucksachen")}
              </p>

              {dipLoading && (
                <div className="flex flex-col gap-2">
                  {/* index key OK: static list */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-zinc-800 light:bg-slate-100 animate-pulse space-y-2"
                    >
                      <div className="h-3 w-32 rounded bg-zinc-700 light:bg-slate-200" />
                      <div className="h-2 w-full rounded bg-zinc-700 light:bg-slate-200" />
                      <div className="h-2 w-3/4 rounded bg-zinc-700 light:bg-slate-200" />
                    </div>
                  ))}
                </div>
              )}

              {dipError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400">
                  {dipError}
                </div>
              )}

              {!dipLoading &&
                !dipError &&
                dipResults.length === 0 &&
                !dipQuery && (
                  <p className="text-xs text-zinc-500 italic">
                    {t(
                      "sidebar.database.dipHint",
                      "Suche nach Bundestags-Drucksachen (Anfragen, Anträge, Berichte).",
                    )}
                  </p>
                )}

              {!dipLoading &&
                !dipError &&
                dipResults.length === 0 &&
                dipQuery && (
                  <p className="text-xs text-zinc-500 italic">
                    {t(
                      "sidebar.database.noDipResults",
                      "Keine Drucksachen gefunden.",
                    )}
                  </p>
                )}

              {dipResults.map((doc, i) => (
                <div
                  key={doc.id || i}
                  className="p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText
                      size={12}
                      className="text-zinc-400 flex-shrink-0"
                    />
                    <p className="text-xs font-medium text-theme-text-primary light:text-theme-text-primary truncate flex-1">
                      {doc.titel || doc.title || "—"}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-300 light:text-slate-600 leading-snug line-clamp-3">
                    {doc.kurz_beschreibung ||
                      doc.abstract ||
                      doc.description ||
                      "—"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {doc.typ && (
                      <span className="text-[10px] text-zinc-500 light:text-slate-400 bg-zinc-700/50 light:bg-slate-100 rounded px-1.5 py-0.5">
                        {doc.typ}
                      </span>
                    )}
                    {doc.datum && (
                      <span className="text-[10px] text-zinc-500 light:text-slate-400">
                        {new Date(doc.datum).toLocaleDateString()}
                      </span>
                    )}
                    {doc.drucksachennummer && (
                      <span className="text-[10px] text-zinc-500 light:text-slate-400">
                        {doc.drucksachennummer}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
                {t("sidebar.database.source", "Quelle: Abgeordnetenwatch API")}
              </p>

              {loading && politicians.length === 0 && (
                <div className="flex flex-col gap-2">
                  {/* index key OK: static list */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800 light:bg-slate-100 animate-pulse"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-700 light:bg-slate-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 rounded bg-zinc-700 light:bg-slate-200" />
                        <div className="h-2 w-20 rounded bg-zinc-700 light:bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex flex-col gap-2">
                  <span>
                    {t("sidebar.database.error", "Fehler beim Laden")}: {error}
                  </span>
                  <button
                    onClick={refresh}
                    type="button"
                    className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-200 border-none cursor-pointer transition-colors"
                  >
                    <ArrowClockwise size={11} weight="bold" />
                    {t("sidebar.retry", "Erneut versuchen")}
                  </button>
                </div>
              )}

              {!loading && !error && politicians.length === 0 && (
                <p className="text-xs text-zinc-500 italic">
                  {t("sidebar.database.empty", "Keine Politiker gefunden.")}
                </p>
              )}

              {politicians.map((p) => {
                const name =
                  `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
                  p.label ||
                  t("common.unknown", "—");
                const constituency =
                  p.constituency?.label ||
                  p.electoral_data?.constituency?.label ||
                  null;
                const profileUrl = p.abgeordnetenwatch_url || null;
                const isSelected = selected.has(p.id);
                const isAdding = adding.has(p.id);
                const separator = t("common.listSeparator", " — ");
                return (
                  <div
                    key={p.id}
                    onClick={() => openProfile(p.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500/40"
                        : "bg-zinc-800 light:bg-slate-50 border-zinc-700 light:border-slate-200 hover:bg-zinc-700/50 light:hover:bg-slate-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelected(p.id);
                      }}
                      className="text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer flex-shrink-0"
                      aria-label={t("sidebar.database.select", "Auswählen")}
                    >
                      {isSelected ? (
                        <CheckSquare
                          size={16}
                          weight="fill"
                          className="text-blue-500"
                        />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <Users
                        size={15}
                        className="text-zinc-400 light:text-slate-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme-text-primary light:text-theme-text-primary truncate">
                        {name}
                      </p>
                      <p className="text-[11px] text-zinc-500 light:text-slate-400 truncate">
                        {[p.party?.label, p.state, constituency]
                          .filter(Boolean)
                          .join(separator)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addPoliticianToWorkspace(p.id);
                      }}
                      disabled={isAdding || !workspaceSlug}
                      className="text-zinc-500 hover:text-blue-400 disabled:opacity-40 transition-colors border-none bg-transparent cursor-pointer flex-shrink-0"
                      aria-label={t(
                        "sidebar.database.addToWorkspace",
                        "Zur Quelle hinzufügen",
                      )}
                      title={t(
                        "sidebar.database.addToWorkspace",
                        "Zur Quelle hinzufügen",
                      )}
                    >
                      <Plus
                        size={16}
                        weight={isAdding ? "bold" : "regular"}
                        className={isAdding ? "animate-pulse" : ""}
                      />
                    </button>
                    {profileUrl && (
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                        aria-label={t(
                          "sidebar.database.openProfile",
                          "Profil öffnen",
                        )}
                        title={t(
                          "sidebar.database.openProfile",
                          "Profil öffnen",
                        )}
                      >
                        <ArrowSquareOut size={13} />
                      </a>
                    )}
                  </div>
                );
              })}

              <div className="mt-3 p-3 rounded-xl bg-zinc-800/50 light:bg-slate-100 border border-zinc-700 light:border-slate-200">
                <p className="text-[10px] text-zinc-500 light:text-slate-500 leading-relaxed">
                  {t(
                    "sidebar.database.hint",
                    "Nutze @agent im Chat, um gezielt nach Politikern oder deren Reden zu recherchieren.",
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ChatSidebar>
  );
}
