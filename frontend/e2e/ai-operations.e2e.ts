import { expect, test } from "@playwright/test";

test.describe("Agency Operations Intelligence — authenticated, read-only", () => {
  test("shows source-grounded agency metrics without autonomous actions", async ({ page }) => {
    const unsafeRequests: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        unsafeRequests.push(`${request.method()} ${pathname}`);
      }
    });

    const apiResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname.endsWith("/api/ai-operations/briefing"),
    );
    await page.goto("/dashboard/ai-operations");
    const response = await apiResponse;
    expect(response.status()).toBe(200);

    const payload = await response.json();
    expect(payload).toMatchObject({
      mode: "MONITOR",
      analysisType: "DETERMINISTIC_AGENCY_RECORDS",
      externalAiUsed: false,
      automatedActionsEnabled: false,
      hasLiveGpsData: false,
      verifiedPaymentStatusUsed: false,
    });
    expect(Date.parse(payload.sampledAt)).not.toBeNaN();
    expect(Number.isInteger(payload.metrics.vehiclesTotal)).toBe(true);
    expect(Number.isInteger(payload.metrics.activeRentals)).toBe(true);
    expect(Number.isInteger(payload.metrics.openInvoices)).toBe(true);
    expect(Array.isArray(payload.signals)).toBe(true);
    expect(payload.signals.every((signal: { actionMode: string }) => signal.actionMode === "REVIEW_ONLY")).toBe(true);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("99.9%");
    await expect(page.locator("body")).not.toContainText("2,481");
    expect(unsafeRequests).toEqual([]);
  });

  test("does not advertise unsupported automation execution metrics", async ({ page }) => {
    await page.goto("/dashboard/automations");
    await expect(page.getByText("Saved rule definitions")).toBeVisible();
    await expect(page.getByText("99.9%")).toHaveCount(0);
    await expect(page.getByText("85%")).toHaveCount(0);
    await expect(page.getByText("2,481")).toHaveCount(0);
  });
});
