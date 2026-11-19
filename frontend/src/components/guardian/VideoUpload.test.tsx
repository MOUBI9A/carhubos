import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import api from "@/lib/api";
import { VideoUpload } from "./VideoUpload";
import {
  forgetVideoResume,
  prepareVideoUpload,
  VIDEO_CHUNK_BYTES,
  type SignedVideoIntent,
} from "./guardianVideoUpload";
import type { GuardianReport } from "./types";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("./guardianVideoUpload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./guardianVideoUpload")>()),
  prepareVideoUpload: vi.fn(),
  forgetVideoResume: vi.fn(),
}));
const report = {
  id: "report-1",
  revision: 3,
  status: "DRAFT",
} as GuardianReport;
const base = "/guardian/staff/reports/report-1/upload-intents";
let descriptor: SignedVideoIntent;
let transfer: {
  file?: File;
  options: object;
  abort: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
};
let callbacks: Parameters<typeof prepareVideoUpload>[2];
const video = () =>
  new File([new Uint8Array(40 * 1048576)], "walk.mp4", { type: "video/mp4" });
const selectFile = (name: string, file = video()) =>
  fireEvent.change(screen.getByLabelText(name), { target: { files: [file] } });
beforeEach(() => {
  vi.clearAllMocks();
  descriptor = {
    id: "intent-1",
    reportId: report.id,
    revisionAtInit: 3,
    storagePath: "private/random.mp4",
    filename: "walk.mp4",
    mimeType: "video/mp4",
    expectedSizeBytes: 40 * 1048576,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    status: "PENDING",
    endpoint: "https://storage.invalid/upload/resumable",
    bucketName: "private",
    token: "NEVER-RENDER-SIGNED-TOKEN",
  };
  transfer = {
    options: {},
    abort: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(),
  };
  vi.mocked(api.get).mockResolvedValue({ data: [] });
  vi.mocked(api.post).mockImplementation(async (url) => ({
    data: String(url).endsWith("finalize") ? { revision: 4 } : descriptor,
  }));
  vi.mocked(prepareVideoUpload).mockImplementation(
    async (file, _intent, handlers) => {
      callbacks = handlers;
      transfer.file = file;
      return { upload: transfer as never, reloadResumeAvailable: true };
    },
  );
});

describe("Guardian staff video upload", () => {
  it("recovers an intent created by a delayed signing response after the revision changes", async () => {
    let resolveSigning!: (value: { data: SignedVideoIntent }) => void;
    vi.mocked(api.post).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSigning = resolve;
        }),
    );
    const refresh = vi.fn();
    const view = render(<VideoUpload report={report} refresh={refresh} />);
    selectFile("MP4 video file");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload video" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Upload video" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(base, expect.anything()),
    );
    view.rerender(
      <VideoUpload report={{ ...report, revision: 4 }} refresh={refresh} />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Refresh pending videos" }),
      ).toBeEnabled(),
    );
    vi.mocked(api.get).mockResolvedValue({ data: [descriptor] });
    await act(async () => resolveSigning({ data: descriptor }));
    await screen.findByRole("button", { name: "Cancel pending video" });
    expect(prepareVideoUpload).not.toHaveBeenCalled();
    expect(transfer.start).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Refresh pending videos" }),
    ).toBeEnabled();
  });

  it("allows retrying a failed pending-list request without reloading the page", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("offline"));
    render(<VideoUpload report={report} refresh={vi.fn()} />);
    await screen.findByText(/Pending videos could not be loaded/);
    selectFile("MP4 video file");
    expect(screen.getByRole("button", { name: "Upload video" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh pending videos" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload video" }),
      ).toBeEnabled(),
    );
  });

  it("does not start a transfer if cancellation finishes while TUS preparation is pending", async () => {
    let resolvePreparation!: (
      value: Awaited<ReturnType<typeof prepareVideoUpload>>,
    ) => void;
    vi.mocked(prepareVideoUpload).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreparation = resolve;
        }),
    );
    render(<VideoUpload report={report} refresh={vi.fn()} />);
    selectFile("MP4 video file");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload video" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Upload video" }));
    await waitFor(() => expect(prepareVideoUpload).toHaveBeenCalled());
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel pending video" }),
    );
    await screen.findByText(/Pending upload canceled/);
    await act(async () =>
      resolvePreparation({
        upload: transfer as never,
        reloadResumeAvailable: true,
      }),
    );
    expect(transfer.start).not.toHaveBeenCalled();
    expect(transfer.abort).toHaveBeenCalledWith(false);
    expect(
      screen.queryByRole("button", { name: "Pause transfer" }),
    ).not.toBeInTheDocument();
  });

  it("invalidates pending preparation when the report revision or phase changes", async () => {
    let resolvePreparation!: (
      value: Awaited<ReturnType<typeof prepareVideoUpload>>,
    ) => void;
    vi.mocked(prepareVideoUpload).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreparation = resolve;
        }),
    );
    const refresh = vi.fn();
    const view = render(<VideoUpload report={report} refresh={refresh} />);
    selectFile("MP4 video file");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload video" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Upload video" }));
    await waitFor(() => expect(prepareVideoUpload).toHaveBeenCalled());
    view.rerender(
      <VideoUpload
        report={{ ...report, revision: 4, status: "CUSTOMER_REVIEW" }}
        refresh={refresh}
      />,
    );
    await act(async () =>
      resolvePreparation({
        upload: transfer as never,
        reloadResumeAvailable: true,
      }),
    );
    expect(transfer.start).not.toHaveBeenCalled();
    expect(transfer.abort).toHaveBeenCalledWith(false);
  });

  it("sends a >32 MiB MP4 directly, shows progress, and saves only after server verification", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<VideoUpload report={report} refresh={refresh} />);
    selectFile("MP4 video file");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload video" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Upload video" }));
    await waitFor(() => expect(transfer.start).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(base, {
      revision: 3,
      kind: "VIDEO",
      filename: "walk.mp4",
      mimeType: "video/mp4",
      expectedSizeBytes: 40 * 1048576,
    });
    expect(api.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/evidence"),
      expect.anything(),
      expect.anything(),
    );
    act(() =>
      callbacks.progress(VIDEO_CHUNK_BYTES, descriptor.expectedSizeBytes),
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "value",
      String(VIDEO_CHUNK_BYTES),
    );
    expect(screen.queryByText(/verified and saved/)).not.toBeInTheDocument();
    act(() => callbacks.success());
    await screen.findByText("Video verified and saved as inspection evidence.");
    expect(api.post).toHaveBeenCalledWith(
      base + "/intent-1/finalize",
      {},
      { timeout: 150000 },
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(forgetVideoResume).toHaveBeenCalledWith("intent-1");
    expect(document.body.textContent).not.toContain(descriptor.token);
  });

  it("pauses, resumes the same in-memory transfer with fresh authorization, and confirms cancellation", async () => {
    render(<VideoUpload report={report} refresh={vi.fn()} />);
    selectFile("MP4 video file");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload video" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Upload video" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Pause transfer" }),
    );
    await screen.findByText(/Transfer paused/);
    expect(transfer.abort).toHaveBeenCalledWith(false);
    fireEvent.click(
      screen.getByRole("button", { name: "Resume selected video" }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(base + "/intent-1/resume", {}),
    );
    await waitFor(() => expect(transfer.start).toHaveBeenCalledTimes(2));
    expect(prepareVideoUpload).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel pending video" }),
    );
    await screen.findByText(/Pending upload canceled/);
    expect(api.post).toHaveBeenCalledWith(base + "/intent-1/cancel", {});
  });

  it("loads pending intent after navigation and resumes only when the original file is reselected", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [descriptor] });
    render(<VideoUpload report={report} refresh={vi.fn()} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Select pending video" }),
    );
    expect(
      screen.getByRole("button", { name: "Resume selected video" }),
    ).toBeDisabled();
    selectFile(
      "Reselect original MP4 video",
      new File(["other"], "wrong.mp4", { type: "video/mp4" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Resume selected video" }),
    );
    await screen.findByText(/original file with the same name/);
    expect(api.post).not.toHaveBeenCalled();
    selectFile("Reselect original MP4 video");
    fireEvent.click(
      screen.getByRole("button", { name: "Resume selected video" }),
    );
    await waitFor(() => expect(prepareVideoUpload).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(base + "/intent-1/resume", {});
    expect(api.post).not.toHaveBeenCalledWith(base, expect.anything());
  });

  it("keeps failed finalization retryable, refreshes a revision conflict and never reports unsaved video as saved", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [descriptor] });
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(<VideoUpload report={report} refresh={refresh} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Select pending video" }),
    );
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 409, data: { message: "Report revision changed" } },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Verify completed upload" }),
    );
    await screen.findByText(
      /Video is not yet saved as evidence: Report revision changed/,
    );
    expect(refresh).toHaveBeenCalled();
    expect(forgetVideoResume).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Video verified and saved as inspection evidence."),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Verify completed upload" }),
    );
    await screen.findByText("Video verified and saved as inspection evidence.");
  });

  it("preserves the small-video multipart route and permits canceling stale intents without signing", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const view = render(<VideoUpload report={report} refresh={refresh} />);
    selectFile(
      "MP4 video file",
      new File(["small-mp4"], "small.mp4", { type: "video/mp4" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload video" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Upload video" }));
    await screen.findByText("Video saved as inspection evidence.");
    expect(api.post).toHaveBeenCalledWith(
      "/guardian/staff/reports/report-1/evidence",
      expect.any(FormData),
      { timeout: 120000 },
    );
    expect(prepareVideoUpload).not.toHaveBeenCalled();
    view.unmount();
    vi.mocked(api.get).mockResolvedValue({ data: [descriptor] });
    render(
      <VideoUpload
        report={{ ...report, revision: 4, status: "CUSTOMER_REVIEW" }}
        refresh={refresh}
      />,
    );
    const cancel = await screen.findByRole("button", {
      name: "Cancel pending video",
    });
    expect(
      screen.queryByRole("button", { name: "Select pending video" }),
    ).not.toBeInTheDocument();
    fireEvent.click(cancel);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(base + "/intent-1/cancel", {}),
    );
  });
});
