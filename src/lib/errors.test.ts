import { describe, expect, it } from "vitest";
import { z } from "zod";
import { actionError, validationActionError } from "./errors";

describe("action errors", () => {
  it("returns a form-compatible error state", () => {
    expect(actionError("Message lisible")).toEqual({ error: "Message lisible" });
  });

  it("uses the first Zod issue message", () => {
    const result = z.string().min(3, "Trop court").safeParse("ab");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(validationActionError(result.error)).toEqual({ error: "Trop court" });
    }
  });
});
