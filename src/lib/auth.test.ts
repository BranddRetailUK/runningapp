import { describe, expect, it } from "vitest";

import { isSameOrigin } from "@/lib/auth";

describe("isSameOrigin", () => {
  it("allows requests without an Origin header", () => {
    expect(isSameOrigin(new Request("https://runline.example/api/runs"))).toBe(true);
  });

  it("allows a direct same-origin request", () => {
    const request = new Request("https://runline.example/api/runs", {
      headers: { origin: "https://runline.example" },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("uses the public protocol for HTTPS requests forwarded over HTTP", () => {
    const request = new Request("http://runline.example/api/runs/parse", {
      headers: {
        host: "runline.example",
        origin: "https://runline.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("uses the first protocol from a proxy chain", () => {
    const request = new Request("http://runline.example/api/runs/parse", {
      headers: {
        host: "runline.example",
        origin: "https://runline.example",
        "x-forwarded-proto": "https, http",
      },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("rejects a different origin", () => {
    const request = new Request("http://runline.example/api/runs/parse", {
      headers: {
        host: "runline.example",
        origin: "https://attacker.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(isSameOrigin(request)).toBe(false);
  });

  it("rejects a malformed Origin header", () => {
    const request = new Request("https://runline.example/api/runs", {
      headers: { origin: "not a URL" },
    });

    expect(isSameOrigin(request)).toBe(false);
  });
});
