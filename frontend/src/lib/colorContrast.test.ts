import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function hslToken(name: string): [number, number, number] {
  const found = css.match(
    new RegExp(`--color-${name}:\\s*hsl\\(([0-9.]+)\\s+([0-9.]+)%\\s+([0-9.]+)%\\)`),
  );
  if (!found) throw new Error(`Missing hsl token: ${name}`);
  return [Number(found[1]), Number(found[2]), Number(found[3])];
}

function lightness([h, s, l]: [number, number, number]) {
  const hue = h / 360, saturation = s / 100, luminance = l / 100;
  const amplitude = saturation * Math.min(luminance, 1 - luminance);
  const values = [0, 8, 4].map((n) => {
    const k = (n + hue * 12) % 12;
    const c = luminance - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function ratio(a: string, b: string) {
  const x = lightness(hslToken(a)), y = lightness(hslToken(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("critical UI token contrast", () => {
  it("keeps action-button primary foreground readable (WCAG 2.2 AA)", () => {
    expect(ratio("primary", "primary-foreground")).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps faint informational text readable on raised surfaces", () => {
    expect(ratio("text-faint", "surface")).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps default body foreground readable on the background", () => {
    expect(ratio("foreground", "background")).toBeGreaterThanOrEqual(4.5);
  });
});
