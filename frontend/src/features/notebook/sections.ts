// SPDX-License-Identifier: MIT

export const NOTEBOOK_SECTION_IDS = ["chat", "sources", "notes", "results"] as const;

export type NotebookSectionId = (typeof NOTEBOOK_SECTION_IDS)[number];

export interface NotebookSectionDefinition {
  id: NotebookSectionId;
  label: string;
  description: string;
}

export const NOTEBOOK_SECTIONS: Record<NotebookSectionId, NotebookSectionDefinition> = {
  chat: { id: "chat", label: "Chat", description: "Mit der KI und deinen Quellen arbeiten" },
  sources: { id: "sources", label: "Quellen", description: "Dateien, Links und verbundene Dienste" },
  notes: { id: "notes", label: "Notizen", description: "Gedanken, Entwürfe und gespeicherte Inhalte" },
  results: { id: "results", label: "Ergebnisse", description: "Berichte, Dokumente und erzeugte Dateien" },
};

export function isNotebookSectionId(value: unknown): value is NotebookSectionId {
  return NOTEBOOK_SECTION_IDS.includes(value as NotebookSectionId);
}
