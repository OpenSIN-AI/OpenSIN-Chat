// SPDX-License-Identifier: MIT

export const NOTEBOOK_MODE_IDS = ["chat", "work", "code"] as const;

export type NotebookModeId = (typeof NOTEBOOK_MODE_IDS)[number];

export interface NotebookModeDefinition {
  id: NotebookModeId;
  label: string;
  description: string;
  placeholder: string;
  allowsSources: boolean;
  allowsWeb: boolean;
  allowsActions: boolean;
  allowsCodeRunners: boolean;
}

export const NOTEBOOK_MODES: Record<NotebookModeId, NotebookModeDefinition> = {
  chat: {
    id: "chat",
    label: "Chat",
    description: "Fragen, analysieren und mit deinen Quellen arbeiten",
    placeholder: "Frage etwas oder arbeite mit deinen Quellen …",
    allowsSources: true,
    allowsWeb: true,
    allowsActions: false,
    allowsCodeRunners: false,
  },
  work: {
    id: "work",
    label: "Work",
    description: "Recherchieren, planen und Aufgaben ausführen",
    placeholder: "Was soll recherchiert oder erledigt werden?",
    allowsSources: true,
    allowsWeb: true,
    allowsActions: true,
    allowsCodeRunners: false,
  },
  code: {
    id: "code",
    label: "Code",
    description: "Repositories verstehen und Coding-Agenten steuern",
    placeholder: "Beschreibe die Änderung im Code …",
    allowsSources: true,
    allowsWeb: true,
    allowsActions: true,
    allowsCodeRunners: true,
  },
};

export function isNotebookModeId(value: unknown): value is NotebookModeId {
  return NOTEBOOK_MODE_IDS.includes(value as NotebookModeId);
}

export function getNotebookMode(value: unknown): NotebookModeDefinition {
  if (isNotebookModeId(value)) return NOTEBOOK_MODES[value];
  return NOTEBOOK_MODES.chat;
}
