# Future Plan — Strukturelle Schulden (später, nicht jetzt)

> **Status:** PARKED — nicht aktuell.  
> **Priorität:** LOW — erst angehen, wenn das Projekt stabil läuft und sich jemand dafür entscheidet.  
> **Aktueller Fokus:** Dreck zum Laufen bringen. Fertig. Nichts davon.  

---

## Warum das hier liegt

Das ist ein kleines Chat-Projekt. Es soll laufen. Punkt.  
Die drei Punkte unten sind strukturelle Schulden aus der Anfangsphase (ursprünglich inspiriert von AnythingLLM) — nicht unsere Regressionen, nicht kritisch, nicht blockierend.  
Wir machen das **nur**, wenn wir irgendwann mal entscheiden, dass es sich lohnt.  
Aktuell: **Nein.**

---

## Issue #1 — Datenbank-Abfragen ohne Limit

**Problem:** 35 `findMany`-Aufrufe laden alle Einträge auf einmal. Bei Millionen Einträgen → OOM-Crash.

**Fix:** `take: 100` zu allen 35 Stellen hinzufügen. ~4 Stunden.

**Wann machen?** Wenn die DB wirklich mal groß wird oder der Server mal crasht. Bis dahin: egal.

---

## Issue #2 — workspaceEndpoints() Monster-Funktion

**Problem:** Eine Funktion mit 1.520 Zeilen. Macht alles. Testbar: nein. Wartbar: kaum.

**Fix:** In 5 kleine Funktionen aufteilen. ~8 Stunden.

**Wann machen?** Wenn jemand was an Workspace-Logik ändern will und an dieser Funktion verzweifelt. Bis dahin: läuft ja.

---

## Issue #3 — 114 Zirkuläre Abhängigkeiten

**Problem:** Module importieren sich im Kreis. Refactoring wird dadurch riskant.

**Fix:** Zwei Koppelungs-Hubs (`endpoints/utils.js`, `helpers/index.js`) in kleine Module zerlegen. ~24 Stunden.

**Wann machen?** Wenn wir mal groß refactorieren wollen. Aktuell: absolut nicht.

---

## Fazit

Das Projekt hat 3.600+ grüne Tests, 0 Sicherheitslücken, 0 CRITICAL Findings, Grade A- (85/100 — CEO Audit 2026-07-08).  
Es läuft. Die drei Issues hier sind "nice to have irgendwann mal" — nicht "musst du jetzt machen".  

Aktueller Stand: **PARKED.**
