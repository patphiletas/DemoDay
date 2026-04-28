import { describe, expect, it } from "vitest";
import { ratingSchema, signupSchema } from "./validation";

describe("validation schemas", () => {
  it("accepts a valid signup payload", () => {
    const result = signupSchema.safeParse({
      email: "reader@example.com",
      username: "reader_01",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects ratings outside the 1-5 range", () => {
    const result = ratingSchema.safeParse({
      score: 6,
      publicationId: 1,
    });

    expect(result.success).toBe(false);
  });
});
