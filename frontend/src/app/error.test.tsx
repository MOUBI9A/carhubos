import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppError from "./error";

describe("app render recovery boundary", () => {
  it("offers a retry action without leaking internal errors", () => {
    const reset = vi.fn();
    const error = Object.assign(new Error("private token=do-not-display"), { digest: "route-digest-1" });
    render(<AppError error={error} reset={reset} />);
    expect(screen.getByRole("heading", { name: "This page couldn't load" })).toBeVisible();
    expect(screen.queryByText(/do-not-display/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry page" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute("href", "/");
    expect(screen.getByText(/route-digest-1/)).toBeVisible();
  });
});
