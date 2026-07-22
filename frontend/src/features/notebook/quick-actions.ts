// SPDX-License-Identifier: MIT

import type { NotebookModeId } from "./modes";

export interface NotebookQuickAction {
  id: string;
  title: string;
  prompt: string;
}

export const NOTEBOOK_QUICK_ACTIONS: Record<NotebookModeId, NotebookQuickAction[]> = {
  chat: [
    { id: "summarize-sources", title: "Quellen zusammenfassen", prompt: "Fasse die ausgewählten Quellen verständlich zusammen und nenne die wichtigsten Erkenntnisse." },
    { id: "compare-sources", title: "Quellen vergleichen", prompt: "Vergleiche die ausgewählten Quellen. Zeige Übereinstimmungen, Widersprüche und offene Fragen." },
    { id: "explain-topic", title: "Thema erklären", prompt: "Erkläre das zentrale Thema der ausgewählten Quellen klar und ohne unnötigen Fachjargon." },
    { id: "find-answers", title: "Fragen beantworten", prompt: "Welche wichtigen Fragen lassen sich anhand der ausgewählten Quellen beantworten?" },
  ],
  work: [
    { id: "research-report", title: "Bericht erstellen", prompt: "Erstelle aus den ausgewählten Quellen einen strukturierten Bericht mit Zusammenfassung, Erkenntnissen und nächsten Schritten." },
    { id: "research-gaps", title: "Lücken recherchieren", prompt: "Prüfe die ausgewählten Quellen auf Informationslücken und recherchiere fehlende aktuelle Informationen im Web." },
    { id: "action-plan", title: "Arbeitsplan erstellen", prompt: "Erstelle auf Grundlage der ausgewählten Quellen einen konkreten Arbeitsplan mit priorisierten Aufgaben." },
    { id: "create-briefing", title: "Briefing vorbereiten", prompt: "Erstelle ein kompaktes Briefing aus den ausgewählten Quellen mit Fakten, Risiken und Handlungsempfehlungen." },
  ],
  code: [
    { id: "understand-codebase", title: "Codebase verstehen", prompt: "Analysiere das ausgewählte Repository und erkläre Architektur, zentrale Komponenten und Datenfluss." },
    { id: "find-problems", title: "Probleme finden", prompt: "Untersuche das ausgewählte Repository auf Fehler, Sicherheitsprobleme, unnötige Komplexität und technische Schulden." },
    { id: "implement-feature", title: "Feature umsetzen", prompt: "Plane die gewünschte Änderung im ausgewählten Repository und setze sie mit dem verbundenen Coding-Agenten um." },
    { id: "run-tests", title: "Tests und Fehler", prompt: "Führe die relevanten Tests im ausgewählten Repository aus, analysiere Fehler und behebe ihre Ursachen." },
  ],
};
