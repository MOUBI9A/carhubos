import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AiGovernanceSettingsPage from "./page";
import api from "@/lib/api";

const auth = vi.hoisted(() => ({ role: "OWNER" }));
const translations = vi.hoisted(() => (key: string) => key);

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));
vi.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ role: auth.role }),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => translations,
}));

const settings = {
  requestedEnabled: false,
  canEdit: true,
  preferredLanguage: "EN",
  monthlyBudgetUsdCents: 0,
  monthlyRequestLimit: 0,
  revision: 0,
  platformApproved: false,
  effectiveEnabled: false,
  humanApprovalRequired: true,
  autonomousActionsAllowed: false,
  actionMode: "MONITOR",
  status: "OFF",
};
const usage = {
  periodStart: "2026-11-01T00:00:00.000Z",
  recordedRequests: 0,
  inputTokens: 0,
  outputTokens: 0,
  recordedCostUsdMicros: 0,
};

function mockLoads() {
  vi.mocked(api.get).mockImplementation(async (path: string) => ({
    data: path.endsWith("/settings") ? settings : usage,
  } as never));
}

afterEach(() => {
  vi.clearAllMocks();
  auth.role = "OWNER";
});

describe("AI governance settings (model-off by default)", () => {
  it("loads settings and zero recorded usage without enabling AI", async () => {
    mockLoads();
    render(<AiGovernanceSettingsPage />);
    expect(await screen.findByText("disabled")).toBeVisible();
    expect(screen.getByText("safetyDetails")).toBeVisible();
    expect(screen.getByLabelText("optIn")).not.toBeChecked();
    expect(screen.getByText("usageNote")).toBeVisible();
    expect(api.get).toHaveBeenCalledWith("/ai-operations/settings");
    expect(api.get).toHaveBeenCalledWith("/ai-operations/usage");
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("saves only permitted settings with the expected revision; cannot approve itself", async () => {
    mockLoads();
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { ...settings, requestedEnabled: true, revision: 1 },
    } as never);
    render(<AiGovernanceSettingsPage />);
    await screen.findByText("disabled");
    fireEvent.click(screen.getByLabelText("optIn"));
    fireEvent.change(screen.getByLabelText("language"), { target: { value: "FR" } });
    fireEvent.change(screen.getByLabelText("monthlyRequests"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("monthlyBudget"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/ai-operations/settings", {
      expectedRevision: 0,
      requestedEnabled: true,
      preferredLanguage: "FR",
      monthlyBudgetUsdCents: 1000,
      monthlyRequestLimit: 15,
    }));
    expect(await screen.findByText("saved")).toBeVisible();
    expect(screen.getByText("disabled")).toBeVisible();
    const sent = vi.mocked(api.patch).mock.calls[0][1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("platformApproved");
    expect(sent).not.toHaveProperty("autonomousActionsAllowed");
    expect(sent).not.toHaveProperty("apiKey");
  });

  it("allows managers to read but never to mutate tenant AI settings", async () => {
    auth.role = "MANAGER";
    mockLoads();
    render(<AiGovernanceSettingsPage />);
    await screen.findByText("disabled");
    expect(screen.getByText("ownerOnly")).toBeVisible();
    expect(screen.queryByRole("button", { name: "save" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("optIn")).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("respects a server-side revoked settings.manage capability for an Owner", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => ({
      data: path.endsWith("/settings") ? { ...settings, canEdit: false } : usage,
    } as never));
    render(<AiGovernanceSettingsPage />);
    await screen.findByText("disabled");
    expect(screen.getByText("ownerOnly")).toBeVisible();
    expect(screen.queryByRole("button", { name: "save" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("optIn")).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("does not invent settings or usage on API failure", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("secret-token-wrong"));
    render(<AiGovernanceSettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("loadError");
    expect(screen.queryByText("secret-token-wrong")).not.toBeInTheDocument();
    expect(screen.queryByText("usageTitle")).not.toBeInTheDocument();
  });

  it("rejects invalid budget entries without sending a request", async () => {
    mockLoads();
    render(<AiGovernanceSettingsPage />);
    await screen.findByText("disabled");
    fireEvent.change(screen.getByLabelText("monthlyBudget"), { target: { value: "1000.5" } });
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("invalid");
    expect(api.patch).not.toHaveBeenCalled();
  });
});
