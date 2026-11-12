import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "./global-error";

describe("root-layout recovery fallback", () => {
  it("renders independently of app providers without exposing raw exceptions", () => {
    const error = Object.assign(new Error("private database credentials"), {
      digest: "safe-error-reference",
    });
    const markup = renderToStaticMarkup(<GlobalError error={error} reset={vi.fn()} />);
    expect(markup).toContain("<html");
    expect(markup).toContain("<body");
    expect(markup).toContain("Retry page");
    expect(markup).toContain("Go to home");
    expect(markup).toContain("safe-error-reference");
    expect(markup).not.toContain("private database credentials");
  });
});
