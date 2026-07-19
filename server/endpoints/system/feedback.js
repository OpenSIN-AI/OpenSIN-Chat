// SPDX-License-Identifier: MIT
// Purpose: In-app feedback → GitHub issue creation for the product repo.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");
const { reqBody, userFromSession } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");

const TITLE_MAX = 200;
const BODY_MAX = 12_000;
const ALLOWED_LABELS = new Set([
  "bug",
  "enhancement",
  "feedback",
  "question",
  "documentation",
]);

/**
 * Default issue repo when GITHUB_FEEDBACK_REPO is unset.
 * - openafd-chat package → Family-Team-Projects/OpenAfD-Chat
 * - otherwise → OpenSIN-AI/OpenSIN-Chat
 */
function resolveFeedbackRepo() {
  const fromEnv = (process.env.GITHUB_FEEDBACK_REPO || "").trim();
  if (fromEnv && /^[\w.-]+\/[\w.-]+$/.test(fromEnv)) return fromEnv;
  try {
    const pkg = require("../../../package.json");
    if (pkg?.name && /openafd/i.test(String(pkg.name))) {
      return "Family-Team-Projects/OpenAfD-Chat";
    }
  } catch {
    /* ignore */
  }
  return "OpenSIN-AI/OpenSIN-Chat";
}

function resolveFeedbackToken() {
  return (
    process.env.GITHUB_FEEDBACK_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    ""
  ).trim();
}

function sanitizeTitle(raw) {
  return String(raw || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, TITLE_MAX);
}

function sanitizeBody(raw) {
  return String(raw || "")
    .trim()
    .slice(0, BODY_MAX);
}

function sanitizeLabels(labels) {
  if (!Array.isArray(labels)) return ["feedback"];
  const picked = labels
    .map((l) => String(l || "").toLowerCase().trim())
    .filter((l) => ALLOWED_LABELS.has(l));
  return picked.length > 0 ? [...new Set(picked)] : ["feedback"];
}

/**
 * Create a GitHub issue via the REST API.
 * @returns {Promise<{number:number, html_url:string, title:string}>}
 */
async function createGitHubIssue({ repo, token, title, body, labels }) {
  const url = `https://api.github.com/repos/${repo}/issues`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "OpenSIN-Chat-Feedback",
    },
    body: JSON.stringify({ title, body, labels }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.message ||
      (typeof data?.errors === "object"
        ? JSON.stringify(data.errors)
        : null) ||
      `GitHub API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return {
    number: data.number,
    html_url: data.html_url,
    title: data.title,
  };
}

function feedbackEndpoints(app) {
  if (!app) return;

  /**
   * GET /system/feedback/config
   * Public to authenticated users — returns whether issue creation is available
   * and which repo will receive issues (no secrets).
   */
  app.get(
    "/system/feedback/config",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (_request, response) => {
      const repo = resolveFeedbackRepo();
      const configured = !!resolveFeedbackToken();
      return response.status(200).json({
        configured,
        repo,
        githubNewIssueUrl: `https://github.com/${repo}/issues/new`,
      });
    },
  );

  /**
   * POST /system/feedback
   * Body: { title: string, body?: string, labels?: string[], pageUrl?: string }
   */
  app.post(
    "/system/feedback",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const token = resolveFeedbackToken();
        const repo = resolveFeedbackRepo();
        if (!token) {
          return response.status(503).json({
            success: false,
            error:
              "Feedback is not configured on this server (missing GITHUB_FEEDBACK_TOKEN).",
            githubNewIssueUrl: `https://github.com/${repo}/issues/new`,
          });
        }

        const {
          title: rawTitle,
          body: rawBody = "",
          labels: rawLabels,
          pageUrl = "",
        } = reqBody(request) || {};

        const title = sanitizeTitle(rawTitle);
        if (title.length < 3) {
          return response.status(400).json({
            success: false,
            error: "Title must be at least 3 characters.",
          });
        }

        const body = sanitizeBody(rawBody);
        const labels = sanitizeLabels(rawLabels);
        const user = await userFromSession(request, response).catch(() => null);

        const meta = [
          "",
          "---",
          "### Context (auto)",
          `- **App:** ${process.env.APP_NAME || "OpenSIN-Chat"}`,
          `- **User:** ${user?.username || "anonymous"}`,
          user?.id ? `- **User id:** ${user.id}` : null,
          pageUrl ? `- **Page:** ${String(pageUrl).slice(0, 500)}` : null,
          `- **Submitted:** ${new Date().toISOString()}`,
        ]
          .filter(Boolean)
          .join("\n");

        const fullBody = (body || "_(no description)_") + meta;

        const issue = await createGitHubIssue({
          repo,
          token,
          title,
          body: fullBody,
          labels,
        });

        consoleLogger.log(
          `[feedback] created ${repo}#${issue.number} by ${user?.username || "anon"}`,
        );

        return response.status(201).json({
          success: true,
          issue: {
            number: issue.number,
            url: issue.html_url,
            title: issue.title,
            repo,
          },
        });
      } catch (error) {
        consoleLogger.error("[feedback] failed to create issue:", error.message);
        const status =
          error.status >= 400 && error.status < 600 ? error.status : 502;
        return response.status(status).json({
          success: false,
          error: error.message || "Failed to create GitHub issue.",
          githubNewIssueUrl: `https://github.com/${resolveFeedbackRepo()}/issues/new`,
        });
      }
    },
  );
}

module.exports = {
  feedbackEndpoints,
  resolveFeedbackRepo,
  resolveFeedbackToken,
  sanitizeTitle,
  sanitizeBody,
  sanitizeLabels,
};
