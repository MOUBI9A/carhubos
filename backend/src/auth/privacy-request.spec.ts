process.env.JWT_SECRET = "test-jwt-secret-fixed-2026";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuthService } from "./auth.service";
import { PrivacyRequestDto } from "./dto/auth.dto";

describe("authenticated data-rights intake", () => {
  const recorded = {
    id: "request-1",
    type: "ACCESS",
    status: "PENDING",
    createdAt: new Date("2026-11-12T10:00:00Z"),
  };

  function setup(userFound = true) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(userFound ? { id: "user-1" } : null),
      },
      privacyRequest: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(recorded),
        findMany: jest.fn().mockResolvedValue([recorded]),
      },
    };
    const svc = new AuthService(
      {} as never,
      {} as never,
      prisma as never,
    );
    return { svc, prisma };
  }

  it.each(["ACCESS", "RECTIFICATION", "ERASURE", "OPPOSITION"])(
    "accepts %s, without a free-text reason",
    async (type) => {
      const dto = plainToInstance(PrivacyRequestDto, { type });
      expect(await validate(dto)).toHaveLength(0);
      expect(Object.keys(dto)).toEqual(["type"]);
    },
  );

  it.each(["DATA", "DELETE_ACCOUNT", "", "RENAME"])(
    "rejects unsupported type %s", async (type) => {
      const dto = plainToInstance(PrivacyRequestDto, { type });
      expect((await validate(dto)).some((error) => error.property === "type")).toBe(true);
    },
  );

  it("records an idempotent request scoped to the signed-in user", async () => {
    const { svc, prisma } = setup();
    await expect(svc.submitPrivacyRequest("user-1", "ACCESS")).resolves.toEqual(recorded);
    expect(prisma.privacyRequest.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", type: "ACCESS" }],
      skipDuplicates: true,
    });
    expect(prisma.privacyRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", type: "ACCESS", status: { in: ["PENDING", "IN_REVIEW"] } },
      }),
    );
  });

  it("never records a request for a nonexistent user", async () => {
    const { svc, prisma } = setup(false);
    await expect(svc.submitPrivacyRequest("unknown", "ERASURE")).rejects.toThrow("User not found");
    expect(prisma.privacyRequest.createMany).not.toHaveBeenCalled();
  });

  it("returns an already-in-review request rather than creating another open request", async () => {
    const { svc, prisma } = setup();
    prisma.privacyRequest.createMany.mockResolvedValue({ count: 0 });
    prisma.privacyRequest.findFirst.mockResolvedValue({
      ...recorded, status: "IN_REVIEW",
    });
    await expect(svc.submitPrivacyRequest("user-1", "ACCESS")).resolves.toEqual(
      expect.objectContaining({ status: "IN_REVIEW" }),
    );
  });

  it("returns only requests belonging to that signed-in user", async () => {
    const { svc, prisma } = setup();
    await expect(svc.listMyPrivacyRequests("user-1")).resolves.toEqual([recorded]);
    expect(prisma.privacyRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        take: 30,
      }),
    );
  });

  it("does not falsely claim a pending request was processed", async () => {
    const { svc, prisma } = setup();
    prisma.privacyRequest.createMany.mockResolvedValue({ count: 0 });
    await expect(svc.submitPrivacyRequest("user-1", "ACCESS")).resolves.toEqual(
      expect.objectContaining({ status: "PENDING" }),
    );
  });
});
