import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AiOperationsPage from "./page";
import api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn() },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

afterEach(() => vi.clearAllMocks());

const briefing = {
  sampledAt: "2026-11-12T12:00:00Z",
  mode: "MONITOR",
  analysisType: "DETERMINISTIC_AGENCY_RECORDS",
  externalAiUsed: false,
  automatedActionsEnabled: false,
  hasLiveGpsData: false,
  verifiedPaymentStatusUsed: false,
  metrics: {
    vehiclesTotal: 7, vehiclesAvailable: 3, vehiclesMaintenance: 2,
    activeRentals: 4, returnsNext24h: 2, overdueReturns: 1,
    openInvoices: 3, documentsExpiring7d: 2, documentsExpired: 1, urgentTasks: 1,
  },
  signals: [{
    code: "OVERDUE_RETURNS", count: 1, severity: "HIGH",
    source: "Booking", definition: "ACTIVE past endDate",
    reviewPath: "/dashboard/bookings", actionMode: "REVIEW_ONLY",
  }],
  limitations: ["Does not contact customers."],
};

describe("Agency Operations Intelligence monitoring page", () => {
  it("renders verified counts and source-linked review signals; not made-up model results", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: briefing } as never);
    render(<AiOperationsPage />);

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("metrics.vehiclesTotal")).toBeVisible();
    expect(screen.getByText("7")).toBeVisible();
    expect(screen.getByText("signals.OVERDUE_RETURNS")).toBeVisible();
    expect(screen.getByRole("link", { name: "review" })).toHaveAttribute("href", "/dashboard/bookings");
    expect(screen.getByText("safetyDescription")).toBeVisible();
    expect(screen.queryByText("99.9%")).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/ai-operations/briefing");
  });

  it("never substitutes zero or fabricated data on backend errors", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("private-token=not-for-display"));
    render(<AiOperationsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("error");
    expect(screen.queryByText(/private-token/)).not.toBeInTheDocument();
    expect(screen.queryByText("metrics.vehiclesTotal")).not.toBeInTheDocument();
  });

  it("does not invent issues for an empty set of deterministic signals", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...briefing, signals: [] },
    } as never);
    render(<AiOperationsPage />);
    expect(await screen.findByText("noSignals")).toBeVisible();
  });

  it("refreshes a single read-only endpoint without modifying records", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: briefing } as never);
    render(<AiOperationsPage />);
    await screen.findByText("metrics.vehiclesTotal");
    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(Object.keys(vi.mocked(api))).not.toContain("post");
  });
});
