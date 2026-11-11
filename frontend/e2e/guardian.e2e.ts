import { expect, test } from "@playwright/test";
import { API_URL } from "../playwright.config";

function future(days: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * Uses auth.setup's newly registered and onboarded test agency, never a live
 * user account. The E2E runner MUST target an isolated local test database.
 */
test("Guardian Vision staff: create draft and enforce photographic evidence gate", async ({
  page,
  request,
}) => {
  const [cars, customers] = await Promise.all([
    request.get(API_URL + "/cars"),
    request.get(API_URL + "/customers"),
  ]);
  expect(cars.ok()).toBeTruthy();
  expect(customers.ok()).toBeTruthy();
  const carRows = await cars.json();
  const customerRows = await customers.json();
  const car = Array.isArray(carRows) ? carRows[0] : carRows.items?.[0];
  const eligibleCustomers = Array.isArray(customerRows)
    ? customerRows
    : (customerRows.items ?? []);
  // Setup intentionally seeds a blacklisted customer. Test the normal renter
  // and preserve the Trust Network's hard lock for the flagged fixture.
  const customer = eligibleCustomers.find(
    (c: { firstName: string; lastName: string }) =>
      c.firstName === "Test" && c.lastName === "Renter",
  );
  expect(car?.id, "Need seeded test car").toBeTruthy();
  expect(customer?.id, "Need seeded test customer").toBeTruthy();

  const booking = await request.post(API_URL + "/bookings", {
    data: {
      carId: car.id,
      customerId: customer.id,
      startDate: future(76),
      endDate: future(78),
    },
  });
  expect(
    booking.ok(),
    "Create isolated test booking failed: " + (await booking.text()),
  ).toBeTruthy();
  const created = await booking.json();

  await page.goto("/dashboard/guardian");
  await expect(
    page.getByRole("heading", { name: "Guardian Vision" }),
  ).toBeVisible();
  await expect(page.getByText("Find a booking")).toBeVisible();
  await page.getByRole("textbox", { name: "Booking ID" }).fill(created.id);
  await page.getByRole("button", { name: /Look up booking/ }).click();
  await expect(
    page.getByText("No inspection created for this booking yet."),
  ).toBeVisible();

  await page.getByRole("spinbutton", { name: "Mileage (km)" }).fill("27500");
  await page.getByRole("spinbutton", { name: "Fuel (eighths)" }).fill("8");
  await page.getByRole("button", { name: "Create inspection" }).click();
  await expect(
    page.getByRole("heading", { name: "Evidence locker" }),
  ).toBeVisible();
  await expect(page.getByText("Draft", { exact: false }).first()).toBeVisible();
  await page
    .getByRole("button", { name: /Publish & approve revision/ })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: /Missing evidence/i }),
  ).toBeVisible();
});

test("Guardian Vision mutual review: customer proposes photo, agency accepts, both approve revision", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const { fixtureDatabase } = await import("./fixtures");
  const { FRONTEND_URL } = await import("../playwright.config");
  const fs = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const path = await import("node:path");
  const { prisma, backendRequire } = fixtureDatabase();
  const ownerAccount = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "playwright/.auth/account.json"),
      "utf8",
    ),
  );
  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: ownerAccount.email },
  });
  const renterEmail = "guardian-e2e-" + Date.now() + "@carhub.test";
  const renterPassword = "GuardianE2ePass2026!";
  const renter = await prisma.user.create({
    data: {
      name: "Guardian Renter",
      email: renterEmail,
      role: "RENTER",
      isVerified: true,
      password: await backendRequire("bcryptjs").hash(renterPassword, 10),
    },
  });
  const agencyId = owner.agencyId!;
  const customer = await prisma.customer.findFirstOrThrow({
    where: { agencyId, firstName: "Test", lastName: "Renter" },
  });
  const car = await prisma.car.findFirstOrThrow({
    where: { agencyId, status: "AVAILABLE" },
  });
  const unique = "G" + Date.now();
  const booking = await prisma.booking.create({
    data: {
      carId: car.id,
      agencyId,
      customerId: customer.id,
      renterId: renter.id,
      startDate: new Date(future(130)),
      endDate: new Date(future(133)),
      totalPrice: 1200,
      status: "APPROVED",
    },
  });
  await prisma.customer.update({
    where: { id: customer.id },
    data: { userId: renter.id },
  });
  const beforePayments = await prisma.payment.count();
  try {
    const response = await request.post(API_URL + "/guardian/staff/reports", {
      data: {
        bookingId: booking.id,
        phase: "OUT",
        mode: "QUICK",
        mileage: 23500,
        fuelLevel: 8,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const report = await response.json();
    const addEvidence = async (
      kind: string,
      uploadedById: string,
      uploadedByRole: string,
    ) =>
      prisma.guardianEvidence.create({
        data: {
          reportId: report.id,
          kind,
          storagePath:
            "e2e-fixture/" + unique + "/" + kind + "/" + uploadedById,
          sha256: createHash("sha256")
            .update(unique + kind + uploadedById)
            .digest("hex"),
          filename: kind.toLowerCase() + ".jpg",
          mimeType: "image/jpeg",
          sizeBytes: 5,
          uploadedById,
          uploadedByRole,
        },
      });
    for (const kind of ["OVERVIEW", "ODOMETER", "FUEL"])
      await addEvidence(kind, owner.id, "AGENCY");
    const staffPhoto = await addEvidence("DAMAGE", owner.id, "AGENCY");
    const initial = await request.post(
      API_URL + "/guardian/staff/reports/" + report.id + "/findings",
      {
        data: {
          zone: "REAR_BUMPER",
          kind: "SCRATCH",
          photoId: staffPhoto.id,
          description: "Existing bumper mark",
          revision: report.revision,
        },
      },
    );
    expect(initial.ok(), await initial.text()).toBeTruthy();
    const published = await request.post(
      API_URL + "/guardian/staff/reports/" + report.id + "/publish",
      {
        data: { revision: 2 },
      },
    );
    expect(published.ok(), await published.text()).toBeTruthy();

    const renterContext = await browser.newContext({ baseURL: FRONTEND_URL });
    try {
      const renterPage = await renterContext.newPage();
      await renterPage.goto("/login");
      await renterPage.getByPlaceholder("name@agency.com").fill(renterEmail);
      await renterPage.locator('input[type="password"]').fill(renterPassword);
      await renterPage.locator('form button[type="submit"]').click();
      await renterPage.waitForURL("**/portal**");
      await renterPage.goto("/portal/inspections");
      await expect(
        renterPage.getByRole("heading", { name: "Guardian Vision" }),
      ).toBeVisible();
      await expect(
        renterPage.getByText("Departure · Customer Review", { exact: false }),
      ).toBeVisible();
      await renterPage
        .getByText("Departure · Customer Review", { exact: false })
        .first()
        .click();
      await expect(renterPage.getByText("Rear Bumper · SCRATCH")).toBeVisible();

      // No external storage service is contacted: this is an isolated seeded
      // media-metadata fixture. Real storage signing is separately unit tested.
      const customerPhoto = await addEvidence("DAMAGE", renter.id, "CUSTOMER");
      await renterPage
        .getByRole("button", { name: "Refresh this report" })
        .click();
      await renterPage
        .getByRole("textbox", { name: "Damage type" })
        .fill("DENT");
      await renterPage
        .getByRole("combobox", { name: "Linked close-up photo" })
        .selectOption(customerPhoto.id);
      await renterPage
        .getByRole("textbox", { name: "Description" })
        .fill("I found a dent on the rear bumper.");
      await renterPage.getByRole("button", { name: "Propose finding" }).click();
      await expect(
        renterPage.getByText("Correction", { exact: false }).first(),
      ).toBeVisible();
      await expect(
        renterPage.getByText("Agency review is required.", { exact: false }),
      ).toBeVisible();

      await page.goto("/dashboard/guardian");
      await page.getByRole("textbox", { name: "Booking ID" }).fill(booking.id);
      await page.getByRole("button", { name: /Look up booking/ }).click();
      await page
        .getByText("Departure · Corrections Pending", { exact: false })
        .first()
        .click();
      await expect(
        page.getByText("I found a dent on the rear bumper."),
      ).toBeVisible();
      await page.getByRole("button", { name: "Accept proposal" }).click();
      await expect(page.getByText("Proposal decision recorded.")).toBeVisible();
      await page
        .getByRole("button", { name: /Publish & approve revision/ })
        .click();
      await expect(
        page.getByText("Published for customer review."),
      ).toBeVisible();

      await renterPage
        .getByRole("button", { name: "Refresh this report" })
        .click();
      await renterPage.getByRole("checkbox").check();
      await renterPage
        .getByRole("button", { name: /Approve revision/ })
        .click();
      await expect(
        renterPage.getByText(/Both parties approved revision/),
      ).toBeVisible();

      const final = await prisma.guardianReport.findUniqueOrThrow({
        where: { id: report.id },
        include: { findings: true, events: true },
      });
      expect(final.status).toBe("MUTUALLY_APPROVED");
      expect(final.agencyApprovedRevision).toBe(final.customerApprovedRevision);
      expect(final.findings).toHaveLength(2);
      expect(
        final.findings.every(
          (f: { status: string }) => f.status === "ACCEPTED",
        ),
      ).toBeTruthy();
      expect(final.events.map((e: { action: string }) => e.action)).toContain(
        "CORRECTION_ACCEPT",
      );

      // Real PDF bytes are rendered from this DB revision; storage metadata
      // fixtures still do not constitute actual object-storage verification.
      const pdfPath = "/guardian/staff/reports/" + report.id + "/pdf";
      const pdf = await request.get(API_URL + pdfPath);
      expect(pdf.ok(), await pdf.text()).toBeTruthy();
      expect(pdf.headers()["content-type"]).toContain("application/pdf");
      expect(pdf.headers()["cache-control"]).toContain("no-store");
      expect(pdf.headers()["x-guardian-revision"]).toBe(String(final.revision));
      expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

      const downloadPromise = renterPage.waitForEvent("download");
      await renterPage
        .getByRole("button", { name: "Download inspection PDF" })
        .click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/guardian-.*\.pdf$/);
      const downloadFile = await download.path();
      expect(downloadFile).toBeTruthy();
      expect(fs.readFileSync(downloadFile!).subarray(0, 5).toString()).toBe(
        "%PDF-",
      );

      await page.getByRole("button", { name: "Refresh this report" }).click();
      const notify = page.getByRole("button", {
        name: "Send report via WhatsApp",
      });
      await expect(notify).toBeDisabled();
      expect(
        await prisma.guardianEvent.count({
          where: { reportId: report.id, action: { startsWith: "WHATSAPP_" } },
        }),
      ).toBe(0);
      await page.getByRole("checkbox").check();
      await notify.click();
      await expect(
        page.getByText(
          "WhatsApp is not configured for this agency. No message was sent.",
        ),
      ).toBeVisible();

      // This must explicitly clear the project's configured authenticated storage state.
      // Playwright's browser fixture may inherit context defaults from the project.
      const anonymous = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      });
      try {
        expect((await anonymous.request.get(API_URL + pdfPath)).status()).toBe(
          401,
        );
        const outsider = await prisma.user.create({
          data: {
            name: "Guardian outsider",
            email: "guardian-outsider-" + Date.now() + "@carhub.test",
            password: "not-a-login-hash",
            role: "RENTER",
            isVerified: true,
          },
        });
        const { JwtService } = backendRequire("@nestjs/jwt");
        if (!process.env.JWT_SECRET)
          throw new Error("Isolated E2E JWT_SECRET is required");
        const token = new JwtService().sign(
          { sub: outsider.id, role: "RENTER", isVerified: true },
          { secret: process.env.JWT_SECRET },
        );
        expect(
          (
            await anonymous.request.get(
              API_URL + "/guardian/customer/reports/" + report.id + "/pdf",
              {
                headers: { Authorization: "Bearer " + token },
              },
            )
          ).status(),
        ).toBe(404);
        expect(
          (
            await anonymous.request.get(
              API_URL + "/guardian/customer/reports/" + report.id,
              {
                headers: { Authorization: "Bearer " + token },
              },
            )
          ).status(),
        ).toBe(404);
        expect(
          (
            await anonymous.request.post(
              API_URL +
                "/guardian/staff/reports/" +
                report.id +
                "/notifications/whatsapp",
              {
                headers: { Authorization: "Bearer " + token },
                data: { revision: final.revision },
              },
            )
          ).status(),
        ).toBe(403);
      } finally {
        await anonymous.close();
      }
      expect(await prisma.payment.count()).toBe(beforePayments);
    } finally {
      await renterContext.close();
    }
  } finally {
    await prisma.$disconnect();
  }
});
