// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

/**
 * Job-Handler: generiert einen kurzen, prägnanten Titel (max 5 Wörter)
 * für einen frisch erstellten Thread.
 *
 * Wird ausschließlich von `server/utils/backgroundJobs/queue.js` via
 * `BackgroundQueue.add("GENERATE_THREAD_TITLE", payload)` getriggert.
 *
 * Wichtig: das Payload MUSS serialisierbar sein (nur IDs/Slugs/Strings),
 * weil es in `job_queue.payload` als JSON landet und später wieder
 * deserialisiert wird. Prisma-Objekte würden das nicht überleben.
 */
const { WorkspaceThread } = require("../../../models/workspaceThread");
const { resolveProviderConnector } = require("../../helpers");
const { Workspace } = require("../../../models/workspace");

async function generateTitleJob({ threadId, workspaceSlug, prompt, response }) {
  if (!threadId || !prompt || !response) {
    throw new Error("Missing required payload fields");
  }

  // Thread + Workspace frisch aus der DB laden — niemals aus dem Payload,
  // weil das veraltet sein könnte (User hat den Thread evtl. zwischendurch
  // umbenannt, Workspace gelöscht etc.).
  const thread = await WorkspaceThread.get({ id: Number(threadId) });
  if (!thread) throw new Error(`Thread ${threadId} not found`);

  // Skip-Schutz: nur überschreiben, wenn der Thread noch im "frisch erstellt"
  // Zustand ist. autoRenameThread hat `truncate(prompt, 22)` synchron gemacht,
  // also hat der Thread bereits einen Namen. Wir wollen den **überschreiben**
  // mit einem LLM-generierten prägnanten Namen.
  //
  // Schutz vor User-Umbenennungen: wenn der Name länger als 30 Zeichen ist UND
  // NICHT mit truncate(prompt) übereinstimmt, hat der User manuell benannt
  // und wir lassen die Finger davon. Heuristik: truncate(prompt, 22) ergibt
  // max 22 Zeichen + "…" = 23 max.
  const truncatedPrompt = (prompt || "").substring(0, 22) + "…";
  const looksLikeAutoRename =
    thread.name === WorkspaceThread.defaultName ||
    thread.name === truncatedPrompt ||
    thread.name === (prompt || "").substring(0, 22);

  if (!looksLikeAutoRename) {
    consoleLogger.log(
      `[GenerateTitle] Thread ${threadId} has user-customized name "${thread.name}", skipping.`,
    );
    return;
  }

  const workspace = await Workspace.get({ slug: workspaceSlug });
  if (!workspace) throw new Error(`Workspace ${workspaceSlug} not found`);

  // resolveProviderConnector handled Standard-LLMs UND den opensin-router
  // sicher (Provider-Auswahl, Auth, Model-Lookup).
  const { connector: LLMConnector } = await resolveProviderConnector({
    workspace,
    prompt,
    user: null,
    thread,
    attachments: [],
  });

  if (!LLMConnector) {
    throw new Error("No LLM connector resolved — workspace/provider invalid?");
  }

  const systemPrompt =
    "Return ONLY a concise 3-5 word title for the user's message. " +
    "Do not explain, quote, or add any preamble. " +
    "Do not include the words 'title', 'thread', 'conversation', 'summarize', " +
    "or 'generate' in the output. Example: AfD Energy Policy Overview";

  const userPrompt =
    `User message: ${prompt}\n\n` +
    "Return ONLY a concise 3-5 word title for this message. No explanation, no quotes, no markdown:";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const { textResponse } = await LLMConnector.getChatCompletion(messages, {
    temperature: 0.5,
  });

  // Reasoning-Modelle (deepseek-v4-pro) liefern Newlines manchmal als
  // literale "\n"-Sequenzen im Text. Wir normalisieren auf echte Newlines,
  // damit die Zeilen-Suche funktioniert.
  const normalizedText = (textResponse || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  // Reasoning models (z.B. deepseek-v4-pro) liefern oft eine lange
  // interne Kette vor dem eigentlichen Titel. Wir suchen von hinten nach
  // der ersten Zeile, die wie ein gültiger Titel aussieht (max. 5 Wörter,
  // keine Prompt-Echo-Marker), und ignorieren den Rest.
  const promptEchoMarkers = [
    "max. 5 Wörter",
    "maximum 5 words",
    "Titel für Chat-Verläufe",
    "Return ONLY a concise",
    "Do not explain",
    "Do not include the words",
    "Example:",
    "Provide a 5-word-or-less",
    "We are asked:",
    "We need to generate",
    "concise title",
    "generate a title",
    "Analyze the Request",
    "short, concise title",
    "extrem kurzen",
    "User message:",
  ];

  function isValidTitle(line) {
    if (!line) return false;
    const lower = line.toLowerCase();
    if (
      promptEchoMarkers.some((marker) => lower.includes(marker.toLowerCase()))
    )
      return false;
    // Reject reasoning-model artifacts: lines starting with think tokens,
    // analysis markers, or German reasoning phrases
    if (
      /^(?:<|app|analysis|wir müssen|we need|we are|the user|step \d|user message)/i.test(
        line,
      )
    )
      return false;
    // Ausschließen von Markdown-Listenzeilen, die aus der Assistentenantwort
    // stammen könnten (z. B. "**4. Einschränkung erneuerbarer Energ").
    if (/^[-*\d]/.test(line) || /^\*+\s*\d/.test(line)) return false;
    // Reject lines with duplicate word pairs (e.g. "AfD Energy AfD Energy")
    const words = line.trim().split(/\s+/).filter(Boolean);
    if (words.length === 4 && words[0] === words[2] && words[1] === words[3])
      return false;
    return words.length >= 1 && words.length <= 5 && line.length <= 40;
  }

  const lines = normalizedText
    .split(/\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  let cleanTitle = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const valid = isValidTitle(lines[i]);
    if (valid) {
      cleanTitle = lines[i];
      break;
    }
  }

  // Reasoning-Modelle (deepseek-v4-pro) geben den Titel manchmal inline
  // am Ende einer einzigen langen Zeile aus (z. B. "... I'll output: AfD
  // Energy Policy"). In dem Fall entfernen wir Prompt-Echo-Texte und
  // Reasoning-Token, nehmen den Wort-Array und suchen vom Ende her nach dem
  // kürzesten gültigen 3–5-Wort-Suffix. Wenn der gesamte Response aus
  // Prompt-Echo-Zeilen besteht, überspringen wir diesen Fallback und nutzen
  // die Nutzeranfrage.
  const hasNonEchoLine = lines.some(
    (line) =>
      !promptEchoMarkers.some((m) =>
        line.toLowerCase().includes(m.toLowerCase()),
      ),
  );
  if (!cleanTitle && hasNonEchoLine) {
    let scrubbed = normalizedText;
    for (const marker of promptEchoMarkers) {
      scrubbed = scrubbed
        .split(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"))
        .join("");
    }
    // Auch die wiederholte User-Prompt-Zeile entfernen, damit sie nicht als
    // Titel ausgewählt wird.
    scrubbed = scrubbed
      .split(new RegExp(prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"))
      .join("");
    // Reasoning-Token wie "think" oder "thinking" können ohne Leerzeichen an
    // Wörter anhaften (z. B. "InquirythinkAfD"). Wir isolieren und entfernen
    // sie, bevor wir das Wort-Suffix bestimmen.
    scrubbed = scrubbed
      .replace(/(thinking|reasoning|analysis|think|reason|step)/gi, " ")
      .replace(/[^\w\säöüßÄÖÜ-]/g, " ")
      .trim();
    const words = scrubbed.split(/\s+/).filter(Boolean);
    // Vom längsten Suffix zum kürzesten: ein Kandidat mit doppelten Wörtern
    // wird verworfen, weil Reasoning-Modelle den Titel gerne wiederholen.
    // Häufige Reasoning-Anhängsel am Anfang/Ende werden entfernt.
    const leadingNoise = new Set([
      "that",
      "this",
      "output",
      "return",
      "ill",
      "so",
      "then",
      "thus",
      "therefore",
      "hence",
      "answer",
      "final",
      "title",
      "name",
      "like",
      "such",
      "be",
      "is",
      "are",
      "was",
      "were",
      "am",
      "i",
      "we",
      "you",
    ]);
    const trailingNoise = new Set([
      "inquiry",
      "question",
      "response",
      "answer",
      "output",
      "return",
      "title",
      "name",
      "here",
      "there",
      "exactly",
      "only",
    ]);
    for (let take = 5; take >= 3; take--) {
      let candidateWords = words.slice(-take);
      while (
        candidateWords.length > 3 &&
        leadingNoise.has(candidateWords[0].toLowerCase())
      ) {
        candidateWords = candidateWords.slice(1);
      }
      while (
        candidateWords.length > 3 &&
        trailingNoise.has(
          candidateWords[candidateWords.length - 1].toLowerCase(),
        )
      ) {
        candidateWords = candidateWords.slice(0, -1);
      }
      const candidate = candidateWords.join(" ").trim();
      const unique = new Set(candidateWords.map((w) => w.toLowerCase()));
      if (unique.size === candidateWords.length && isValidTitle(candidate)) {
        cleanTitle = candidate;
        break;
      }
    }
  }

  // Falls kein gültiger Titel gefunden wurde, auf den ersten Teil der
  // Nutzeranfrage zurückfallen (max. 5 Wörter, max. 40 Zeichen).
  if (!cleanTitle) {
    cleanTitle = prompt.split(/\s+/).slice(0, 5).join(" ");
  }

  // Harte Längenbegrenzung: max. 5 Wörter und 40 Zeichen.
  cleanTitle = cleanTitle
    .split(/\s+/)
    .slice(0, 5)
    .join(" ")
    .substring(0, 40)
    .trim();

  if (!cleanTitle) cleanTitle = WorkspaceThread.defaultName;

  await WorkspaceThread.update(thread, { name: cleanTitle });
  consoleLogger.log(
    `[GenerateTitle] Thread ${threadId} renamed to: "${cleanTitle}"`,
  );
}

module.exports = generateTitleJob;
