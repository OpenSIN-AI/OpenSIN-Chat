// SPDX-License-Identifier: MIT
import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import Preloader from "@/components/Preloader";
import debounce from "lodash.debounce";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { Tooltip } from "react-tooltip";
import logger from "@/utils/logger";

const DEFAULT_SEARCH_RESULTS = {
  workspaces: [],
  threads: [],
};

const SEARCH_RESULT_SELECTED: any = "search-result-selected";
function SearchBox({ user, showNewWsModal }: any) {
  const { t } = useTranslation();
  const searchRef = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState(DEFAULT_SEARCH_RESULTS);
  const handleSearchDebouncedRef = useRef(null as any);
  const handleSearch = useCallback(
    debounce((e: any) => handleSearchDebouncedRef.current?.(e), 500),
    [],
  );

  useEffect(() => {
    return () => handleSearch.cancel();
  }, [handleSearch]);

  async function handleSearchDebounced(e: any) {
    try {
      const searchValue = (e.target as unknown as any)?.value;
      setSearchTerm(searchValue);
      setLoading(true);
      const searchResults =
        await Workspace.searchWorkspaceOrThread(searchValue);
      setSearchResults(searchResults);
    } catch (error) {
      logger.error(error);
      setSearchResults(DEFAULT_SEARCH_RESULTS);
      showToast(t("sidebarSearch.searchFailed"), "error", { clear: true });
    } finally {
      setLoading(false);
    }
  }
  handleSearchDebouncedRef.current = handleSearchDebounced;

  function handleReset() {
    searchRef.current.value = "";
    setSearchTerm("");
    setLoading(false);
    setSearchResults(DEFAULT_SEARCH_RESULTS);
  }

  useEffect(() => {
    window.addEventListener(SEARCH_RESULT_SELECTED, handleReset);
    return () =>
      window.removeEventListener(SEARCH_RESULT_SELECTED, handleReset);
  }, []);

  return (
    <div className="flex gap-x-1.5 w-full items-center h-7">
      <div className="relative h-full w-full flex">
        <input
          ref={searchRef}
          type="search"
          aria-label={t("sidebar.searchWorkspace")}
          placeholder={t("common.search")}
          onChange={handleSearch}
          onReset={handleReset}
          onFocus={(e) => e.target.select()}
          className="border border-white/[0.05] light:border-zinc-200 w-full h-full rounded-md bg-white/[0.02] light:bg-zinc-50 pl-7 focus:pl-3 pr-1 placeholder:text-[#3f3f46] light:placeholder:text-zinc-400 placeholder:text-xs outline-none focus:ring-1 focus:ring-white/[0.08] light:focus:ring-zinc-300 text-[#e4e4e7] light:text-zinc-900 search-input peer text-xs transition-all"
        />
        {!searchTerm && (
          <MagnifyingGlass
            size={11}
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-[#3f3f46] light:text-zinc-400 peer-focus:invisible"
            weight="regular"
          />
        )}
      </div>
      <ShortWidthNewWorkspaceButton
        user={user}
        showNewWsModal={showNewWsModal}
      />
      <SearchResults
        searchResults={searchResults}
        searchTerm={searchTerm}
        loading={loading}
      />
    </div>
  );
}

function SearchResultWrapper({ children }: any) {
  return (
    <div className="absolute right-0 top-[6.2%] w-full flex flex-col gap-y-[24px] h-auto bg-theme-modal-border light:bg-theme-bg-primary light:border-2 light:border-theme-modal-border rounded-lg p-[16px] z-10 max-h-[calc(100%-24px)] overflow-y-scroll no-scroll">
      {children}
    </div>
  );
}

function SearchResults({ searchResults, searchTerm, loading }: any) {
  const { t } = useTranslation();
  if (!searchTerm || searchTerm.length < 3) return null;
  if (loading)
    return (
      <SearchResultWrapper>
        <div className="flex flex-col gap-y-[8px] h-[200px] justify-center items-center">
          <Preloader size={5} />
          <p className="text-theme-text-secondary text-xs font-semibold text-center">
            {t("sidebarSearch.searchingFor", { searchTerm })}
          </p>
        </div>
      </SearchResultWrapper>
    );

  if (
    searchResults.workspaces.length === 0 &&
    searchResults.threads.length === 0
  ) {
    return (
      <SearchResultWrapper>
        <div className="flex flex-col gap-y-[8px] h-[200px] justify-center items-center">
          <p className="text-theme-text-secondary text-xs font-semibold text-center">
            {t("sidebarSearch.noResultsFound")}
            <br />
            <span className="text-theme-text-primary font-semibold text-sm">
              {t("sidebarSearch.searchTermQuoted", { searchTerm })}
            </span>
          </p>
        </div>
      </SearchResultWrapper>
    );
  }

  return (
    <SearchResultWrapper>
      <SearchResultCategory
        name={t("sidebarSearch.workspaces")}
        items={searchResults.workspaces?.map((workspace) => ({
          id: workspace.slug,
          to: paths.workspace.chat(workspace.slug),
          name: workspace.name,
        }))}
      />
      <SearchResultCategory
        name={t("sidebarSearch.threads")}
        items={searchResults.threads?.map((thread) => ({
          id: thread.slug,
          to: paths.workspace.thread(thread.workspace.slug, thread.slug),
          name: thread.name,
          hint: thread.workspace.name,
        }))}
      />
    </SearchResultWrapper>
  );
}

function SearchResultCategory({ items, name }: any) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col gap-y-[8px]">
      <p className="text-theme-text-secondary text-xs uppercase font-semibold px-[4px]">
        {name}
      </p>
      <div className="flex flex-col gap-y-[6px]">
        {(items as any).map((item) => (
          <SearchResultItem
            key={item.id}
            to={item.to}
            name={item.name}
            hint={item.hint}
          />
        ))}
      </div>
    </div>
  );
}

function SearchResultItem({ to, name, hint }: any) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      onClick={() => window.dispatchEvent(new Event(SEARCH_RESULT_SELECTED))}
      className="hover:bg-[#FFF]/10 light:hover:bg-[#000]/10 transition-all duration-300 rounded-sm px-[8px] py-[2px]"
    >
      <p className="text-theme-text-primary text-sm truncate w-[80%]">
        {name}
        {hint && (
          <span className="text-theme-text-secondary text-xs ml-[4px]">
            {t("sidebarSearch.hintSeparator", { hint })}
          </span>
        )}
      </p>
    </Link>
  );
}

function ShortWidthNewWorkspaceButton({ user, showNewWsModal }: any) {
  const { t } = useTranslation();
  if (!!user && user?.role === "default") return null;

  return (
    <>
      <button
        type="button"
        data-tooltip-id="new-workspace-tooltip"
        data-tooltip-content={t("new-workspace.title")}
        aria-label={t("new-workspace.title")}
        onClick={showNewWsModal}
        className="flex items-center justify-center bg-[#fafafa] light:bg-zinc-900 rounded-md p-1.5 hover:bg-[#e4e4e7] light:hover:bg-zinc-800 transition-colors duration-150 border-none flex-shrink-0"
      >
        <Plus
          size={12}
          weight="bold"
          className="text-zinc-900 light:text-white"
        />
      </button>
      <Tooltip
        id="new-workspace-tooltip"
        place="top"
        delayShow={300}
        className="tooltip !text-xs"
      />
    </>
  );
}

export default memo(SearchBox);
