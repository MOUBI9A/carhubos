import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutomotiveOperationalPulse } from "./AutomotiveOperationalPulse";

const metrics = {
  waitingVehicles: 1,
  diagnosticsNeedingReview: 0,
  activeRepairs: 2,
  blockedJobs: 0,
  readyForQc: 1,
  awaitingApproval: 0,
  completedThisMonth: 3,
  criticalIssuesCount: 0,
};

function mockPulse(predictive: unknown) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes("/work-orders/metrics/summary") ? metrics : predictive,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("AutomotiveOperationalPulse production API response", () => {
  it("renders maintenance cost and accurate counters from the real backend response", async () => {
    const fetchMock = mockPulse({
      totalVehicles: 13,
      healthyCount: 6,
      attentionCount: 5,
      criticalCount: 2,
      projected30DayCostMad: 12345.5,
      urgentItemsCount: 7,
      vehiclesRequiringAttention: [],
    });

    render(<AutomotiveOperationalPulse />);

    expect(await screen.findByText("Estimated 30-Day Budget")).toBeVisible();
    expect(screen.getByText(/13 fleet vehicles tracked/)).toBeVisible();
    expect(screen.getByText(/2 critical/)).toBeVisible();
    expect(screen.getByText(/5 need attention/)).toBeVisible();
    const cost = (12345.5).toLocaleString('fr-MA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(screen.getByText(`${cost} MAD`)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/maintenance/predictive-overview",
      { credentials: "include" },
    );
  });

  it("does not crash when a server responds with an obsolete or incomplete contract", async () => {
    mockPulse({
      totalAssets: 13,
      overdueAssets: 2,
      dueSoonAssets: 5,
      // This was the stale frontend contract: forecast30DaysMad, not
      // the backend's projected30DayCostMad.
      forecast30DaysMad: undefined,
    });

    render(<AutomotiveOperationalPulse />);
    expect(await screen.findByText("Automotive Workshop & Fleet Pulse")).toBeVisible();
    expect(screen.getByText("Waiting in Bay")).toBeVisible();
    expect(screen.queryByText("Estimated 30-Day Budget")).not.toBeInTheDocument();
  });

  it("shows a legitimate zero budget without throwing or hiding the forecast", async () => {
    mockPulse({
      totalVehicles: 0,
      attentionCount: 0,
      criticalCount: 0,
      projected30DayCostMad: 0,
    });
    render(<AutomotiveOperationalPulse />);
    expect(await screen.findByText("Estimated 30-Day Budget")).toBeVisible();
    expect(screen.getByText(/0,00 MAD/)).toBeVisible();
  });
});
