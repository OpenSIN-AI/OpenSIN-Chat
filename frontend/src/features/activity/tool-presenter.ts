// SPDX-License-Identifier: MIT

import type { ActivityKind } from "./types";

interface ToolPresentation {
  kind: ActivityKind;
  runningTitle: string;
  doneTitle: string;
  errorTitle: string;
}

const PRESENTATIONS: Array<{ matches: RegExp; presentation: ToolPresentation }> = [
  { matches: /web.?search|search.?web|google.?search|bing.?search|serper|tavily/i, presentation: { kind: "web-search", runningTitle: "Durchsucht das Web", doneTitle: "Websuche abgeschlossen", errorTitle: "Websuche fehlgeschlagen" } },
  { matches: /browser|navigate|open.?url|visit.?page|fetch.?page|website/i, presentation: { kind: "browser", runningTitle: "Öffnet eine Webseite", doneTitle: "Webseite gelesen", errorTitle: "Webseite konnte nicht gelesen werden" } },
  { matches: /youtube|transcript|video.?content/i, presentation: { kind: "source-read", runningTitle: "Analysiert das Video", doneTitle: "Video analysiert", errorTitle: "Video konnte nicht analysiert werden" } },
  { matches: /pdf|document|file.?read|read.?file|attachment|parse.?file/i, presentation: { kind: "file-read", runningTitle: "Liest eine Datei", doneTitle: "Datei gelesen", errorTitle: "Datei konnte nicht gelesen werden" } },
  { matches: /rag|vector|similarity|workspace.?search|source.?search|retrieve/i, presentation: { kind: "source-read", runningTitle: "Durchsucht die Quellen", doneTitle: "Quellen durchsucht", errorTitle: "Quellen konnten nicht durchsucht werden" } },
  { matches: /github|gitlab|bitbucket|repository|repo.?search|git.?status/i, presentation: { kind: "repository", runningTitle: "Untersucht das Repository", doneTitle: "Repository analysiert", errorTitle: "Repository konnte nicht analysiert werden" } },
  { matches: /terminal|shell|command|execute|exec|bash|powershell/i, presentation: { kind: "terminal", runningTitle: "Führt einen Befehl aus", doneTitle: "Befehl ausgeführt", errorTitle: "Befehl fehlgeschlagen" } },
  { matches: /write.?file|edit.?file|patch|replace.?file|apply.?diff/i, presentation: { kind: "code-edit", runningTitle: "Bearbeitet Dateien", doneTitle: "Dateien geändert", errorTitle: "Dateien konnten nicht geändert werden" } },
  { matches: /test|lint|type.?check|build/i, presentation: { kind: "terminal", runningTitle: "Prüft die Änderungen", doneTitle: "Prüfung abgeschlossen", errorTitle: "Prüfung fehlgeschlagen" } },
  { matches: /gmail|email|mail/i, presentation: { kind: "email", runningTitle: "Durchsucht E-Mails", doneTitle: "E-Mails durchsucht", errorTitle: "E-Mails konnten nicht gelesen werden" } },
  { matches: /drive|notion|dropbox|onedrive|cloud/i, presentation: { kind: "cloud", runningTitle: "Liest verbundene Inhalte", doneTitle: "Verbundene Inhalte gelesen", errorTitle: "Verbundene Inhalte konnten nicht gelesen werden" } },
];

const FALLBACK: ToolPresentation = { kind: "generic", runningTitle: "Arbeitet an der Anfrage", doneTitle: "Arbeitsschritt abgeschlossen", errorTitle: "Arbeitsschritt fehlgeschlagen" };

export function presentTool(name: string): ToolPresentation {
  return PRESENTATIONS.find(({ matches }) => matches.test(name))?.presentation || FALLBACK;
}

export function toolTitle(name: string, status: "running" | "done" | "error"): string {
  const presentation = presentTool(name);
  switch (status) {
    case "done": return presentation.doneTitle;
    case "error": return presentation.errorTitle;
    case "running":
    default: return presentation.runningTitle;
  }
}
