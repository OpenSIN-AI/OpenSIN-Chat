// SPDX-License-Identifier: MIT
// Production smoke test with no account, workspace, or seeded database state.
import { test, expect } from "@playwright/test";

test("production shell and public API boot without a client crash", async ({
  page,
  request,
}) => {
  const ping = await request.get("/api/ping");
  expect(ping.ok()).toBe(true);
  const pingBody = await ping.json();
  expect(pingBody.online).toBe(true);

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: /Unexpected Application Error/i,
    }),
  ).toHaveCount(0);

  await expect(page.locator("body")).not.toBeEmpty();
});
