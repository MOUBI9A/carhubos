import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyRequestPanel from "./PrivacyRequestPanel";
import api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

afterEach(() => vi.clearAllMocks());

describe("non-destructive data-rights requests", () => {
  it("lists only returned requests and does not collect sensitive free-text or files", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{
        id: "request-1", type: "ACCESS", status: "PENDING",
        createdAt: "2026-11-12", closedAt: null,
      }],
    } as never);
    render(<PrivacyRequestPanel />);
    expect(await screen.findByText("En attente")).toBeVisible();
    expect(screen.getByLabelText("Type de demande")).toBeVisible();
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
    render(<PrivacyRequestPanel />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Enregistrer ma demande" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Type de demande"), { target: { value: "ERASURE" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer ma demande" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/auth/privacy-requests", { type: "ERASURE" },
    ));
    expect(await screen.findByText(/Aucun document n'a été supprimé/)).toBeVisible();
  });

  it("reports a safe error without exposing raw server response", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] } as never);
    vi.mocked(api.post).mockRejectedValueOnce(new Error("private-key=do-not-display"));
    render(<PrivacyRequestPanel />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Enregistrer ma demande" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer ma demande" }));
    expect(await screen.findByText(/n'a pas pu être enregistrée/)).toBeVisible();
    expect(screen.queryByText(/private-key/)).not.toBeInTheDocument();
  });
});
