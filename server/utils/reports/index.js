/**
 * PDF Report Generator — produces branded AfD reports from research results.
 *
 * Docs: index.doc.md
 * Purpose: Converts research pipeline output into professional AfD-branded PDF
 * reports with cover page, table of contents, and structured sections.
 */

const { markdownToPdf } = require("@mintplex-labs/mdpdf");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const STORAGE_DIR =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/generated-reports")
    : path.resolve(process.env.STORAGE_DIR, "generated-reports");

const AFD_BLUE = rgb(0 / 255, 158 / 255, 224 / 255);
const AFD_DARK = rgb(0 / 255, 102 / 255, 165 / 255);
const GRAY = rgb(0.4, 0.4, 0.4);
const WHITE = rgb(1, 1, 1);

class ReportGenerator {
  /**
   * Generate a branded PDF report from research results.
   * @param {Object} params
   * @param {string} params.title - report title
   * @param {string} params.query - original research query
   * @param {string} params.summary - LLM-generated summary (markdown)
   * @param {Array} params.searchResults - web search results
   * @param {Array} params.politicianResults - politician DB results
   * @param {Array} params.extractedContent - extracted URL content
   * @param {string} [params.template="standard"] - template: "standard" | "brief" | "full"
   * @returns {Promise<{filePath: string, fileName: string, fileSizeKB: string}>}
   */
  static async generate({
    title,
    query,
    summary,
    searchResults = [],
    politicianResults = [],
    extractedContent = [],
    template = "standard",
  }) {
    if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

    const markdown = ReportGenerator.#buildMarkdown({
      title,
      query,
      summary,
      searchResults,
      politicianResults,
      extractedContent,
      template,
    });

    const rawBuffer = await markdownToPdf(markdown);
    const pdfDoc = await PDFDocument.load(rawBuffer);
    await ReportGenerator.#applyAfDBranding(pdfDoc);
    await ReportGenerator.#addCoverPage(pdfDoc, { title, query, template });

    const buffer = await pdfDoc.save();
    const reportId = uuidv4().substring(0, 8);
    const safeTitle = (title || query || "report").replace(/[^a-zA-Z0-9äöüßÄÖÜ]/g, "_").substring(0, 50);
    const fileName = `${safeTitle}_${reportId}.pdf`;
    const filePath = path.join(STORAGE_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    return {
      filePath,
      fileName,
      fileSizeKB: (buffer.length / 1024).toFixed(1),
    };
  }

  /**
   * Build the Markdown content for the report body.
   */
  static #buildMarkdown({ title, query, summary, searchResults, politicianResults, extractedContent, template }) {
    const now = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
    const parts = [];

    if (template === "brief") {
      parts.push(`## Kurzgutachten: ${title || query}`);
      parts.push(`*Erstellt am ${now} durch OpenAfD-Chat Recherche-Assistent*\n`);
      parts.push(summary || "Keine Zusammenfassung verfügbar.");
      if (searchResults.length) {
        parts.push("\n### Quellen");
        searchResults.slice(0, 5).forEach((r, i) => {
          parts.push(`${i + 1}. [${r.title}](${r.link})`);
        });
      }
      return parts.join("\n\n");
    }

    if (template === "full") {
      parts.push(`# Vollgutachten: ${title || query}`);
    } else {
      parts.push(`# ${title || query}`);
    }

    parts.push(`*Recherche-Assistent | ${now}*\n`);
    parts.push("---\n");

    if (summary) {
      parts.push("## Zusammenfassung\n");
      parts.push(summary);
    }

    if (politicianResults.length) {
      parts.push("\n## Betroffene Abgeordnete\n");
      politicianResults.forEach((p) => {
        parts.push(`| **${p.fullName}** | ${p.party || "—"} | ${p.faction || "—"} | ${p.state || "—"} |`);
      });
      parts.push("| Name | Partei | Fraktion | Bundesland |");
      parts.push("|------|--------|----------|------------|");
      const rows = politicianResults.map((p) =>
        `| ${p.fullName} | ${p.party || "—"} | ${p.faction || "—"} | ${p.state || "—"} |`
      ).join("\n");
      parts.push(rows);
    }

    if (extractedContent.length) {
      parts.push("\n## Auszüge aus Quellen\n");
      extractedContent.slice(0, template === "full" ? 10 : 3).forEach((c, i) => {
        parts.push(`### ${i + 1}. ${c.title || c.url}\n`);
        parts.push(c.content?.substring(0, 1500) || "");
        parts.push(`*[Quelle: ${c.url}]*\n`);
      });
    }

    if (searchResults.length) {
      parts.push("\n## Alle Quellen\n");
      searchResults.forEach((r, i) => {
        parts.push(`${i + 1}. **${r.title}** — ${r.snippet || ""} [Link](${r.link})`);
      });
    }

    parts.push("\n---\n");
    parts.push("*Generiert durch OpenAfD-Chat — Souveräner KI-Arbeitsraum für patriotische Politik*");

    return parts.join("\n\n");
  }

  /**
   * Apply AfD branding (logo watermark + footer) to all pages.
   */
  static async #applyAfDBranding(pdfDoc) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();

      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: 3,
        color: AFD_BLUE,
        opacity: 0.8,
      });

      page.drawRectangle({
        x: 0,
        y: height - 3,
        width,
        height: 3,
        color: AFD_BLUE,
        opacity: 0.8,
      });

      const footerText = "OpenAfD-Chat | Souveräner KI-Arbeitsraum für patriotische Politik";
      const fontSize = 7;
      const textWidth = font.widthOfTextAtSize(footerText, fontSize);
      page.drawText(footerText, {
        x: (width - textWidth) / 2,
        y: 8,
        size: fontSize,
        font,
        color: GRAY,
        opacity: 0.5,
      });
    }
  }

  /**
   * Add a cover page as the first page of the PDF.
   */
  static async #addCoverPage(pdfDoc, { title, query, template }) {
    const coverPage = pdfDoc.insertPage(0, [595.28, 841.89]);
    const { width, height } = coverPage.getSize();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    coverPage.drawRectangle({
      x: 0,
      y: height * 0.65,
      width,
      height: height * 0.35,
      color: AFD_DARK,
      opacity: 1,
    });

    coverPage.drawRectangle({
      x: 0,
      y: height * 0.65 - 4,
      width,
      height: 4,
      color: AFD_BLUE,
      opacity: 1,
    });

    const displayTitle = title || query || "Recherche-Bericht";
    const titleSize = 28;
    const maxTitleWidth = width - 80;
    let truncatedTitle = displayTitle;
    while (boldFont.widthOfTextAtSize(truncatedTitle, titleSize) > maxTitleWidth && truncatedTitle.length > 10) {
      truncatedTitle = truncatedTitle.substring(0, truncatedTitle.length - 4) + "...";
    }

    const titleWidth = boldFont.widthOfTextAtSize(truncatedTitle, titleSize);
    coverPage.drawText(truncatedTitle, {
      x: (width - titleWidth) / 2,
      y: height * 0.82,
      size: titleSize,
      font: boldFont,
      color: WHITE,
    });

    const subtitle = template === "full" ? "Vollgutachten" : template === "brief" ? "Kurzgutachten" : "Recherche-Bericht";
    const subtitleWidth = font.widthOfTextAtSize(subtitle, 14);
    coverPage.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height * 0.72,
      size: 14,
      font,
      color: WHITE,
      opacity: 0.8,
    });

    const dateStr = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
    const dateWidth = font.widthOfTextAtSize(dateStr, 11);
    coverPage.drawText(dateStr, {
      x: (width - dateWidth) / 2,
      y: height * 0.55,
      size: 11,
      font,
      color: GRAY,
    });

    const brandLine = "OpenAfD-Chat";
    const brandWidth = boldFont.widthOfTextAtSize(brandLine, 16);
    coverPage.drawText(brandLine, {
      x: (width - brandWidth) / 2,
      y: height * 0.45,
      size: 16,
      font: boldFont,
      color: AFD_BLUE,
    });

    const claimLine = "Souveräner KI-Arbeitsraum für patriotische Politik";
    const claimWidth = font.widthOfTextAtSize(claimLine, 9);
    coverPage.drawText(claimLine, {
      x: (width - claimWidth) / 2,
      y: height * 0.40,
      size: 9,
      font,
      color: GRAY,
      opacity: 0.7,
    });

    coverPage.drawRectangle({
      x: 40,
      y: 0,
      width: width - 80,
      height: 2,
      color: AFD_BLUE,
      opacity: 0.3,
    });
  }
}

module.exports = { ReportGenerator };
