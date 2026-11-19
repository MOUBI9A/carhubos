import { expect, test, type Page } from "@playwright/test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Real browser + tus-js-client against a local mocked TUS protocol. This is not Supabase acceptance proof. */
test("Guardian video: signed chunks resume after interruption and reload, then finalize or cancel", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const directory = await mkdtemp(join(tmpdir(), "guardian-video-protocol-"));
  const fixture = join(directory, "walkaround.mp4");
  const size = 40 * 1024 * 1024;
  const chunkSize = 6 * 1024 * 1024;
  const bytes = Buffer.alloc(size);
  bytes.write("ftypisom", 4, "ascii");
  await writeFile(fixture, bytes);
  const endpoint =
    "https://guardian-tus-qa.invalid/storage/v1/upload/resumable";
  const signature = "qa-signed-token-memory-only";
  const report = {
    id: "qa-report",
    agencyId: "qa-agency",
    bookingId: "qa-booking",
    carId: "qa-car",
    phase: "OUT",
    mode: "FULL",
    status: "DRAFT",
    revision: 3,
    mileage: 2000,
    fuelLevel: 8,
    findings: [],
    evidence: [] as unknown[],
    events: [],
  };
  let pending: Record<string, unknown>[] = [];
  let intentCount = 0;
  let finalizeCount = 0;
  let canceled = false;
  let allowPatches = false;
  let currentOffset = 0;
  const offsets: { method: string; offset: number; size: number }[] = [];
  const headOffsets: number[] = [];
  const signedRequests: {
    method: string;
    signature?: string;
    authorization?: string;
    upsert?: string;
    cookie?: string;
  }[] = [];
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,HEAD,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers":
      "Tus-Resumable,Upload-Length,Upload-Metadata,Upload-Offset,Content-Type,x-signature",
    "access-control-expose-headers":
      "Location,Upload-Offset,Upload-Length,Tus-Resumable",
    "tus-resumable": "1.0.0",
  };
  await page.route("**/api/guardian/staff/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let data: unknown = report;
    if (pathname.endsWith("/booking/qa-booking")) data = [report];
    else if (pathname.endsWith("/active-damage")) data = [];
    else if (pathname.endsWith("/upload-intents")) {
      if (method === "GET") data = pending;
      else {
        intentCount++;
        currentOffset = 0;
        const body = route.request().postDataJSON();
        expect(body).toEqual({
          revision: report.revision,
          kind: "VIDEO",
          filename: "walkaround.mp4",
          mimeType: "video/mp4",
          expectedSizeBytes: size,
        });
        data = {
          id: "qa-intent-" + intentCount,
          reportId: report.id,
          revisionAtInit: report.revision,
          storagePath: "qa-private/" + intentCount + ".mp4",
          filename: "walkaround.mp4",
          mimeType: "video/mp4",
          expectedSizeBytes: size,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: "PENDING",
        };
        pending = [data as Record<string, unknown>];
        data = {
          ...(data as object),
          endpoint,
          bucketName: "qa-private",
          token: signature,
        };
      }
    } else if (pathname.endsWith("/resume"))
      data = {
        ...pending[0],
        endpoint,
        bucketName: "qa-private",
        token: signature,
      };
    else if (pathname.endsWith("/finalize")) {
      expect(currentOffset).toBe(size);
      finalizeCount++;
      report.revision++;
      pending = [];
      data = {
        id: "qa-evidence",
        kind: "VIDEO",
        sha256: "mock-verification-only",
        sizeBytes: size,
        revision: report.revision,
      };
    } else if (pathname.endsWith("/cancel")) {
      canceled = true;
      pending = [];
      data = { status: "CANCELED" };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.route(endpoint + "**", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    const headers = request.headers();
    signedRequests.push({
      method,
      signature: headers["x-signature"],
      authorization: headers.authorization,
      upsert: headers["x-upsert"],
      cookie: headers.cookie,
    });
    if (method === "HEAD") {
      headOffsets.push(currentOffset);
      return route.fulfill({
        status: 200,
        headers: {
          ...cors,
          "upload-offset": String(currentOffset),
          "upload-length": String(size),
        },
      });
    }
    if (method === "PATCH" && !allowPatches) return route.abort("failed");
    const body = request.postDataBuffer();
    const length = body?.byteLength ?? 0;
    const offset = Number(headers["upload-offset"] ?? 0);
    expect(length).toBeLessThanOrEqual(chunkSize);
    expect(length).toBeGreaterThan(0);
    if (method === "POST") {
      expect(headers["upload-length"]).toBe(String(size));
      const metadata = Object.fromEntries(
        headers["upload-metadata"].split(",").map((value) => {
          const [key, encoded] = value.trim().split(" ");
          return [key, Buffer.from(encoded, "base64").toString()];
        }),
      );
      expect(metadata).toEqual({
        bucketName: "qa-private",
        objectName: "qa-private/" + intentCount + ".mp4",
        contentType: "video/mp4",
      });
      currentOffset = length;
    } else {
      expect(method).toBe("PATCH");
      expect(offset).toBe(currentOffset);
      currentOffset += length;
    }
    offsets.push({ method, offset, size: length });
    await route.fulfill({
      status: method === "POST" ? 201 : 204,
      headers: {
        ...cors,
        location: endpoint + "/qa-upload-" + intentCount,
        "upload-offset": String(currentOffset),
      },
    });
  });
  async function openReport(target: Page) {
    await target.goto("/dashboard/guardian");
    await target
      .getByRole("textbox", { name: "Booking ID" })
      .fill("qa-booking");
    await target.getByRole("button", { name: /Look up booking/ }).click();
    await target.getByRole("button", { name: /Departure · Draft/ }).click();
    await expect(
      target.getByRole("heading", { name: "Evidence locker" }),
    ).toBeVisible();
  }
  try {
    await openReport(page);
    await page.getByLabel("MP4 video file").setInputFiles(fixture);
    await page
      .getByRole("button", { name: "Upload video", exact: true })
      .click();
    await expect.poll(() => currentOffset).toBe(chunkSize);
    await page.getByRole("button", { name: "Pause transfer" }).click();
    await expect(page.getByText(/Transfer paused/)).toBeVisible();
    expect(finalizeCount).toBe(0);
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).toContain("guardian-tus:v1:qa-intent-1:");
    expect(stored).not.toContain(signature);
    expect(stored).not.toContain("x-signature");
    await openReport(page); // Full navigation remounts the client and drops the in-memory signature.
    await page.getByRole("button", { name: "Select pending video" }).click();
    await expect(
      page.getByRole("button", { name: "Resume selected video" }),
    ).toBeDisabled();
    await page.getByLabel("Reselect original MP4 video").setInputFiles(fixture);
    allowPatches = true;
    await page.getByRole("button", { name: "Resume selected video" }).click();
    await expect(
      page.getByText("Video verified and saved as inspection evidence."),
    ).toBeVisible({ timeout: 30_000 });
    expect(finalizeCount).toBe(1);
    expect(headOffsets).toContain(chunkSize);
    expect(offsets.filter((item) => item.method === "POST")).toHaveLength(1);
    expect(
      offsets.some(
        (item) => item.method === "PATCH" && item.offset === chunkSize,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("guardian-tus:v1:qa-intent-1:");
    await expect(page.getByText("Full inspection · Revision 4")).toBeVisible();
    // A second pending transfer can be canceled without becoming evidence.
    allowPatches = false;
    await page.getByLabel("MP4 video file").setInputFiles(fixture);
    await page
      .getByRole("button", { name: "Upload video", exact: true })
      .click();
    await expect.poll(() => intentCount).toBe(2);
    await expect.poll(() => currentOffset).toBe(chunkSize);
    await page.getByRole("button", { name: "Cancel pending video" }).click();
    await expect(page.getByText(/Pending upload canceled/)).toBeVisible();
    expect(canceled).toBe(true);
    expect(finalizeCount).toBe(1);
    for (const request of signedRequests) {
      expect(request.signature).toBe(signature);
      expect(request.authorization).toBeUndefined();
      expect(request.upsert).toBeUndefined();
      expect(request.cookie).toBeUndefined();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
