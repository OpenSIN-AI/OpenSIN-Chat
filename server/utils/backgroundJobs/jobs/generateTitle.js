// SPDX-License-Identifier: MIT
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
    console.log(
      `[GenerateTitle] Thread ${threadId} has user-customized name "${thread.name}", skipping.`,
    );
    return;
  }

  const workspace = await Workspace.get({ slug: workspaceSlug });
  if (!workspace) throw new Error(`Workspace ${workspaceSlug} not found`);

  // resolveProviderConnector handled Standard-LLMs UND den openafd-router
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
  ];

  function isValidTitle(line) {
    if (!line) return false;
    const lower = line.toLowerCase();
    if (promptEchoMarkers.some((marker) => lower.includes(marker.toLowerCase())))
      return false;
    // Ausschließen von Markdown-Listenzeilen, die aus der Assistentenantwort
    // stammen könnten (z. B. "**4. Einschränkung erneuerbarer Energ").
    if (/^[-*\d]/.test(line) || /^\*+\s*\d/.test(line)) return false;
    const words = line.trim().split(/\s+/).filter(Boolean);
    return words.length >= 1 && words.length <= 5 && line.length <= 40;
  }

  const lines = (textResponse || "")
    .split(/\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  // DEBUG: remove after verification
  console.log(
    `[GenerateTitle] lines for thread ${threadId}:`,
    JSON.stringify(lines),
  );

  let cleanTitle = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isValidTitle(lines[i])) {
      cleanTitle = lines[i];
      break;
    }
  }

  // Reasoning-Modelle (deepseek-v4-pro) geben den Titel manchmal inline
  // am Ende einer einzigen langen Zeile aus (z. B. "... I'll output: AfD
  // Energy Policy"). In dem Fall entfernen wir bekannte Prompt-Echo-Texte
  // aus dem gesamten Response und nehmen die letzten 3–5 Wörter als Titel.
  if (!cleanTitle) {
    let scrubbed = textResponse || "";
    for (const marker of promptEchoMarkers) {
      scrubbed = scrubbed.split(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")).join("");
    }
    // Auch die wiederholte User-Prompt-Zeile entfernen, damit sie nicht als
    // Titel ausgewählt wird.
    scrubbed = scrubbed.split(new RegExp(prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")).join("");
    const tail = scrubbed.trim().split(/\s+/).filter(Boolean).slice(-5);
    const candidate = tail.join(" ").replace(/[^\w\säöüßÄÖÜ-]/g, "").trim();
    if (isValidTitle(candidate)) cleanTitle = candidate;
  }

  // Falls kein gültiger Titel gefunden wurde, auf den ersten Teil der
  // Nutzeranfrage zurückfallen (max. 5 Wörter, max. 40 Zeichen).
  if (!cleanTitle) {
    cleanTitle = prompt
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
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
  console.log(`[GenerateTitle] Thread ${threadId} renamed to: "${cleanTitle}"`);
}

module.exports = generateTitleJob;
