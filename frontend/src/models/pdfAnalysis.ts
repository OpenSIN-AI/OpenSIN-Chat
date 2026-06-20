// SPDX-License-Identifier: MIT
import { baseHeaders } from "@/utils/request";

// Browser endpoints live under /pdf-analysis/* and use session auth (validatedRequest).
// The /api/pdf-analysis/* namespace is reserved for developer API keys only.
const PDF_ANALYSIS_BASE = "/pdf-analysis";

export interface PdfAnalysisStartParams {
  pdfPath: string;
  task: string;
  reportType: string;
  factCriteria: string;
  deepScan: boolean;
}

export interface PdfAnalysisResult {
  error?: string;
  [key: string]: any;
}

export interface SearchFactsParams {
  q?: string;
  document?: string;
  tag?: string;
}

export interface CrossCheckParams {
  claims?: string[];
  factIds?: string[];
  sources?: string[];
  deepWeb?: boolean;
}

export interface CorpusParams {
  pdfPaths: string[];
  task: string;
  reportType: string;
  factCriteria: string;
  deepScan: boolean;
}

const PdfAnalysis = {
  upload: async function (file: File): Promise<PdfAnalysisResult> {
    const formData = new FormData();
    formData.append("file", file);
    return await fetch(`${PDF_ANALYSIS_BASE}/upload`, {
      method: "POST",
      headers: baseHeaders(),
      body: formData,
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  start: async function ({
    pdfPath,
    task,
    reportType,
    factCriteria,
    deepScan,
  }: PdfAnalysisStartParams): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/start`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfPath,
        task,
        reportType,
        factCriteria,
        deepScan,
      }),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  list: async function (): Promise<any[]> {
    return await fetch(`${PDF_ANALYSIS_BASE}/list`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.jobs || [])
      .catch(() => []);
  },

  status: async function (jobId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/${jobId}`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  result: async function (jobId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/${jobId}/result`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  cancel: async function (jobId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/${jobId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  searchFacts: async function ({
    q = "",
    document = "",
    tag = "",
  }: SearchFactsParams = {}): Promise<any[]> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (document) params.set("document", document);
    if (tag) params.set("tag", tag);
    return await fetch(`${PDF_ANALYSIS_BASE}/facts?${params}`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.facts || [])
      .catch(() => []);
  },

  deleteFact: async function (factId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/facts/${factId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  startCrossCheck: async function ({
    claims = [],
    factIds = [],
    sources = [],
    deepWeb = false,
  }: CrossCheckParams): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/crosscheck`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ claims, factIds, sources, deepWeb }),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  listCrossChecks: async function (): Promise<any[]> {
    return await fetch(`${PDF_ANALYSIS_BASE}/crosscheck/list`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.jobs || [])
      .catch(() => []);
  },

  crossCheckResult: async function (jobId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/crosscheck/${jobId}/result`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  cancelCrossCheck: async function (jobId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/crosscheck/${jobId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  startCorpus: async function ({
    pdfPaths,
    task,
    reportType,
    factCriteria,
    deepScan,
  }: CorpusParams): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/corpus`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfPaths,
        task,
        reportType,
        factCriteria,
        deepScan,
      }),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  listCorpus: async function (): Promise<any[]> {
    return await fetch(`${PDF_ANALYSIS_BASE}/corpus/list`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.jobs || [])
      .catch(() => []);
  },

  corpusResult: async function (jobId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/corpus/${jobId}/result`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  cancelCorpus: async function (jobId: string): Promise<PdfAnalysisResult> {
    return await fetch(`${PDF_ANALYSIS_BASE}/corpus/${jobId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },
};

export default PdfAnalysis;
