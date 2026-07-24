// SPDX-License-Identifier: MIT
// DEV-ONLY mock handlers for /pdf-analysis/* endpoints.
// These are loaded exclusively when import.meta.env.DEV === true and the
// localStorage flag `opensin_pdf_mock` is set to "true".
import { http, HttpResponse, delay } from "msw";

const JOB_STORE: Record<string, any> = {};
const FACT_STORE: any[] = [];
const CROSS_STORE: Record<string, any> = {};
const CORPUS_STORE: Record<string, any> = {};

let jobCounter = 1;

// Simulate a job progressing from "pending" → "running" → "completed".
function simulateJobProgress(jobId: string) {
  const phases = [
    "init",
    "reading",
    "analyzing",
    "synthesizing",
    "verifying-facts",
    "storing-facts",
  ];
  let phaseIdx = 0;
  const total = 12;

  const tick = () => {
    const job = JOB_STORE[jobId];
    if (!job || job.status === "completed" || job.status === "failed") return;

    const done = Math.min(
      (job.progress.chunksDone || 0) + Math.ceil(Math.random() * 3),
      total,
    );
    phaseIdx = Math.min(
      phaseIdx + (done > (job.progress.chunksDone || 0) ? 1 : 0),
      phases.length - 1,
    );

    JOB_STORE[jobId].status = "running";
    JOB_STORE[jobId].progress = {
      phase: phases[phaseIdx],
      chunksDone: done,
      chunksTotal: total,
      concurrency: 4,
      pagesPerMinute: 8,
      etaSeconds: Math.round(((total - done) / total) * 60),
    };

    if (done >= total) {
      JOB_STORE[jobId].status = "completed";
      // Seed one fact per job completion
      FACT_STORE.push({
        id: `fact-${jobId}-1`,
        detail: `Der Bericht belegt eine Verdopplung der Netzausfälle zwischen 2022 und 2023 (S. 14, Abb. 3).`,
        quote: `"Die Ausfallhäufigkeit stieg von 4,2 auf 8,7 Ereignisse pro Quartal."`,
        tag: "statistik",
        source: {
          documentName: JOB_STORE[jobId].documentName,
          page: 14,
          pageCorrected: false,
        },
        confidence: 0.93,
      });
      FACT_STORE.push({
        id: `fact-${jobId}-2`,
        detail: `Kapitel 3 empfiehlt eine Erhöhung des Redundanz-Faktors auf mindestens 2,5.`,
        quote: `"Ein Redundanzfaktor von 2,5 minimiert das Ausfallrisiko signifikant."`,
        tag: "empfehlung",
        source: {
          documentName: JOB_STORE[jobId].documentName,
          page: 28,
          pageCorrected: false,
        },
        confidence: 0.87,
      });
    } else {
      setTimeout(tick, 1200);
    }
  };
  setTimeout(tick, 800);
}

const API = "";

export const pdfAnalysisHandlers = [
  // Upload
  http.post(`${API}/pdf-analysis/upload`, async ({ request }) => {
    await delay(600);
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return HttpResponse.json(
        { error: "Keine Datei übermittelt." },
        { status: 400 },
      );
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return HttpResponse.json(
        { error: "Nur PDF-Dateien werden akzeptiert." },
        { status: 400 },
      );
    }
    return HttpResponse.json({ pdfPath: `/tmp/uploads/${file.name}` });
  }),

  // Start analysis
  http.post(`${API}/pdf-analysis/start`, async ({ request }) => {
    await delay(400);
    const body: any = await request.json();
    const jobId = `job-${jobCounter++}`;
    JOB_STORE[jobId] = {
      id: jobId,
      documentName: body.pdfPath?.split("/").pop() ?? "Unbekanntes Dokument",
      task: body.task,
      deepScan: body.deepScan ?? false,
      status: "pending",
      progress: { phase: "init", chunksDone: 0, chunksTotal: 12 },
      error: null,
    };
    simulateJobProgress(jobId);
    return HttpResponse.json({ jobId });
  }),

  // List jobs
  http.get(`${API}/pdf-analysis/list`, async () => {
    await delay(100);
    return HttpResponse.json({ jobs: Object.values(JOB_STORE) });
  }),

  // Job status
  http.get(`${API}/pdf-analysis/:jobId`, async ({ params }) => {
    await delay(80);
    const job = JOB_STORE[params.jobId as string];
    if (!job)
      return HttpResponse.json(
        { error: "Job nicht gefunden." },
        { status: 404 },
      );
    return HttpResponse.json(job);
  }),

  // Job result
  http.get(`${API}/pdf-analysis/:jobId/result`, async ({ params }) => {
    await delay(300);
    const job = JOB_STORE[params.jobId as string];
    if (!job)
      return HttpResponse.json(
        { error: "Job nicht gefunden." },
        { status: 404 },
      );
    if (job.status !== "completed") {
      return HttpResponse.json({ error: "Analyse noch nicht abgeschlossen." });
    }
    return HttpResponse.json({
      report: `# Analyse-Bericht: ${job.documentName}\n\n## Zusammenfassung\nDas Dokument enthält 42 Seiten mit schwerpunktmäßiger Diskussion der Netzinfrastruktur. Zentrale Befunde:\n\n1. **Infrastrukturelle Risiken:** Die Ausfallrate hat sich 2022–2023 verdoppelt.\n2. **Empfehlung:** Redundanzfaktor ≥ 2,5 (Kapitel 3, S. 28).\n3. **Daten-Qualität:** Stichprobengröße ausreichend (n=1.240).\n\n## Fakten-Extraktion\n${FACT_STORE.filter((f) => f.source.documentName === job.documentName).length} Fakten extrahiert und gespeichert.\n\n## KI-Bewertung\nGlaubwürdigkeit: **Hoch** (0.91). Keine widersprüchlichen Aussagen innerhalb des Dokuments festgestellt.\n\n---\n*Generiert durch OpenSIN PDF-Analyse (DEV-Mock)*`,
      totalPages: 42,
      chunks: 12,
      factsStored: FACT_STORE.filter(
        (f) => f.source.documentName === job.documentName,
      ).length,
      chunkErrors: 0,
    });
  }),

  // Cancel job
  http.delete(`${API}/pdf-analysis/:jobId`, async ({ params }) => {
    await delay(200);
    const jobId = params.jobId as string;
    if (JOB_STORE[jobId]) {
      JOB_STORE[jobId].status = "cancelled";
    }
    return HttpResponse.json({ success: true });
  }),

  // Facts search
  http.get(`${API}/pdf-analysis/facts`, async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const doc = url.searchParams.get("document")?.toLowerCase() ?? "";
    const filtered = FACT_STORE.filter((f) => {
      const matchQ =
        !q ||
        f.detail.toLowerCase().includes(q) ||
        f.quote?.toLowerCase().includes(q);
      const matchDoc =
        !doc || f.source.documentName.toLowerCase().includes(doc);
      return matchQ && matchDoc;
    });
    return HttpResponse.json({ facts: filtered });
  }),

  // Delete fact
  http.delete(`${API}/pdf-analysis/facts/:factId`, async ({ params }) => {
    await delay(150);
    const idx = FACT_STORE.findIndex((f) => f.id === params.factId);
    if (idx !== -1) FACT_STORE.splice(idx, 1);
    return HttpResponse.json({ success: true });
  }),

  // Cross-check start
  http.post(`${API}/pdf-analysis/crosscheck`, async ({ request }) => {
    await delay(400);
    const body: any = await request.json();
    const jobId = `cc-${jobCounter++}`;
    CROSS_STORE[jobId] = { id: jobId, status: "running", body };
    setTimeout(() => {
      CROSS_STORE[jobId].status = "completed";
    }, 3000);
    return HttpResponse.json({ jobId });
  }),

  // Cross-check list
  http.get(`${API}/pdf-analysis/crosscheck/list`, async () => {
    await delay(100);
    return HttpResponse.json({ jobs: Object.values(CROSS_STORE) });
  }),

  // Cross-check result
  http.get(
    `${API}/pdf-analysis/crosscheck/:jobId/result`,
    async ({ params }) => {
      await delay(300);
      const job = CROSS_STORE[params.jobId as string];
      if (!job)
        return HttpResponse.json(
          { error: "Job nicht gefunden." },
          { status: 404 },
        );
      return HttpResponse.json({
        results: [
          {
            claim: job.body?.claims?.[0] ?? "Testbehauptung",
            verdict: "supported",
            confidence: 0.89,
            sources: [
              {
                title: "Mock-Quelle",
                url: "#",
                snippet: "Belegt durch interne Dokumente.",
              },
            ],
          },
        ],
      });
    },
  ),

  // Corpus start
  http.post(`${API}/pdf-analysis/corpus`, async ({ request }) => {
    await delay(500);
    const body: any = await request.json();
    const jobId = `corpus-${jobCounter++}`;
    CORPUS_STORE[jobId] = {
      id: jobId,
      status: "running",
      documentNames: (body.pdfPaths ?? []).map((p: string) =>
        p.split("/").pop(),
      ),
      task: body.task,
    };
    setTimeout(() => {
      CORPUS_STORE[jobId].status = "completed";
    }, 4000);
    return HttpResponse.json({ jobId });
  }),

  // Corpus list
  http.get(`${API}/pdf-analysis/corpus/list`, async () => {
    await delay(100);
    return HttpResponse.json({ jobs: Object.values(CORPUS_STORE) });
  }),

  // Corpus result
  http.get(`${API}/pdf-analysis/corpus/:jobId/result`, async ({ params }) => {
    await delay(300);
    const job = CORPUS_STORE[params.jobId as string];
    if (!job)
      return HttpResponse.json(
        { error: "Job nicht gefunden." },
        { status: 404 },
      );
    return HttpResponse.json({
      report: `# Korpus-Vergleich\n\nDokumente: ${(job.documentNames ?? []).join(", ")}\n\nAufgabe: ${job.task}\n\nErgebnis: Keine wesentlichen Widersprüche zwischen den Dokumenten festgestellt. Übereinstimmung in 87 % der Kernaussagen.\n\n---\n*DEV-Mock*`,
    });
  }),

  // Cancel corpus
  http.delete(`${API}/pdf-analysis/corpus/:jobId`, async ({ params }) => {
    await delay(150);
    if (CORPUS_STORE[params.jobId as string]) {
      CORPUS_STORE[params.jobId as string].status = "cancelled";
    }
    return HttpResponse.json({ success: true });
  }),
];
