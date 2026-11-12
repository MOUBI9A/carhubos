import { expect, test } from "@playwright/test";

test.describe("Phase 1B agency AI governance (isolated CI database)", () => {
  test("Owner can request access and limits without activating inference or other actions", async ({ page }) => {
    const otherMutations: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/")) return;
      if (["GET", "HEAD", "OPTIONS"].includes(request.method())) return;
      if (request.method() === "PATCH" && url.pathname === "/api/ai-operations/settings") return;
      otherMutations.push(`${request.method()} ${url.pathname}`);
    });

    const firstSettings = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/ai-operations/settings" &&
      response.request().method() === "GET",
    );
    await page.goto("/dashboard/ai-operations/settings");
    const initial = await firstSettings;
    expect(initial.status()).toBe(200);
    const policy = await initial.json();
    expect(policy).toMatchObject({
      effectiveEnabled: false,
      providerIntegrationReady: false,
      humanApprovalRequired: true,
      autonomousActionsAllowed: false,
    });

    await expect(page.getByRole("heading", { name: "AI access and limits" })).toBeVisible();
    await expect(page.getByText("AI inference disabled")).toBeVisible();
    await page.getByRole("checkbox", { name: "Request future AI access" }).check();
    await page.getByLabel("Preferred language").selectOption("FR");
    await page.getByLabel("Monthly request limit (0–10,000)").fill("15");
    await page.getByLabel("Monthly budget cap in USD (0–1,000)").fill("10");

    const update = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/ai-operations/settings" &&
      response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Save preferences" }).click();
    const result = await update;
    expect(result.status()).toBe(200);
    const saved = await result.json();
    expect(saved).toMatchObject({
      requestedEnabled: true,
      preferredLanguage: "FR",
      monthlyBudgetUsdCents: 1000,
      monthlyRequestLimit: 15,
      effectiveEnabled: false,
      actionMode: "MONITOR",
      autonomousActionsAllowed: false,
    });
    await expect(page.getByText("Preferences saved. AI access is still subject to platform review.")).toBeVisible();
    await expect(page.getByText("AI inference disabled")).toBeVisible();
    expect(otherMutations).toEqual([]);
  });
});
