// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const PdfAnalysis = {
  upload: async function (file) {
    const formData = new FormData();
    formData.append("file", file);
    return await fetch(`${API_BASE}/pdf-analysis/upload`, {
      method: "POST",
      headers: baseHeaders(),
      body: formData,
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  start: async function ({ pdfPath, task, reportType, factCriteria }) {
    return await fetch(`${API_BASE}/pdf-analysis/start`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ pdfPath, task, reportType, factCriteria }),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  list: async function () {
    return await fetch(`${API_BASE}/pdf-analysis/list`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.jobs || [])
      .catch(() => []);
  },

  status: async function (jobId) {
    return await fetch(`${API_BASE}/pdf-analysis/${jobId}`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  result: async function (jobId) {
    return await fetch(`${API_BASE}/pdf-analysis/${jobId}/result`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  cancel: async function (jobId) {
    return await fetch(`${API_BASE}/pdf-analysis/${jobId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  searchFacts: async function ({ q = "", document = "", tag = "" } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (document) params.set("document", document);
    if (tag) params.set("tag", tag);
    return await fetch(`${API_BASE}/pdf-analysis/facts?${params}`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.facts || [])
      .catch(() => []);
  },

  deleteFact: async function (factId) {
    return await fetch(`${API_BASE}/pdf-analysis/facts/${factId}`, {
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
  }) {
    return await fetch(`${API_BASE}/pdf-analysis/crosscheck`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ claims, factIds, sources, deepWeb }),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  listCrossChecks: async function () {
    return await fetch(`${API_BASE}/pdf-analysis/crosscheck/list`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.jobs || [])
      .catch(() => []);
  },

  crossCheckResult: async function (jobId) {
    return await fetch(
      `${API_BASE}/pdf-analysis/crosscheck/${jobId}/result`,
      {
        headers: baseHeaders(),
      }
    )
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  cancelCrossCheck: async function (jobId) {
    return await fetch(`${API_BASE}/pdf-analysis/crosscheck/${jobId}`, {
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
  }) {
    return await fetch(`${API_BASE}/pdf-analysis/corpus`, {
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

  listCorpus: async function () {
    return await fetch(`${API_BASE}/pdf-analysis/corpus/list`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res.jobs || [])
      .catch(() => []);
  },

  corpusResult: async function (jobId) {
    return await fetch(`${API_BASE}/pdf-analysis/corpus/${jobId}/result`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  cancelCorpus: async function (jobId) {
    return await fetch(`${API_BASE}/pdf-analysis/corpus/${jobId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },
};

export default PdfAnalysis;
