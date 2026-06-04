import { describe, expect, it } from "vitest";
import { formatFetchError, isBrowserFetchNetworkError } from "@/lib/client/parseApiError";

describe("parseApiError", () => {
  it("detects browser network fetch errors", () => {
    expect(isBrowserFetchNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isBrowserFetchNetworkError(new Error("other"))).toBe(false);
  });

  it("uses localhost hints only on local host", () => {
    const original = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { location: { hostname: "patent-drafter.vercel.app", origin: "https://patent-drafter.vercel.app" } },
      configurable: true
    });
    const msg = formatFetchError(new TypeError("Failed to fetch"), "fallback");
    expect(msg).toContain("Vercel");
    expect(msg).not.toContain("dev-restart");
    Object.defineProperty(globalThis, "window", { value: original, configurable: true });
  });
});
