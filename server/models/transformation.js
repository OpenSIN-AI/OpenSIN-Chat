// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const prisma = require("../utils/prisma");

/**
 * Default transformations that ship with the system and are seeded into the
 * database on first use. They provide a useful starting set without requiring
 * manual configuration.
 */
const DEFAULT_TRANSFORMATIONS = [
  {
    name: "executive-summary",
    title: "Kurzfassung",
    description: "Erstellt eine prägnante Zusammenfassung für Entscheidungsträger.",
    prompt:
      "Erstelle eine strukturierte Kurzfassung des folgenden Dokuments für Entscheidungsträger. Umfang: maximal 250 Wörter. Gliedere in: Kernthema, wichtigste Erkenntnisse (Aufzählung), empfohlene Maßnahmen.",
    applyDefault: false,
  },
  {
    name: "key-arguments",
    title: "Kernargumente",
    description: "Extrahiert die zentralen Argumente und Gegenargumente.",
    prompt:
      "Analysiere das folgende Dokument und extrahiere: 1) Die 3-5 stärksten Argumente, 2) Gegenargumente oder Schwachpunkte, 3) Die Gesamtposition des Dokuments.",
    applyDefault: false,
  },
  {
    name: "fact-check",
    title: "Faktencheck",
    description: "Listet überprüfbare Fakten und Behauptungen auf.",
    prompt:
      "Liste alle überprüfbaren Fakten, Statistiken und konkreten Behauptungen aus dem folgenden Dokument auf. Unterscheide klar zwischen belegten Fakten und Meinungen/Einschätzungen.",
    applyDefault: false,
  },
];

const Transformation = {
  /**
   * Seeds default transformations into the database if they don't already exist.
   */
  seedDefaults: async function () {
    for (const tpl of DEFAULT_TRANSFORMATIONS) {
      const existing = await prisma.transformations.findFirst({
        where: { name: tpl.name },
      });
      if (!existing) {
        await prisma.transformations.create({ data: tpl }).catch((e) =>
          consoleLogger.error(`[Transformation] Failed to seed "${tpl.name}":`, e.message),
        );
      }
    }
  },

  all: async function () {
    return await prisma.transformations.findMany({
      orderBy: { id: "asc" },
    });
  },

  get: async function (clause = {}) {
    try {
      return await prisma.transformations.findFirst({ where: clause });
    } catch (e) {
      consoleLogger.error(e.message);
      return null;
    }
  },

  create: async function (data = {}) {
    const { name, title, description = null, prompt, applyDefault = false } = data;
    if (!name || !title || !prompt)
      throw new Error("name, title, and prompt are required");

    return await prisma.transformations.create({
      data: { name, title, description, prompt, applyDefault },
    });
  },

  update: async function (id, data = {}) {
    const allowed = ["name", "title", "description", "prompt", "applyDefault"];
    const filtered = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) filtered[key] = data[key];
    }
    return await prisma.transformations.update({
      where: { id: Number(id) },
      data: { ...filtered, lastUpdatedAt: new Date() },
    });
  },

  delete: async function (id) {
    await prisma.transformations.delete({ where: { id: Number(id) } });
    return true;
  },
};

module.exports = { Transformation };
