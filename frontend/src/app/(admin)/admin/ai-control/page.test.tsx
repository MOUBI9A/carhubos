import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AiPlatformControlPage from "./page";
import api from "@/lib/api";

const auth = vi.hoisted(() => ({ role: "ROOT_ADMIN" }));
const translations = vi.hoisted(() => (key: string) => key);

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));
vi.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ role: auth.role }),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => translations,
}));

const policy = {
  emergencyDisabled: true,
  revision: 1,
  effectiveInferenceEnabled: false,
  providerIntegrationReady: false,
};
const requests = [{
  agencyId: "agency-a",
  requestedEnabled: true,
  platformApproved: false,
  revision: 1,
  preferredLanguage: "EN",
  monthlyBudgetUsdCents: 2000,
  monthlyRequestLimit: 20,
  agency: { name: "Demo Agency", status: "ACTIVE", aiPlatformReviews: [] },
}];

function mockLoads() {
  vi.mocked(api.get).mockImplementation(async (path: string) => ({
    data: path.endsWith("/policy") ? policy : requests,
  } as never));
}

afterEach(() => {
  vi.clearAllMocks();
  auth.role = "ROOT_ADMIN";
});

describe("Founder-only platform AI governance", () => {
  it("shows default-emergency switch, opt-in requests and explicit no-model warning", async () => {
    mockLoads();
    render(<AiPlatformControlPage />);
    expect(await screen.findByText("switchLocked")).toBeVisible();
    expect(screen.getByText("noModel")).toBeVisible();
    expect(screen.getByText("requestsTitle")).toBeVisible();
    expect(screen.getByRole("button", { name: "clearEmergency" })).toBeDisabled();
    expect(api.get).toHaveBeenCalledWith("/saas-admin/ai-control/policy");
    expect(api.get).toHaveBeenCalledWith("/saas-admin/ai-control/requests");
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("records emergency clear only with reason and expected revision; never advertises a model", async () => {
    mockLoads();
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { ...policy, revision: 2, emergencyDisabled: false },
    } as never);
    render(<AiPlatformControlPage />);
    await screen.findByText("switchLocked");
    fireEvent.change(screen.getByLabelText("reason"), {
      target: { value: "Founder reviewed the complete shutdown checklist." },
    });
    fireEvent.click(screen.getByRole("button", { name: "clearEmergency" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      "/saas-admin/ai-control/policy",
      {
        expectedRevision: 1,
        emergencyDisabled: false,
        reason: "Founder reviewed the complete shutdown checklist.",
      },
    ));
    expect(await screen.findByText("policySaved")).toBeVisible();
    expect(screen.getByText("noModel")).toBeVisible();
    expect(screen.getByText("switchCleared")).toBeVisible();
  });

  it("records agency review for an opted-in, capped tenant without any other mutations", async () => {
    mockLoads();
    vi.mocked(api.patch).mockResolvedValueOnce({ data: {
      agencyId: "agency-a", platformApproved: true, decision: "APPROVE", revision: 2,
      effectiveInferenceEnabled: false,
    } } as never);
    render(<AiPlatformControlPage />);
    await screen.findByText("switchLocked");
    fireEvent.change(screen.getByLabelText("selectAgency"), {
      target: { value: "agency-a" },
    });
    expect(screen.getAllByText("Demo Agency").length).toBeGreaterThan(0);
    fireEvent.change(screen.getAllByLabelText("reason")[1], {
      target: { value: "Confirmed agency opt in and safe request caps." },
    });
    fireEvent.click(screen.getByRole("button", { name: "approve" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      "/saas-admin/ai-control/agencies/agency-a/review",
      {
        expectedRevision: 1,
        approve: true,
        reason: "Confirmed agency opt in and safe request caps.",
      },
    ));
    expect(screen.getByText("noModel")).toBeVisible();
    expect(await screen.findByText("reviewSaved")).toBeVisible();
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  it("records a reasoned rejection even for an unapproved request", async () => {
    mockLoads();
    vi.mocked(api.patch).mockResolvedValueOnce({ data: {
      agencyId: "agency-a", platformApproved: false, decision: "REJECT",
      revision: 2, effectiveInferenceEnabled: false,
    } } as never);
    render(<AiPlatformControlPage />);
    await screen.findByText("switchLocked");
    fireEvent.change(screen.getByLabelText("selectAgency"), {
      target: { value: "agency-a" },
    });
    fireEvent.change(screen.getAllByLabelText("reason")[1], {
      target: { value: "Agency has not completed the required verification." },
    });
    fireEvent.click(screen.getByRole("button", { name: "reject" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      "/saas-admin/ai-control/agencies/agency-a/review",
      {
        expectedRevision: 1, approve: false,
        reason: "Agency has not completed the required verification.",
      },
    ));
    expect(await screen.findByText("rejected", { exact: false })).toBeVisible();
    expect(screen.getByText("noModel")).toBeVisible();
  });

  it("never requests platform policy for an unauthorized role", () => {
    auth.role = "MANAGER";
    render(<AiPlatformControlPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("forbidden");
    expect(api.get).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("does not expose a saved state or server secrets after HTTP errors", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("connection-token-secret"));
    render(<AiPlatformControlPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("loadError");
    expect(screen.queryByText("connection-token-secret")).not.toBeInTheDocument();
    expect(screen.queryByText("switchLocked")).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("rejects short reasons and does not enable approve without a selected agency", async () => {
    mockLoads();
    render(<AiPlatformControlPage />);
    await screen.findByText("switchLocked");
    fireEvent.change(screen.getByLabelText("reason"), { target: { value: "short" } });
    expect(screen.getByRole("button", { name: "clearEmergency" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "approve" })).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
