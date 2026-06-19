// SPDX-License-Identifier: MIT
const { Workspace } = require("../../models/workspace");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { userFromSession, multiUserMode } = require("../http");

// Will pre-validate and set the workspace for a request if the slug is provided in the URL path.
async function validWorkspaceSlug(request, response, next) {
  try {
    const { slug } = request.params;
    const user = await userFromSession(request, response);
    const workspace = multiUserMode(response)
      ? await Workspace.getWithUser(user, { slug })
      : await Workspace.get({ slug });

    if (!workspace) {
      response.status(404).send("Workspace does not exist.");
      return;
    }

    response.locals.workspace = workspace;
    next();
  } catch (e) {
    console.error(e.message, e);
    response.status(500).json({ error: "Internal server error" });
  }
}

// Will pre-validate and set the workspace AND a thread for a request if the slugs are provided in the URL path.
async function validWorkspaceAndThreadSlug(request, response, next) {
  try {
    const { slug, threadSlug } = request.params;
    const user = await userFromSession(request, response);
    const workspace = multiUserMode(response)
      ? await Workspace.getWithUser(user, { slug })
      : await Workspace.get({ slug });

    if (!workspace) {
      response.status(404).send("Workspace does not exist.");
      return;
    }

    const thread = await WorkspaceThread.get({
      slug: threadSlug,
      workspace_id: workspace.id,
      user_id: user?.id || null,
    });
    if (!thread) {
      response.status(404).send("Workspace thread does not exist.");
      return;
    }

    response.locals.workspace = workspace;
    response.locals.thread = thread;
    next();
  } catch (e) {
    console.error(e.message, e);
    response.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
};
