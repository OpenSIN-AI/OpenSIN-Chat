/**
 * LLM Summarizer — generates structured summaries of research results.
 *
 * Docs: summarizer.doc.md
 * Purpose: Takes search results, extracted content, and politician data
 * and generates a structured summary using the configured LLM.
 */

const { SystemSettings } = require("../../models/systemSettings");

class LLMSummarizer {
  /**
   * Summarize research results.
   * @param {Object} params
   * @param {string} params.query - original research question
   * @param {Array} params.searchResults - web search results
   * @param {Array} params.extractedContent - extracted URL content
   * @param {Array} params.politicianResults - politician DB results
   * @returns {Promise<string>}
   */
  static async summarize({ query, searchResults, extractedContent, politicianResults }) {
    const context = LLMSummarizer.#buildContext(query, searchResults, extractedContent, politicianResults);

    try {
      const { OpenAiLlm } = require("../../utils/agents/aibitat/providers/openai");
      const { getLLMProvider } = require("../../utils/agents/defaults");

      const LLMProvider = await getLLMProvider();
      if (!LLMProvider) return LLMSummarizer.#buildFallbackSummary(query, searchResults, politicianResults);

      const prompt = LLMSummarizer.#buildPrompt(query, context);
      const response = await LLMProvider.sendPrompt(prompt);
      return response || LLMSummarizer.#buildFallbackSummary(query, searchResults, politicianResults);
    } catch (err) {
      return LLMSummarizer.#buildFallbackSummary(query, searchResults, politicianResults);
    }
  }

  /**
   * Build the context block for the LLM prompt.
   */
  static #buildContext(query, searchResults, extractedContent, politicianResults) {
    const parts = [];

    if (searchResults.length) {
      parts.push("## Web-Suchergebnisse");
      searchResults.slice(0, 10).forEach((r, i) => {
        parts.push(`${i + 1}. [${r.title}](${r.link}): ${r.snippet}`);
      });
    }

    if (extractedContent.length) {
      parts.push("\n## Extrahierte Inhalte");
      extractedContent.slice(0, 5).forEach((c) => {
        parts.push(`### ${c.title || c.url}\n${c.content?.substring(0, 2000)}`);
      });
    }

    if (politicianResults.length) {
      parts.push("\n## Politiker-Datenbank");
      politicianResults.forEach((p) => {
        parts.push(`- **${p.fullName}** (${p.party || "?"}) — ${p.faction || ""}, ${p.state || ""}`);
      });
    }

    return parts.join("\n");
  }

  /**
   * Build the LLM prompt.
   */
  static #buildPrompt(query, context) {
    return `Du bist ein Recherche-Assistent für die AfD-Fraktion im Deutschen Bundestag.

Aufgabe: Erstelle eine strukturierte Zusammenfassung der folgenden Recherchedaten zur Frage: "${query}"

Anforderungen:
1. Beginne mit einer kurzen Einordnung des Themas
2. Fasse die wichtigsten Erkenntnisse zusammen
3. Nenne immer Quellen (Gesetz, Bundestags-Drucksache, URL)
4. Hebe AfD-Positionen besonders hervor, falls vorhanden
5. Schlage Folge-Recherchen vor

Daten:
${context}

Antworte auf Deutsch im Markdown-Format.`;
  }

  /**
   * Build a fallback summary without LLM.
   */
  static #buildFallbackSummary(query, searchResults, politicianResults) {
    const parts = [`# Recherche: ${query}\n`];

    if (searchResults.length) {
      parts.push("## Web-Ergebnisse");
      searchResults.slice(0, 10).forEach((r, i) => {
        parts.push(`${i + 1}. **${r.title}** — ${r.snippet || ""}`);
      });
    }

    if (politicianResults.length) {
      parts.push("\n## Politiker-Ergebnisse");
      politicianResults.slice(0, 5).forEach((p) => {
        parts.push(`- **${p.fullName}** (${p.party || "?"}) — ${p.faction || ""}, ${p.state || ""}`);
      });
    }

    return parts.join("\n");
  }
}

module.exports = { LLMSummarizer };
