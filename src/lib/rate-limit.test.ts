import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { checkMemory } = await import("./rate-limit");

describe("checkMemory (repli sans Upstash)", () => {
  it("autorise jusqu'à la limite puis bloque", () => {
    const key = `test:${Math.random()}`;
    const results = Array.from({ length: 4 }, () => checkMemory(key, 3, 60_000, 1_000));
    expect(results).toEqual([true, true, true, false]);
  });

  it("réautorise une fois la fenêtre écoulée", () => {
    const key = `test:${Math.random()}`;
    checkMemory(key, 1, 60_000, 1_000);
    expect(checkMemory(key, 1, 60_000, 2_000)).toBe(false);
    expect(checkMemory(key, 1, 60_000, 62_000)).toBe(true);
  });

  it("compte séparément chaque clé", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    checkMemory(a, 1, 60_000, 0);
    expect(checkMemory(a, 1, 60_000, 0)).toBe(false);
    expect(checkMemory(b, 1, 60_000, 0)).toBe(true);
  });
});
