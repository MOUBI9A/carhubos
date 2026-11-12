import { expect, test } from "@playwright/test";

test.describe("Public compliance and transparent signup", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of [
    "/privacy",
    "/terms",
    "/cookies",
    "/refunds",
    "/support",
    "/account-deletion",
  ]) {
    test(`${route} has a readable public notice`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main#main-content")).toBeVisible();
    });
  }

  test("provides keyboard access to the main content", async ({ page }) => {
    await page.goto("/privacy");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Aller au contenu principal" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
  });

  test("agency signup explicitly requires both unchecked acknowledgements", async ({ page }) => {
    let submissions = 0;
    let signupPayload: Record<string, unknown> | null = null;
    await page.route("**/api/auth/register", async (route) => {
      submissions++;
      signupPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Test request: no user created" }),
      });
    });
    await page.goto("/signup");
    for (const id of ["signup-agency", "signup-name", "signup-email", "signup-password"]) {
      await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await page.locator("#signup-agency").fill("QA Example Agency");
    await page.locator("#signup-name").fill("QA Operator");
    await page.locator("#signup-email").fill("qa-legal@carhub.test");
    await page.locator("#signup-password").fill("LongSecureTestPassword123!");
    await expect(page.locator("#signup-legal")).not.toBeChecked();
    await expect(page.locator("#signup-adult")).not.toBeChecked();
    await page.locator('form button[type="submit"]').click();
    expect(submissions).toBe(0);

    await page.locator("#signup-legal").check();
    await page.locator('form button[type="submit"]').click();
    expect(submissions).toBe(0);

    await page.locator("#signup-adult").check();
    await page.locator('form button[type="submit"]').click();
    await expect.poll(() => submissions).toBe(1);
    expect(signupPayload).toMatchObject({
      legalNoticeAcknowledged: true,
      confirmsAdultAndAuthority: true,
    });
    await expect(page.locator('a[href="/terms"]')).toHaveCount(1);
    await expect(page.locator('a[href="/privacy"]')).toHaveCount(1);
  });

  test("published notices do not claim a certification or unverified uptime", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByText(/99\.8%/)).toHaveCount(0);
    await expect(page.getByText(/horodatage cryptographique certifié/i)).toHaveCount(0);
    await page.goto("/privacy");
    await expect(page.getByText(/CONFORMITÉ LOI 09-08 & CNDP/i)).toHaveCount(0);
  });
});
