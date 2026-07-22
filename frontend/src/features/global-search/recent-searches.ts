// SPDX-License-Identifier: MIT

const STORAGE_KEY = "opensin_recent_searches";
const MAX_RECENT_SEARCHES = 8;

export function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function rememberSearch(query: string) {
  const normalized = query.replace(/\s+/g, " ").trim();
  if (normalized.length < 2) return;

  const next = [
    normalized,
    ...readRecentSearches().filter(
      (item) =>
        item.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearRecentSearches() {
  window.localStorage.removeItem(STORAGE_KEY);
}
