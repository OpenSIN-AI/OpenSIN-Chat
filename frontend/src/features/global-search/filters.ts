// SPDX-License-Identifier: MIT

import type { GlobalSearchType } from "./types";

export interface SearchFilter {
  id: string;
  label: string;
  types?: GlobalSearchType[];
}

export const SEARCH_FILTERS: SearchFilter[] = [
  { id: "all", label: "Alle" },
  { id: "chats", label: "Chats", types: ["thread", "chat"] },
  { id: "sources", label: "Quellen", types: ["source"] },
  { id: "notes", label: "Notizen", types: ["note"] },
  { id: "artifacts", label: "Ergebnisse", types: ["artifact"] },
  { id: "notebooks", label: "Notebooks", types: ["workspace"] },
];
