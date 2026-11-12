import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Actual browser -> local HTTP TUS server with real binary POST/HEAD/PATCH
 * transport. Unlike Playwright route.fulfill(), this exercises the wire
 * protocol. It does NOT validate Supabase's hosted signed-TUS implementation.
 */
test("Guardian video: real HTTP TUS transfer resumes after page reload and preserves bytes", async ({
  page,
}) => {
  test.setTimeout(100_000);
  const temp = await mkdtemp(join(tmpdir(), "guardian-tus-wire-"));
  const fixturePath = join(temp, "walkaround.mp4");
  const size = 12 * 1024 * 1024;
  const chunkBytes = 6 * 1024 * 1024;
  const bytes = Buffer.alloc(size, 0x42);
  bytes.writeUInt32BE(20, 0);
  bytes.write("ftypisom", 4, "ascii");
  await writeFile(fixturePath, bytes);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const signature = "local-qa-signed-token";
  const received: Buffer[] = [];
  const offsets: number[] = [];
  const headOffsets: number[] = [];
  const authOk: boolean[] = [];
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "OPTIONS,POST,HEAD,PATCH",
    "access-control-allow-headers":
      "Tus-Resumable,Upload-Length,Upload-Metadata,Upload-Offset,Content-Type,x-signature",
    "access-control-expose-headers":
      "Location,Upload-Offset,Upload-Length,Tus-Resumable",
    "tus-resumable": "1.0.0",
  };
  let allowPatch = false;
  let offset = 0;
  let postCount = 0;
  let endpoint = "";
  const server = createServer(async (req, res) => {
    const method = req.method ?? "";
    if (method === "OPTIONS") {
      res.writeHead(204, cors).end();
      return;
    }
    authOk.push(
      req.headers["x-signature"] === signature &&
        !req.headers.authorization &&
        !req.headers.cookie &&
        !req.headers["x-upsert"],
    );
    if (method === "HEAD") {
      headOffsets.push(offset);
      res.writeHead(200, {
        ...cors,
        "upload-offset": String(offset),
        "upload-length": String(size),
      }).end();
      return;
    }
    if (method === "PATCH" && !allowPatch) {
      res.writeHead(503, cors).end();
      return;
    }
    if (method !== "POST" && method !== "PATCH") {
      res.writeHead(405, cors).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    if (body.length > chunkBytes || body.length === 0) {
      res.writeHead(413, cors).end();
      return;
    }
    if (method === "POST") {
      postCount++;
      let metadata: Record<string, string> = {};
      try {
        metadata = Object.fromEntries(
          String(req.headers["upload-metadata"] ?? "")
            .split(",")
            .map((item) => {
              const [key, encoded] = item.trim().split(" ");
              return [key, Buffer.from(encoded, "base64").toString("utf8")];
            }),
        );
      } catch {
        res.writeHead(400, cors).end();
        return;
      }
      if (
        req.headers["upload-length"] !== String(size) ||
        req.headers["tus-resumable"] !== "1.0.0" ||
        metadata.bucketName !== "private-qa" ||
        metadata.objectName !== intent.storagePath ||
        metadata.contentType !== "video/mp4" ||
        offset !== 0
      ) {
        res.writeHead(400, cors).end();
        return;
      }
    } else {
      const requested = Number(req.headers["upload-offset"]);
      if (requested !== offset) {
        res.writeHead(409, cors).end();
        return;
      }
      offsets.push(offset);
    }
    received.push(body);
    offset += body.length;
    res.writeHead(method === "POST" ? 201 : 204, {
      ...cors,
      location: endpoint + "/upload-id",
      "upload-offset": String(offset),
    }).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/storage/v1/upload/resumable`;

  const report = {
    id: "qa-report-wire",
    agencyId: "qa-agency-wire",
    bookingId: "qa-booking-wire",
    carId: "qa-car-wire",
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
  const intent = {
    id: "qa-wire-intent",
    reportId: report.id,
    revisionAtInit: report.revision,
    storagePath: "qa-agency-wire/guardian/qa-report-wire/123e4567-e89b-42d3-a456-426614174000.mp4",
    filename: "walkaround.mp4",
    mimeType: "video/mp4",
    expectedSizeBytes: size,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    status: "PENDING",
  };
  let pending: unknown[] = [];
  let finalizeCalls = 0;
  await page.route("**/api/guardian/staff/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let data: unknown = report;
    if (pathname.endsWith("/booking/qa-booking-wire")) data = [report];
    else if (pathname.endsWith("/active-damage")) data = [];
    else if (pathname.endsWith("/upload-intents")) {
      if (route.request().method() === "GET") data = pending;
      else {
        pending = [intent];
        data = { ...intent, bucketName: "private-qa", endpoint, token: signature };
      }
    } else if (pathname.endsWith("/resume")) {
      data = { ...intent, bucketName: "private-qa", endpoint, token: signature };
    } else if (pathname.endsWith("/finalize")) {
      expect(offset).toBe(size);
      const stored = Buffer.concat(received);
      expect(createHash("sha256").update(stored).digest("hex")).toBe(checksum);
      expect(stored.equals(bytes)).toBe(true);
      finalizeCalls++;
      pending = [];
      report.revision++;
      data = { id: "qa-evidence-wire", kind: "VIDEO", sha256: checksum };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });

  async function openReport(target: Page) {
    await target.goto("/dashboard/guardian");
    await target
      .getByRole("textbox", { name: "Booking ID" })
      .fill("qa-booking-wire");
    await target.getByRole("button", { name: /Look up booking/ }).click();
    await target.getByRole("button", { name: /Departure · Draft/ }).click();
    await expect(target.getByRole("heading", { name: "Evidence locker" })).toBeVisible();
  }

  try {
    await openReport(page);
    await page.getByLabel("MP4 video file").setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Upload video", exact: true }).click();
    await expect.poll(() => offset, { timeout: 20_000 }).toBe(chunkBytes);
    await page.getByRole("button", { name: "Pause transfer" }).click();
    await expect(page.getByText(/Transfer paused/)).toBeVisible();
    expect(finalizeCalls).toBe(0);
    const storedBefore = await page.evaluate(() => JSON.stringify(localStorage));
    expect(storedBefore).toContain("guardian-tus:v1:qa-wire-intent:");
    expect(storedBefore).not.toContain(signature);

    await openReport(page);
    await page.getByRole("button", { name: "Select pending video" }).click();
    await page.getByLabel("Reselect original MP4 video").setInputFiles(fixturePath);
    allowPatch = true;
    await page.getByRole("button", { name: "Resume selected video" }).click();
    await expect(
      page.getByText("Video verified and saved as inspection evidence."),
    ).toBeVisible({ timeout: 35_000 });
    expect(finalizeCalls).toBe(1);
    expect(postCount).toBe(1);
    expect(headOffsets).toContain(chunkBytes);
    expect(offsets).toContain(chunkBytes);
    expect(authOk.length).toBeGreaterThan(1);
    expect(authOk.every(Boolean)).toBe(true);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
      "guardian-tus:v1:qa-wire-intent:",
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
    await new Promise<void>((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    });
  }
});
