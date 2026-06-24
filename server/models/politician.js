// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

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
    if (politicians.length === 0) return { inserted: 0, updated: 0, errors: 0 };

    const uuid = require("uuid");
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Batch upserts via $transaction for parallelism instead of sequential
    // awaits. Split into chunks of 50 to avoid SQLite "too many SQL variables"
    // errors.
    const CHUNK_SIZE = 50;
    for (let i = 0; i < politicians.length; i += CHUNK_SIZE) {
      const chunk = politicians.slice(i, i + CHUNK_SIZE);
      try {
        const results = await prisma.$transaction(
          chunk.map((p) => {
            const id = p.id || uuid.v4();
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

            if (p.externalId) {
              return prisma.politicians.upsert({
                where: { externalId: p.externalId },
                update: data,
                create: data,
              });
            }
            return prisma.politicians.create({ data });
          }),
        );

        for (const result of results) {
          if (
            result.createdAt &&
            result.updatedAt &&
            result.createdAt.getTime() === result.updatedAt.getTime()
          ) {
            inserted++;
          } else {
            updated++;
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        consoleLogger.error(`[Politician] massUpsert chunk error: ${err.message}`);
        errors += chunk.length;
      }
    }

    return { inserted, updated, errors };
  },

  get: async function (clause = {}) {
    try {
      return await prisma.politicians.findFirst({ where: clause });
    } catch (err) {
      // eslint-disable-next-line no-console
      consoleLogger.error(`[Politician] get error: ${err.message}`);
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
      consoleLogger.error(`[Politician] where error: ${err.message}`);
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

/** @type {{ bulkInsert: Function, bulkUpsert: Function, where: Function }} */
const PoliticianVote = {
  bulkInsert: async function (votes = []) {
    if (votes.length === 0) return { count: 0 };
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
    const CHUNK_SIZE = 50;
    const results = [];
    for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
      const chunk = inserts.slice(i, i + CHUNK_SIZE);
      try {
        const partial = await prisma.$transaction(chunk);
        results.push(...partial);
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.warn(
          `[PoliticianVote.bulkInsert] chunk ${i}-${i + CHUNK_SIZE} failed:`,
          e.message,
        );
      }
    }
    return { count: results.length };
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

  bulkUpsert: async function (votes = []) {
    if (votes.length === 0) return { inserted: 0, updated: 0, errors: 0 };
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const v of votes) {
      try {
        const existing = await prisma.politician_votes.findUnique({
          where: { id: v.id },
        });
        await prisma.politician_votes.upsert({
          where: { id: v.id },
          update: v,
          create: v,
        });
        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch {
        errors++;
      }
    }
    return { inserted, updated, errors };
  },
};

/** @type {{ bulkInsert: Function, markVectorized: Function, whereNotVectorized: Function, where: Function }} */
const PoliticianSpeech = {
  bulkInsert: async function (speeches = []) {
    if (speeches.length === 0) return { count: 0 };
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
    const CHUNK_SIZE = 50;
    const results = [];
    for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
      const chunk = inserts.slice(i, i + CHUNK_SIZE);
      try {
        const partial = await prisma.$transaction(chunk);
        results.push(...partial);
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.warn(
          `[PoliticianSpeech.bulkInsert] chunk ${i}-${i + CHUNK_SIZE} failed:`,
          e.message,
        );
      }
    }
    return { count: results.length };
  },

  markVectorized: async function (speechId) {
    try {
      await prisma.politician_speeches.update({
        where: { id: speechId },
        data: { vectorized: true },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      consoleLogger.error(`[PoliticianSpeech] markVectorized error: ${err.message}`);
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

        // Detect insert vs update by checking if the record already exists.
        const existing = await prisma.politician_mandates.findUnique({
          where: { id },
        });
        await prisma.politician_mandates.upsert({
          where: { id },
          update: data,
          create: data,
        });
        if (existing) {
          updated++;
        } else {
          inserted++;
        }
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

/** @type {{ bulkUpsert: Function }} */
const PoliticianCommittee = {
  bulkUpsert: async function (committees = []) {
    if (committees.length === 0) return { inserted: 0, updated: 0, errors: 0 };
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const c of committees) {
      try {
        const existing = await prisma.politician_committees.findUnique({
          where: { id: c.id },
        });
        await prisma.politician_committees.upsert({
          where: { id: c.id },
          update: c,
          create: c,
        });
        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch {
        errors++;
      }
    }
    return { inserted, updated, errors };
  },
};

/** @type {{ bulkUpsert: Function }} */
const PoliticianCommitteeMembership = {
  bulkUpsert: async function (memberships = []) {
    if (memberships.length === 0) return { inserted: 0, updated: 0, errors: 0 };
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const m of memberships) {
      try {
        const existing =
          await prisma.politician_committee_memberships.findUnique({
            where: { id: m.id },
          });
        await prisma.politician_committee_memberships.upsert({
          where: { id: m.id },
          update: m,
          create: m,
        });
        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch {
        errors++;
      }
    }
    return { inserted, updated, errors };
  },
};

module.exports = {
  Politician,
  PoliticianVote,
  PoliticianSpeech,
  PoliticianMandate,
  PoliticianCommittee,
  PoliticianCommitteeMembership,
};
