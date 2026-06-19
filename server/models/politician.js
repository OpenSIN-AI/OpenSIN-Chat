// SPDX-License-Identifier: MIT
/**
 * Politician Database model — thin data-access wrapper around Prisma queries
 * for politician-related tables.
 *
 * Docs: politician.doc.md
 * Purpose: Provides CRUD helpers for politicians, mandates, votes, speeches,
 * and committee tables. Follows existing OpenSIN model patterns (e.g. vectors.js).
 */

const prisma = require("../utils/prisma");

/** @type {{ massInsert: Function, get: Function, where: Function, count: Function }} */
const Politician = {
  /**
   * Bulk upsert politicians — inserts new or updates existing by externalId + source.
   * @param {Array<{
   *   id: string,
   *   externalId?: string,
   *   source?: string,
   *   title?: string,
   *   firstName: string,
   *   lastName: string,
   *   fullName: string,
   *   party?: string,
   *   faction?: string,
   *   gender?: string,
   *   birthDate?: string|Date,
   *   birthPlace?: string,
   *   profession?: string,
   *   education?: string,
   *   photoUrl?: string,
   *   profileUrl?: string,
   *   email?: string,
   *   electoralDistrict?: string,
   *   electoralList?: string,
   *   state?: string,
   *   bio?: string,
   *   websiteUrl?: string,
   *   twitterHandle?: string,
   *   facebookUrl?: string,
   *   linkedinUrl?: string,
   *   instagramUrl?: string,
   *   youtubeUrl?: string,
   *   tiktokUrl?: string,
   *   rawData?: string,
   * }>} politicians
   * @returns {Promise<{inserted: number, updated: number, errors: number}>}
   */
  massUpsert: async function (politicians = []) {
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const p of politicians) {
      try {
        const id = p.id || require("uuid").v4();
        const data = {
          id,
          externalId: p.externalId || null,
          source: p.source || "bundestag",
          title: p.title || null,
          firstName: p.firstName,
          lastName: p.lastName,
          fullName: p.fullName,
          party: p.party || null,
          faction: p.faction || null,
          gender: p.gender || null,
          birthDate: p.birthDate ? new Date(p.birthDate) : null,
          birthPlace: p.birthPlace || null,
          profession: p.profession || null,
          education: p.education || null,
          photoUrl: p.photoUrl || null,
          profileUrl: p.profileUrl || null,
          email: p.email || null,
          electoralDistrict: p.electoralDistrict || null,
          electoralList: p.electoralList || null,
          state: p.state || null,
          bio: p.bio || null,
          websiteUrl: p.websiteUrl || null,
          twitterHandle: p.twitterHandle || null,
          facebookUrl: p.facebookUrl || null,
          linkedinUrl: p.linkedinUrl || null,
          instagramUrl: p.instagramUrl || null,
          youtubeUrl: p.youtubeUrl || null,
          tiktokUrl: p.tiktokUrl || null,
          rawData: p.rawData || null,
          lastSyncedAt: new Date(),
        };

        // Use atomic upsert when externalId is present (it is @unique in the
        // schema). This eliminates the check-then-act race where two concurrent
        // syncs both findFirst → both create → unique-constraint violation.
        // When externalId is null there is no unique key to dedup on, so we
        // just create.
        if (p.externalId) {
          const result = await prisma.politicians.upsert({
            where: { externalId: p.externalId },
            update: data,
            create: data,
          });
          // Prisma upsert doesn't tell us if it was insert or update, so we
          // approximate: check if createdAt equals updatedAt (new record).
          if (
            result.createdAt &&
            result.updatedAt &&
            result.createdAt.getTime() === result.updatedAt.getTime()
          ) {
            inserted++;
          } else {
            updated++;
          }
        } else {
          await prisma.politicians.create({ data });
          inserted++;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `[Politician] massUpsert error for ${p.fullName}: ${err.message}`,
        );
        errors++;
      }
    }

    return { inserted, updated, errors };
  },

  get: async function (clause = {}) {
    try {
      return await prisma.politicians.findFirst({ where: clause });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[Politician] get error: ${err.message}`);
      return null;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      return await prisma.politicians.findMany({
        where: clause,
        take: limit || undefined,
        orderBy: { lastName: "asc" },
        include: {
          mandates: { orderBy: { startDate: "desc" } },
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[Politician] where error: ${err.message}`);
      return [];
    }
  },

  count: async function (clause = {}) {
    try {
      return await prisma.politicians.count({ where: clause });
    } catch {
      return 0;
    }
  },
};

/** @type {{ bulkInsert: Function, where: Function }} */
const PoliticianVote = {
  bulkInsert: async function (votes = []) {
    if (votes.length === 0) return 0;
    try {
      const inserts = votes.map((v) =>
        prisma.politician_votes.create({
          data: {
            id: v.id || require("uuid").v4(),
            politicianId: v.politicianId,
            session: v.session || null,
            sitting: v.sitting || null,
            voteId: v.voteId || null,
            voteTitle: v.voteTitle || null,
            voteDescription: v.voteDescription || null,
            voteResult: v.voteResult || null,
            voteDate: v.voteDate ? new Date(v.voteDate) : null,
            documentUrl: v.documentUrl || null,
            plenaryProtocolUrl: v.plenaryProtocolUrl || null,
            rawData: v.rawData || null,
          },
        }),
      );
      await prisma.$transaction(inserts);
      return inserts.length;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[PoliticianVote] bulkInsert error: ${err.message}`);
      return 0;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      return await prisma.politician_votes.findMany({
        where: clause,
        take: limit || undefined,
        orderBy: { voteDate: "desc" },
      });
    } catch {
      return [];
    }
  },
};

/** @type {{ bulkInsert: Function, markVectorized: Function, whereNotVectorized: Function, where: Function }} */
const PoliticianSpeech = {
  bulkInsert: async function (speeches = []) {
    if (speeches.length === 0) return 0;
    try {
      const inserts = speeches.map((s) =>
        prisma.politician_speeches.create({
          data: {
            id: s.id || require("uuid").v4(),
            politicianId: s.politicianId,
            session: s.session || null,
            sitting: s.sitting || null,
            speechTitle: s.speechTitle || null,
            speechText: s.speechText,
            speechDate: s.speechDate ? new Date(s.speechDate) : null,
            documentUrl: s.documentUrl || null,
            pageNumbers: s.pageNumbers || null,
            rawData: s.rawData || null,
            vectorized: false,
          },
        }),
      );
      await prisma.$transaction(inserts);
      return inserts.length;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[PoliticianSpeech] bulkInsert error: ${err.message}`);
      return 0;
    }
  },

  markVectorized: async function (speechId) {
    try {
      await prisma.politician_speeches.update({
        where: { id: speechId },
        data: { vectorized: true },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[PoliticianSpeech] markVectorized error: ${err.message}`);
    }
  },

  whereNotVectorized: async function (limit = 50) {
    try {
      return await prisma.politician_speeches.findMany({
        where: { vectorized: false },
        include: { politician: { select: { fullName: true, party: true } } },
        take: limit,
      });
    } catch {
      return [];
    }
  },

  where: async function (clause = {}, limit) {
    try {
      return await prisma.politician_speeches.findMany({
        where: clause,
        take: limit || undefined,
        orderBy: { speechDate: "desc" },
      });
    } catch {
      return [];
    }
  },
};

/** @type {{ bulkUpsert: Function, where: Function }} */
const PoliticianMandate = {
  bulkUpsert: async function (mandates = []) {
    if (mandates.length === 0) return { inserted: 0, updated: 0, errors: 0 };
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const m of mandates) {
      try {
        const id = m.id || require("uuid").v4();
        const data = {
          id,
          politicianId: m.politicianId,
          type: m.type || "bundestag",
          position: m.position || null,
          party: m.party || null,
          faction: m.faction || null,
          electoralDistrict: m.electoralDistrict || null,
          state: m.state || null,
          startDate: m.startDate ? new Date(m.startDate) : null,
          endDate: m.endDate ? new Date(m.endDate) : null,
          info: m.info || null,
          rawData: m.rawData || null,
        };

        await prisma.politician_mandates.upsert({
          where: { id },
          update: data,
          create: data,
        });
        updated++;
      } catch {
        errors++;
      }
    }
    return { inserted, updated, errors };
  },

  where: async function (clause = {}, limit) {
    try {
      return await prisma.politician_mandates.findMany({
        where: clause,
        take: limit || undefined,
        orderBy: { startDate: "desc" },
      });
    } catch {
      return [];
    }
  },
};

module.exports = {
  Politician,
  PoliticianVote,
  PoliticianSpeech,
  PoliticianMandate,
};
