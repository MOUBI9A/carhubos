import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import api from "@/lib/api";
import { GuardianWorkspace } from "./GuardianWorkspace";
import type { GuardianReport } from "./types";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
let report: GuardianReport;
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/portal/inspections?reportId=report-1");
  report = {
    id: "report-1",
    agencyId: "agency-1",
    bookingId: "booking-1",
    carId: "car-1",
    phase: "OUT",
    mode: "QUICK",
    status: "CUSTOMER_REVIEW",
    revision: 7,
    mileage: 2000,
    fuelLevel: 8,
    findings: [],
    evidence: [],
    events: [],
  };
  vi.mocked(api.get).mockImplementation(async (url) => ({
    data: String(url).endsWith("/reports") ? [report] : report,
  }));
  vi.mocked(api.post).mockResolvedValue({ data: {} });
});

describe("Guardian renter revision review", () => {
  it("opens the authenticated report linked from a notification", async () => {
    render(<GuardianWorkspace customer />);
    await screen.findByRole("heading", { name: "Departure condition record" });
    expect(api.get).toHaveBeenCalledWith("/guardian/customer/reports/report-1");
    expect(
      screen.getByRole("button", { name: /Download inspection PDF/ }),
    ).toBeVisible();
  });

  it("clears approval consent after refreshing to a different revision", async () => {
    render(<GuardianWorkspace customer />);
    const checkbox = await screen.findByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    report = { ...report, revision: 8 };
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh this report" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Approve revision 8" }),
      ).toBeDisabled(),
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits only the revision the renter explicitly reviewed", async () => {
    render(<GuardianWorkspace customer />);
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Approve revision 7" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/guardian/customer/reports/report-1/approve",
        { revision: 7 },
      ),
    );
  });
});
