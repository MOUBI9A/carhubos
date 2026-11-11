import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import api from "@/lib/api";
import { ReportActions } from "./ReportActions";
import type { GuardianReport } from "./types";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const report: GuardianReport = {
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

describe("Guardian PDF and controlled WhatsApp actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      data: { recipient: "••••1234", state: "READY" },
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads an authenticated PDF for the renter without exposing notification controls", async () => {
    const blob = new Blob(["%PDF-1.7\n"], { type: "application/pdf" });
    vi.mocked(api.get).mockResolvedValue({
      data: blob,
      headers: { "content-type": "application/pdf" },
    });
    const create = vi.fn(() => "blob:private-pdf");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: create,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<ReportActions report={report} customer />);
    fireEvent.click(
      screen.getByRole("button", { name: /Download inspection PDF/ }),
    );
    await screen.findByText(/PDF downloaded/);
    expect(api.get).toHaveBeenCalledWith(
      "/guardian/customer/reports/report-1/pdf",
      expect.objectContaining({ responseType: "blob" }),
    );
    expect(create).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: /WhatsApp/ }),
    ).not.toBeInTheDocument();
  });

  it("rejects a non-PDF response without claiming a download", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: new Blob(["{}"]),
      headers: { "content-type": "application/json" },
    });
    render(<ReportActions report={report} customer />);
    fireEvent.click(
      screen.getByRole("button", { name: /Download inspection PDF/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "did not return a PDF",
    );
    expect(screen.queryByText(/PDF downloaded/)).not.toBeInTheDocument();
  });

  it("requires explicit customer confirmation and sends only report revision", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { state: "PROVIDER_ACCEPTED", revision: 7 },
    });
    render(<ReportActions report={report} customer={false} />);
    const send = await screen.findByRole("button", {
      name: /Send report via WhatsApp/,
    });
    expect(send).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(send);
    await screen.findByText(/Twilio accepted the request/);
    expect(api.post).toHaveBeenCalledWith(
      "/guardian/staff/reports/report-1/notifications/whatsapp",
      { revision: 7 },
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Delivery and reading are not confirmed",
    );
  });

  it.each([
    ["SIMULATED", "Simulation only. No WhatsApp message was sent."],
    [
      "UNCONFIGURED",
      "WhatsApp is not configured for this agency. No message was sent.",
    ],
    ["FAILED", "The WhatsApp request failed. Delivery is not confirmed."],
    [
      "IN_PROGRESS",
      "A request is already in progress or its outcome is unknown.",
    ],
  ])("shows the truthful %s outcome", async (state, text) => {
    vi.mocked(api.post).mockResolvedValue({ data: { state, revision: 7 } });
    render(<ReportActions report={report} customer={false} />);
    const send = await screen.findByRole("button", {
      name: /Send report via WhatsApp/,
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(send);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(text),
    );
  });

  it("hides send when server denies capability", async () => {
    vi.mocked(api.get).mockRejectedValue({
      response: { data: { message: "Missing booking.manage" }, status: 403 },
    });
    render(<ReportActions report={report} customer={false} />);
    await screen.findByText(/Missing booking.manage/);
    expect(
      screen.queryByRole("button", { name: /Send report via WhatsApp/ }),
    ).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("distinguishes an unknown provider outcome from a confirmed rejection", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { state: "FAILED", revision: 7, acceptanceUnknown: true } });
    render(<ReportActions report={report} customer={false} />);
    const send = await screen.findByRole("button", { name: /Send report via WhatsApp/ });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(send);
    expect(await screen.findByText(/The provider outcome is unknown/)).toHaveTextContent("Do not resend automatically");
  });

  it("does not offer notifications for unpublished drafts", () => {
    render(
      <ReportActions
        report={{ ...report, status: "DRAFT" }}
        customer={false}
      />,
    );
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("surfaces stale revision rejection without a success message", async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { message: "Refresh report revision" }, status: 409 },
    });
    render(<ReportActions report={report} customer={false} />);
    const send = await screen.findByRole("button", {
      name: /Send report via WhatsApp/,
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(send);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Refresh report revision",
    );
    expect(screen.queryByText(/Twilio accepted/)).not.toBeInTheDocument();
  });
});
