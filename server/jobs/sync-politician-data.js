// SPDX-License-Identifier: MIT
/**
 * Bree job: sync-politician-data
 *
 * Periodically fetches politician data from Bundestag API and
 * Abgeordnetenwatch, upserts into SQLite, and queues unvectorized
 * speeches for embedding.
 *
 * Docs: sync-politician-data.doc.md
 * Purpose: Background sync job that keeps politician database current.
 * Runs every 6 hours via Bree scheduler.
 */

const { PrismaClient } = require("@prisma/client");
const { BundestagApi } = require("../utils/politician/bundestagApi");
const { AbgeordnetenwatchApi } = require("../utils/politician/abgeordnetenwatchApi");
const { PlenarScraper } = require("../utils/politician/plenarScraper");

const prisma = new PrismaClient();
const bundestag = new BundestagApi();
const abgeordnetenwatch = new AbgeordnetenwatchApi();
const plenar = new PlenarScraper();

async function main() {
  const logId = await prisma.politician_sync_log.create({
    data: { source: "bundestag", status: "started" },
  });

  try {
    // ── Step 1: Sync Bundestag members ──────────────────────────────────────
    await prisma.politician_sync_log.update({
      where: { id: logId.id },
      data: { status: "running", source: "bundestag" },
    });

    const members = await bundestag.fetchAllMembers();
    let processed = 0;
    let failed = 0;

    for (const member of members) {
      try {
        if (!member.firstName && !member.lastName) continue;

        await prisma.politicians.upsert({
          where: { externalId: member.externalId || `bundestag-${member.id}` },
          update: {
            title: member.title,
            firstName: member.firstName,
            lastName: member.lastName,
            fullName: member.fullName,
            party: member.party,
            faction: member.faction,
            gender: member.gender,
            birthDate: member.birthDate ? new Date(member.birthDate) : null,
            birthPlace: member.birthPlace,
            profession: member.profession,
            education: member.education,
            photoUrl: member.photoUrl,
            profileUrl: member.profileUrl,
            email: member.email,
            electoralDistrict: member.electoralDistrict,
            electoralList: member.electoralList,
            state: member.state,
            bio: member.bio,
            websiteUrl: member.websiteUrl,
            rawData: member.rawData,
            lastSyncedAt: new Date(),
          },
          create: {
            id: member.externalId || `bundestag-${member.id}`,
            externalId: member.externalId || `bundestag-${member.id}`,
            source: "bundestag",
            title: member.title,
            firstName: member.firstName,
            lastName: member.lastName,
            fullName: member.fullName,
            party: member.party,
            faction: member.faction,
            gender: member.gender,
            birthDate: member.birthDate ? new Date(member.birthDate) : null,
            birthPlace: member.birthPlace,
            profession: member.profession,
            education: member.education,
            photoUrl: member.photoUrl,
            profileUrl: member.profileUrl,
            email: member.email,
            electoralDistrict: member.electoralDistrict,
            electoralList: member.electoralList,
            state: member.state,
            bio: member.bio,
            websiteUrl: member.websiteUrl,
            rawData: member.rawData,
          },
        });
        processed++;
      } catch (err) {
        failed++;
      }
    }

    // ── Step 2: Sync Abgeordnetenwatch data ──────────────────────────────────
    const awLogId = await prisma.politician_sync_log.create({
      data: { source: "abgeordnetenwatch", status: "started" },
    });

    try {
      await prisma.politician_sync_log.update({
        where: { id: awLogId.id },
        data: { status: "running" },
      });

      const awPoliticians = await abgeordnetenwatch.fetchAllPoliticians();
      let awProcessed = 0;
      let awFailed = 0;

      for (const pol of awPoliticians) {
        try {
          const awExtId = `aw-${pol.id}`;
          const existing = await prisma.politicians.findUnique({
            where: { externalId: awExtId },
          });

          if (!existing) {
            await prisma.politicians.create({
              data: {
                id: awExtId,
                externalId: awExtId,
                source: "abgeordnetenwatch",
                firstName: pol.firstName || "",
                lastName: pol.lastName || "",
                fullName: `${pol.firstName || ""} ${pol.lastName || ""}`.trim(),
                party: pol.party?.label || pol.party?.name || null,
                gender: pol.sex || null,
                birthDate: pol.birthDate ? new Date(pol.birthDate) : null,
                rawData: JSON.stringify(pol),
              },
            });
          }
          awProcessed++;
        } catch (err) {
          awFailed++;
        }
      }

      await prisma.politician_sync_log.update({
        where: { id: awLogId.id },
        data: {
          status: "completed",
          itemsTotal: awPoliticians.length,
          itemsProcessed: awProcessed,
          itemsFailed: awFailed,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      await prisma.politician_sync_log.update({
        where: { id: awLogId.id },
        data: { status: "failed", error: err.message, completedAt: new Date() },
      });
    }

    await prisma.politician_sync_log.update({
      where: { id: logId.id },
      data: {
        status: "completed",
        itemsTotal: members.length,
        itemsProcessed: processed,
        itemsFailed: failed,
        completedAt: new Date(),
      },
    });

    process.send({
      silent: true,
      politicianSync: {
        bundestag: { total: members.length, processed, failed },
        status: "completed",
      },
    });
  } catch (err) {
    await prisma.politician_sync_log.update({
      where: { id: logId.id },
      data: { status: "failed", error: err.message, completedAt: new Date() },
    });

    process.send({
      silent: true,
      politicianSync: { status: "failed", error: err.message },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main();
