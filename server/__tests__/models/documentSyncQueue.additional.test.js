// SPDX-License-Identifier: MIT
const { DocumentSyncQueue } = require("../../models/documentSyncQueue");
const { SystemSettings } = require("../../models/systemSettings");
const prisma = require("../../utils/prisma");

describe("DocumentSyncQueue (additional)", () => {
  afterEach(() => jest.restoreAllMocks());

  describe("validFileTypes", () => {
    it("contains expected file types", () => {
      expect(DocumentSyncQueue.validFileTypes).toEqual(
        expect.arrayContaining(["link", "youtube", "confluence", "github", "gitlab", "drupalwiki"])
      );
    });
  });

  describe("maxRepeatFailures", () => {
    it("defaults to 5", () => {
      expect(DocumentSyncQueue.maxRepeatFailures).toBe(5);
    });
  });

  describe("enabled", () => {
    it("returns true when system setting is enabled", async () => {
      const spy = jest.spyOn(SystemSettings, "get").mockResolvedValue({ value: "enabled" });
      expect(await DocumentSyncQueue.enabled()).toBe(true);
      expect(spy).toHaveBeenCalledWith({ label: DocumentSyncQueue.featureKey });
    });

    it("returns false when system setting is disabled", async () => {
      jest.spyOn(SystemSettings, "get").mockResolvedValue({ value: "disabled" });
      expect(await DocumentSyncQueue.enabled()).toBe(false);
    });

    it("returns false when system setting is missing", async () => {
      jest.spyOn(SystemSettings, "get").mockResolvedValue(null);
      expect(await DocumentSyncQueue.enabled()).toBe(false);
    });
  });

  describe("calcNextSync", () => {
    it("returns a future date based on staleAfterMs", () => {
      const before = Date.now();
      const result = DocumentSyncQueue.calcNextSync({ staleAfterMs: 86400000 });
      const after = Date.now();
      expect(result.getTime()).toBeGreaterThanOrEqual(new Date(before + 86400000).getTime());
      expect(result.getTime()).toBeLessThanOrEqual(new Date(after + 86400000).getTime());
    });

    it("adds staleAfterMs milliseconds to current time", () => {
      const staleMs = 3600000;
      const before = Date.now();
      const result = DocumentSyncQueue.calcNextSync({ staleAfterMs: staleMs });
      expect(result.getTime() - before).toBeGreaterThanOrEqual(staleMs);
      expect(result.getTime() - before).toBeLessThan(staleMs + 100);
    });
  });

  describe("canWatch", () => {
    it("returns false when chunkSource is null", () => {
      expect(DocumentSyncQueue.canWatch({ title: "test", chunkSource: null })).toBe(false);
    });

    it("returns false when chunkSource is undefined", () => {
      expect(DocumentSyncQueue.canWatch({ title: "test" })).toBe(false);
    });

    it("returns false for unknown chunkSource prefix", () => {
      expect(DocumentSyncQueue.canWatch({ title: "test", chunkSource: "unknown://file" })).toBe(false);
    });

    it("returns true for link:// with .html title", () => {
      expect(DocumentSyncQueue.canWatch({ title: "page.html", chunkSource: "link://http://example.com" })).toBe(true);
    });

    it("returns false for link:// with non-html title", () => {
      expect(DocumentSyncQueue.canWatch({ title: "page.pdf", chunkSource: "link://http://example.com" })).toBe(false);
    });

    it("returns true for youtube:// prefix", () => {
      expect(DocumentSyncQueue.canWatch({ title: "video", chunkSource: "youtube://abc123" })).toBe(true);
    });

    it("returns true for confluence:// prefix", () => {
      expect(DocumentSyncQueue.canWatch({ title: "doc", chunkSource: "confluence://space/page" })).toBe(true);
    });

    it("returns true for github:// prefix", () => {
      expect(DocumentSyncQueue.canWatch({ title: "readme", chunkSource: "github://org/repo/file" })).toBe(true);
    });

    it("returns true for gitlab:// prefix", () => {
      expect(DocumentSyncQueue.canWatch({ title: "file", chunkSource: "gitlab://org/repo/file" })).toBe(true);
    });

    it("returns true for drupalwiki:// prefix", () => {
      expect(DocumentSyncQueue.canWatch({ title: "wiki", chunkSource: "drupalwiki://node/1" })).toBe(true);
    });
  });

  describe("get", () => {
    it("returns queue record when found", async () => {
      const queue = { id: 1, workspaceDocId: 10 };
      jest.spyOn(prisma.document_sync_queues, "findFirst").mockResolvedValue(queue);
      expect(await DocumentSyncQueue.get({ id: 1 })).toEqual(queue);
    });

    it("returns null when not found", async () => {
      jest.spyOn(prisma.document_sync_queues, "findFirst").mockResolvedValue(null);
      expect(await DocumentSyncQueue.get({ id: 999 })).toBeNull();
    });

    it("returns null and logs on error", async () => {
      jest.spyOn(prisma.document_sync_queues, "findFirst").mockRejectedValue(new Error("db fail"));
      expect(await DocumentSyncQueue.get({ id: 1 })).toBeNull();
    });
  });

  describe("where", () => {
    it("returns matching records", async () => {
      const records = [{ id: 1 }, { id: 2 }];
      jest.spyOn(prisma.document_sync_queues, "findMany").mockResolvedValue(records);
      expect(await DocumentSyncQueue.where({ workspaceDocId: 10 })).toEqual(records);
    });

    it("passes limit and orderBy to prisma", async () => {
      const spy = jest.spyOn(prisma.document_sync_queues, "findMany").mockResolvedValue([]);
      await DocumentSyncQueue.where({}, 5, { id: "desc" });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ take: 5, orderBy: { id: "desc" } }));
    });

    it("passes include to prisma", async () => {
      const spy = jest.spyOn(prisma.document_sync_queues, "findMany").mockResolvedValue([]);
      const include = { workspaceDoc: true };
      await DocumentSyncQueue.where({}, null, null, include);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ include }));
    });

    it("returns empty array on error", async () => {
      jest.spyOn(prisma.document_sync_queues, "findMany").mockRejectedValue(new Error("fail"));
      expect(await DocumentSyncQueue.where({})).toEqual([]);
    });
  });

  describe("count", () => {
    it("returns count from prisma", async () => {
      jest.spyOn(prisma.document_sync_queues, "count").mockResolvedValue(3);
      expect(await DocumentSyncQueue.count({ workspaceDocId: 10 })).toBe(3);
    });

    it("passes limit when provided", async () => {
      const spy = jest.spyOn(prisma.document_sync_queues, "count").mockResolvedValue(5);
      await DocumentSyncQueue.count({}, 5);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });

    it("returns 0 on error", async () => {
      jest.spyOn(prisma.document_sync_queues, "count").mockRejectedValue(new Error("fail"));
      expect(await DocumentSyncQueue.count({})).toBe(0);
    });
  });

  describe("delete", () => {
    it("returns true on success", async () => {
      jest.spyOn(prisma.document_sync_queues, "deleteMany").mockResolvedValue({ count: 1 });
      expect(await DocumentSyncQueue.delete({ id: 1 })).toBe(true);
    });

    it("returns false on error", async () => {
      jest.spyOn(prisma.document_sync_queues, "deleteMany").mockRejectedValue(new Error("fail"));
      expect(await DocumentSyncQueue.delete({ id: 1 })).toBe(false);
    });
  });

  describe("_update", () => {
    it("throws when id is null", async () => {
      await expect(DocumentSyncQueue._update(null, {})).rejects.toThrow();
    });

    it("returns true on success", async () => {
      jest.spyOn(prisma.document_sync_queues, "update").mockResolvedValue({ id: 1 });
      expect(await DocumentSyncQueue._update(1, { staleAfterMs: 1000 })).toBe(true);
    });

    it("returns false on error", async () => {
      jest.spyOn(prisma.document_sync_queues, "update").mockRejectedValue(new Error("fail"));
      expect(await DocumentSyncQueue._update(1, { staleAfterMs: 1000 })).toBe(false);
    });
  });

  describe("staleDocumentQueues", () => {
    it("calls findMany with nextSyncAt lte now", async () => {
      const queues = [{ id: 1, workspaceDoc: { workspace: { id: 1 } } }];
      const spy = jest.spyOn(prisma.document_sync_queues, "findMany").mockResolvedValue(queues);
      const result = await DocumentSyncQueue.staleDocumentQueues();
      expect(result).toEqual(queues);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nextSyncAt: { lte: expect.any(String) } },
          include: { workspaceDoc: { include: { workspace: true } } },
        })
      );
    });
  });
});
