import { expect, test } from "@playwright/test";

/**
 * These use a fresh, isolated agency owner seeded by auth.setup.ts. The
 * founder control plane is deliberately never exercised with a live/root
 * account, so no permission, approval or policy state is mutated in E2E.
 */
test.describe("Phase 1C platform security and read-only tool API", () => {
  test("agency owner cannot read or edit founder AI emergency policy", async ({ page }) => {
    const policy = await page.request.get("/api/saas-admin/ai-control/policy");
    expect(policy.status()).toBe(403);
    const attempts = await page.request.get("/api/saas-admin/ai-control/requests");
    expect(attempts.status()).toBe(403);

    const update = await page.request.patch("/api/saas-admin/ai-control/policy", {
      data: {
        expectedRevision: 1, emergencyDisabled: false,
        reason: "Owner cannot change a founder platform policy.",
      },
    });
    expect(update.status()).toBe(403);
    const review = await page.request.patch("/api/saas-admin/ai-control/agencies/agency-a/review", {
      data: {
        expectedRevision: 1, approve: true,
        reason: "Owner cannot approve their own agency AI request.",
      },
    });
    expect(review.status()).toBe(403);
  });

  test("exposes a fixed registry and single-tenant aggregate previews only", async ({ page }) => {
    const list = await page.request.get("/api/ai-operations/tools");
    expect(list.status()).toBe(200);
    const tools = await list.json();
    expect(tools.map((tool: { id: string }) => tool.id)).toEqual([
      "fleet_overview", "return_attention", "document_review",
      "invoice_review", "urgent_tasks",
    ]);
    expect(tools.every((tool: { mode: string; executesActions: boolean }) =>
      tool.mode === "READ_ONLY" && tool.executesActions === false,
    )).toBe(true);

    const preview = await page.request.get("/api/ai-operations/tools/fleet_overview/preview");
    expect(preview.status()).toBe(200);
    const data = await preview.json();
    expect(data).toMatchObject({
      id: "fleet_overview", source: "Car", mode: "READ_ONLY",
      externalAiUsed: false, automatedActionsEnabled: false,
    });
    expect(Number.isInteger(data.metrics.vehiclesTotal)).toBe(true);
    expect(data.metrics).not.toHaveProperty("customer");
    expect(data.metrics).not.toHaveProperty("email");

    const unknown = await page.request.get("/api/ai-operations/tools/execute-payment/preview");
    expect(unknown.status()).toBe(400);
  });
});
