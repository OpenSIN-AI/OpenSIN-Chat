// SPDX-License-Identifier: MIT
/**
 * @pdf-analyze — Agent-Plugin: stößt die autonome Multi-Agenten-PDF-Analyse
 * aus dem Chat an, prüft Status und fragt gespeicherte Fakten ab.
 */
const {
  PdfAnalysisPipeline,
} = require("../../../pdfAnalysis");
const { CrossCheckPipeline } = require("../../../pdfAnalysis/crossCheck");
const { CorpusPipeline } = require("../../../pdfAnalysis/corpus");

const pdfAnalyze = {
  name: "pdf-analyze",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "pdf-analyze-start",
          description:
            "Startet die autonome, parallele Multi-Agenten-Analyse eines (sehr großen) PDF-Dokuments. " +
            "Erzeugt am Ende einen Best-Practices-Bericht und speichert ausgewählte Fakten mit Quellenbezug. " +
            "Gibt eine jobId zurück, deren Status abgefragt werden kann.",
          parameters: {
            type: "object",
            properties: {
              pdfPath: {
                type: "string",
                description: "Absoluter Pfad zur PDF-Datei auf dem Server.",
              },
              task: {
                type: "string",
                description: "Was soll analysiert werden (Auftrag des Nutzers).",
              },
              reportType: {
                type: "string",
                description: "Optionale Art des Berichts.",
              },
              factCriteria: {
                type: "string",
                description:
                  "Optionale Kriterien, welche Einzelinformationen gespeichert werden sollen.",
              },
              deepScan: {
                type: "boolean",
                description:
                  "true = Deep Scan: jede Seite wird visuell durch das lokale Vision-Modell " +
                  "(MiniCPM-V) gelesen — für komplexe Layouts, Tabellen, Scans, Formulare.",
              },
            },
            required: ["pdfPath", "task"],
          },
          handler: async function ({
            pdfPath,
            task,
            reportType,
            factCriteria,
            deepScan,
          }) {
            try {
              const { jobId } = PdfAnalysisPipeline.start({
                pdfPath,
                task,
                reportType,
                factCriteria,
                deepScan: !!deepScan,
              });
              return `Analyse gestartet. Job-ID: ${jobId}. Status via pdf-analyze-status abrufbar.`;
            } catch (e) {
              return `Fehler beim Start: ${e.message}`;
            }
          },
        });

        aibitat.function({
          super: aibitat,
          name: "pdf-analyze-status",
          description:
            "Fragt Status/Fortschritt eines PDF-Analyse-Jobs ab; bei Abschluss wird der Bericht zurückgegeben.",
          parameters: {
            type: "object",
            properties: {
              jobId: { type: "string", description: "Die Job-ID." },
            },
            required: ["jobId"],
          },
          handler: async function ({ jobId }) {
            const status = PdfAnalysisPipeline.getStatus(jobId);
            if (!status) return "Job nicht gefunden.";
            if (status.status !== "completed")
              return JSON.stringify(status, null, 2);
            const result = PdfAnalysisPipeline.getResult(jobId);
            return [
              `Analyse abgeschlossen (${result.totalPages} Seiten, ${result.chunks} Chunks, ${result.factsStored} Fakten gespeichert).`,
              ``,
              result.report,
            ].join("\n");
          },
        });

        aibitat.function({
          super: aibitat,
          name: "pdf-facts-search",
          description:
            "Sucht gespeicherte Einzelinformationen (Fakten) aus analysierten PDFs — immer mit Quellenangabe (Dokument, Seite, Zitat).",
          parameters: {
            type: "object",
            properties: {
              q: { type: "string", description: "Freitext-Suchbegriff." },
              document: { type: "string", description: "Filter: Dokumentname." },
              tag: { type: "string", description: "Filter: Tag." },
            },
            required: [],
          },
          handler: async function ({ q, document, tag }) {
            const facts = PdfAnalysisPipeline.factStore.search({
              q,
              document,
              tag,
              limit: 20,
            });
            if (!facts.length) return "Keine gespeicherten Fakten gefunden.";
            return facts
              .map(
                (f) =>
                  `- ${f.detail}\n  Quelle: ${f.source.documentName}, S. ${f.source.page}` +
                  (f.quote ? ` — "${f.quote}"` : "")
              )
              .join("\n");
          },
        });

        aibitat.function({
          super: aibitat,
          name: "pdf-crosscheck-start",
          description:
            "Delegiert Recherche-Agenten zur Kreuz-Verifikation: prüft Behauptungen oder gespeicherte Fakten (factIds) " +
            "gegen weitere Quellen (PDF-Pfad, URL, YouTube-Video, Roh-Text) und/oder per autonomer Deep-Web-Recherche. " +
            "Erstellt einen konsolidierten Verifikationsbericht. Gibt eine jobId zurück.",
          parameters: {
            type: "object",
            properties: {
              claims: {
                type: "array",
                items: { type: "string" },
                description: "Zu prüfende Behauptungen (Freitext).",
              },
              factIds: {
                type: "array",
                items: { type: "string" },
                description: "IDs gespeicherter Fakten, die geprüft werden sollen.",
              },
              sources: {
                type: "array",
                description:
                  'Vergleichsquellen, z.B. [{"type":"url","url":"https://..."}, {"type":"youtube","url":"https://youtube.com/watch?v=..."}, {"type":"pdf","path":"/.../datei.pdf"}, {"type":"text","text":"..."}]',
                items: { type: "object" },
              },
              deepWeb: {
                type: "boolean",
                description:
                  "true = zusätzlich autonome Web-Recherche pro Behauptung delegieren.",
              },
            },
            required: [],
          },
          handler: async function ({
            claims = [],
            factIds = [],
            sources = [],
            deepWeb = false,
          }) {
            try {
              const { jobId } = CrossCheckPipeline.start(
                { claims, factIds, sources, deepWeb },
                PdfAnalysisPipeline.factStore
              );
              return `Kreuz-Verifikation gestartet. Job-ID: ${jobId}. Status via pdf-crosscheck-status abrufbar.`;
            } catch (e) {
              return `Fehler beim Start: ${e.message}`;
            }
          },
        });

        aibitat.function({
          super: aibitat,
          name: "pdf-crosscheck-status",
          description:
            "Status/Ergebnis einer Kreuz-Verifikation; bei Abschluss wird der konsolidierte Bericht zurückgegeben.",
          parameters: {
            type: "object",
            properties: {
              jobId: { type: "string", description: "Die Job-ID." },
            },
            required: ["jobId"],
          },
          handler: async function ({ jobId }) {
            const status = CrossCheckPipeline.getStatus(jobId);
            if (!status) return "Job nicht gefunden.";
            if (status.status !== "completed")
              return JSON.stringify(status, null, 2);
            const result = CrossCheckPipeline.getResult(jobId);
            return result.report || "Kein Bericht verfügbar.";
          },
        });

        aibitat.function({
          super: aibitat,
          name: "pdf-corpus-analyze",
          description:
            "Startet eine Korpus-Analyse: mehrere PDFs werden parallel analysiert und zu einem " +
            "konsolidierten Vergleichs-Report verdichtet (Übereinstimmungen, Widersprüche mit " +
            "Dokument+Seite-Belegen, dokumentspezifische Befunde). Gibt eine jobId zurück.",
          parameters: {
            type: "object",
            properties: {
              pdfPaths: {
                type: "array",
                items: { type: "string" },
                description: "Absolute Pfade der zu vergleichenden PDFs (min. 2).",
              },
              task: {
                type: "string",
                description: "Analyse-/Vergleichsauftrag des Nutzers.",
              },
              factCriteria: {
                type: "string",
                description: "Optionale Fakten-Kriterien.",
              },
              deepScan: {
                type: "boolean",
                description: "Deep Scan für alle Dokumente.",
              },
            },
            required: ["pdfPaths", "task"],
          },
          handler: async function ({
            pdfPaths,
            task,
            factCriteria,
            deepScan,
          }) {
            try {
              const { jobId } = CorpusPipeline.start({
                pdfPaths,
                task,
                factCriteria,
                deepScan: !!deepScan,
              });
              return `Korpus-Analyse über ${pdfPaths.length} Dokumente gestartet. Job-ID: ${jobId}. Status via pdf-corpus-status.`;
            } catch (e) {
              return `Fehler beim Start: ${e.message}`;
            }
          },
        });

        aibitat.function({
          super: aibitat,
          name: "pdf-corpus-status",
          description:
            "Status/Ergebnis einer Korpus-Analyse; bei Abschluss wird der konsolidierte Vergleichs-Report zurückgegeben.",
          parameters: {
            type: "object",
            properties: {
              jobId: { type: "string", description: "Die Job-ID." },
            },
            required: ["jobId"],
          },
          handler: async function ({ jobId }) {
            const status = CorpusPipeline.getStatus(jobId);
            if (!status) return "Job nicht gefunden.";
            if (status.status !== "completed")
              return JSON.stringify(status, null, 2);
            return CorpusPipeline.getResult(jobId).report || "Kein Report verfügbar.";
          },
        });
      },
    };
  },
};

module.exports = { pdfAnalyze };
