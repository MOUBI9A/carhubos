import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyRequestPanel from "./PrivacyRequestPanel";
import api from "@/lib/api";
import messages from "../../../../messages/en.json";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PrivacyRequestPanel />
    </NextIntlClientProvider>,
  );
}

describe("non-destructive data-rights requests", () => {
  it("lists only returned requests and does not collect sensitive free-text or files", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{
        id: "request-1", type: "ACCESS", status: "PENDING",
        createdAt: "2026-11-12", closedAt: null,
      }],
    } as never);
    renderPanel();
    expect(await screen.findByText("Pending")).toBeVisible();
    expect(screen.getByLabelText("Request type")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(api.get).toHaveBeenCalledWith("/auth/privacy-requests");
  });

  it("creates a typed request with no personal-data payload", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] } as never);
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: "request-2", type: "ERASURE", status: "PENDING",
        createdAt: "2026-11-12", closedAt: null,
      },
    } as never);
    renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit request" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Request type"), { target: { value: "ERASURE" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/auth/privacy-requests", { type: "ERASURE" },
    ));
    expect(await screen.findByText(/No document was deleted/)).toBeVisible();
  });

  it("reports a safe error without exposing raw server response", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] } as never);
    vi.mocked(api.post).mockRejectedValueOnce(new Error("private-key=do-not-display"));
    renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit request" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText(/could not be recorded/)).toBeVisible();
    expect(screen.queryByText(/private-key/)).not.toBeInTheDocument();
  });
});
