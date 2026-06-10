// SPDX-License-Identifier: MIT
const path = require("path");
const fs = require("fs");
const os = require("os");
const { enforceReportRetention } = require("../../../utils/reports/retention");

describe("enforceReportRetention", () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "reports-retention-"));
    delete process.env.REPORTS_MAX_FILES;
    delete process.env.REPORTS_MAX_AGE_DAYS;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.REPORTS_MAX_FILES;
    delete process.env.REPORTS_MAX_AGE_DAYS;
  });

  function writePdf(name, ageMs = 0) {
    const full = path.join(dir, name);
    fs.writeFileSync(full, "pdf");
    const t = new Date(Date.now() - ageMs);
    fs.utimesSync(full, t, t);
    return full;
  }

  it("deletes files older than REPORTS_MAX_AGE_DAYS", () => {
    process.env.REPORTS_MAX_AGE_DAYS = "1";
    const old = writePdf("old.pdf", 2 * 24 * 60 * 60 * 1000);
    const fresh = writePdf("fresh.pdf", 0);

    const { deleted } = enforceReportRetention(dir);

    expect(deleted).toBe(1);
    expect(fs.existsSync(old)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);
  });

  it("keeps at most REPORTS_MAX_FILES - 1 (leaving room for the next write)", () => {
    process.env.REPORTS_MAX_FILES = "3";
    writePdf("a.pdf", 4000);
    writePdf("b.pdf", 3000);
    writePdf("c.pdf", 2000);
    const newest = writePdf("d.pdf", 1000);

    enforceReportRetention(dir);

    const remaining = fs.readdirSync(dir).filter((f) => f.endsWith(".pdf"));
    expect(remaining.length).toBe(2);
    expect(fs.existsSync(newest)).toBe(true);
  });

  it("deletes oldest files first", () => {
    process.env.REPORTS_MAX_FILES = "2";
    const oldest = writePdf("oldest.pdf", 5000);
    const newest = writePdf("newest.pdf", 0);

    enforceReportRetention(dir);

    expect(fs.existsSync(oldest)).toBe(false);
    expect(fs.existsSync(newest)).toBe(true);
  });

  it("ignores non-pdf files", () => {
    process.env.REPORTS_MAX_FILES = "1";
    fs.writeFileSync(path.join(dir, "notes.txt"), "keep me");
    writePdf("a.pdf", 1000);

    enforceReportRetention(dir);

    expect(fs.existsSync(path.join(dir, "notes.txt"))).toBe(true);
  });

  it("never throws on a missing directory", () => {
    expect(() =>
      enforceReportRetention(path.join(dir, "does-not-exist"))
    ).not.toThrow();
    expect(() => enforceReportRetention(null)).not.toThrow();
  });
});
