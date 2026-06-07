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
    "Du bist ein Assistent, der extrem kurze, prägnante Titel (max. 5 Wörter) " +
    "für Chat-Verläufe generiert. Der Titel muss in derselben Sprache wie die " +
    "Nutzeranfrage sein. Antworte NUR mit dem Titel, ohne Anführungszeichen, " +
    "ohne Markdown und ohne zusätzliche Erklärungen.";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Nutzer: ${prompt}\nAssistent: ${response}` },
  ];

  const { textResponse } = await LLMConnector.getChatCompletion(messages, {
    temperature: 0.5,
  });

  // Cleanup: Anführungszeichen, Newlines, Markdown, Whitespace — und
  // Fallback auf defaultName falls die LLM-Antwort leer war.
  const cleanTitle =
    (textResponse || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\n/g, " ")
      .substring(0, 100) || WorkspaceThread.defaultName;

  await WorkspaceThread.update(thread, { name: cleanTitle });
  console.log(`[GenerateTitle] Thread ${threadId} renamed to: "${cleanTitle}"`);
}

module.exports = generateTitleJob;
