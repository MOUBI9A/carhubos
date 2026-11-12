import { expect, test } from "@playwright/test";
import { API_URL } from "../playwright.config";

/**
 * Synthetic authenticated agency owner on isolated CI database.
 * This suite NEVER reserves, settles or releases model usage.
 */
test.describe("Phase 1D AI quota ledger — read-only public boundary", () => {
  test("returns only scoped aggregate counters and explicitly disabled spending", async ({ page }) => {
    const response = await page.request.get(`${API_URL}/ai-operations/quota`);
    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      currency: "USD",
      costUnit: "USD_MICROS",
      providerIntegrationReady: false,
      spendEnabled: false,
    });
    expect(Number.isInteger(payload.heldRequests)).toBe(true);
    expect(Number.isInteger(payload.committedRequests)).toBe(true);
    expect(Number.isInteger(payload.heldCostUsdMicros)).toBe(true);
    expect(Number.isInteger(payload.committedCostUsdMicros)).toBe(true);
    expect(payload.heldRequests).toBeGreaterThanOrEqual(0);
    expect(payload.committedCostUsdMicros).toBeGreaterThanOrEqual(0);
    expect(payload).not.toHaveProperty("requestKey");
    expect(payload).not.toHaveProperty("customer");
    expect(payload).not.toHaveProperty("providerToken");
  });

  test("provides no public quota mutation endpoint", async ({ page }) => {
    // Rejects mutation attempts without granting a single reservation, spend
    // permission or model call to a synthetic agency owner.
    const response = await page.request.post(`${API_URL}/ai-operations/quota`, {
      data: { requestKey: "not-allowed", estimatedCostUsdMicros: 1000 },
    });
    expect([404, 405]).toContain(response.status());
  });
});
