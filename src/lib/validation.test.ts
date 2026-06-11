import { describe, expect, it } from "vitest";
import {
  commentSchema,
  httpsImageUrlSchema,
  manuscriptSchema,
  parseHttpsImageUrl,
  ratingSchema,
  reportSchema,
  signinSchema,
  signupSchema,
} from "./validation";

describe("httpsImageUrlSchema", () => {
  it("accepts https image URLs", () => {
    expect(httpsImageUrlSchema.safeParse("https://example.com/cover.jpg").success).toBe(true);
  });

  it("rejects non-https URLs", () => {
    for (const url of ["http://example.com/cover.jpg", "javascript:alert(1)", "data:image/svg+xml,<svg />"]) {
      expect(httpsImageUrlSchema.safeParse(url).success, `${url} should be rejected`).toBe(false);
    }
  });

  it("returns null for invalid or empty cover URLs", () => {
    expect(parseHttpsImageUrl("")).toBeNull();
    expect(parseHttpsImageUrl("pas une url")).toBeNull();
  });
});

// ─── signupSchema ────────────────────────────────────────────────────────────

describe("signupSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      signupSchema.safeParse({
        email: "reader@example.com",
        username: "reader_01",
        password: "password123",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      signupSchema.safeParse({
        email: "pas-un-email",
        username: "reader_01",
        password: "password123",
      }).success
    ).toBe(false);
  });

  it("lowercases the email", () => {
    const result = signupSchema.safeParse({
      email: "READER@EXAMPLE.COM",
      username: "reader_01",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("reader@example.com");
  });

  it("rejects a username shorter than 3 characters", () => {
    expect(
      signupSchema.safeParse({
        email: "reader@example.com",
        username: "ab",
        password: "password123",
      }).success
    ).toBe(false);
  });

  it("rejects a username with forbidden characters", () => {
    for (const username of ["user name", "user@name", "user#1"]) {
      expect(
        signupSchema.safeParse({
          email: "reader@example.com",
          username,
          password: "password123",
        }).success,
        `username "${username}" should be rejected`
      ).toBe(false);
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      signupSchema.safeParse({
        email: "reader@example.com",
        username: "reader_01",
        password: "1234567",
      }).success
    ).toBe(false);
  });

  it("rejects a payload missing the username field", () => {
    expect(
      signupSchema.safeParse({
        email: "reader@example.com",
        password: "password123",
      }).success
    ).toBe(false);
  });
});

// ─── signinSchema ────────────────────────────────────────────────────────────

describe("signinSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      signinSchema.safeParse({
        email: "reader@example.com",
        password: "password123",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      signinSchema.safeParse({ email: "nope", password: "password123" }).success
    ).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(
      signinSchema.safeParse({ email: "reader@example.com", password: "" })
        .success
    ).toBe(false);
  });
});

// ─── manuscriptSchema ────────────────────────────────────────────────────────

describe("manuscriptSchema", () => {
  const validContent = "a".repeat(100);

  it("accepts a valid payload", () => {
    expect(
      manuscriptSchema.safeParse({
        title: "Mon titre valide",
        creditedAuthorName: "Anya Schiffrin",
        content: validContent,
        category: "fiction",
      }).success
    ).toBe(true);
  });

  it("rejects a title shorter than 5 characters", () => {
    expect(
      manuscriptSchema.safeParse({
        title: "abc",
        creditedAuthorName: "Anya Schiffrin",
        content: validContent,
        category: "fiction",
      }).success
    ).toBe(false);
  });

  it("rejects a title longer than 255 characters", () => {
    expect(
      manuscriptSchema.safeParse({
        title: "a".repeat(256),
        creditedAuthorName: "Anya Schiffrin",
        content: validContent,
        category: "fiction",
      }).success
    ).toBe(false);
  });

  it("rejects content shorter than 100 characters", () => {
    expect(
      manuscriptSchema.safeParse({
        title: "Mon titre valide",
        creditedAuthorName: "Anya Schiffrin",
        content: "trop court",
        category: "fiction",
      }).success
    ).toBe(false);
  });

  it("rejects an empty category", () => {
    expect(
      manuscriptSchema.safeParse({
        title: "Mon titre valide",
        creditedAuthorName: "Anya Schiffrin",
        content: validContent,
        category: "",
      }).success
    ).toBe(false);
  });

  it("rejects a missing credited author name", () => {
    expect(
      manuscriptSchema.safeParse({
        title: "Mon titre valide",
        content: validContent,
        category: "fiction",
      }).success
    ).toBe(false);
  });
});

// ─── commentSchema ───────────────────────────────────────────────────────────

describe("commentSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      commentSchema.safeParse({ content: "Super article !", publicationId: 1 })
        .success
    ).toBe(true);
  });

  it("rejects an empty comment", () => {
    expect(
      commentSchema.safeParse({ content: "", publicationId: 1 }).success
    ).toBe(false);
  });

  it("rejects a comment longer than 500 characters", () => {
    expect(
      commentSchema.safeParse({
        content: "a".repeat(501),
        publicationId: 1,
      }).success
    ).toBe(false);
  });

  it("rejects a non-positive publicationId", () => {
    for (const id of [0, -1]) {
      expect(
        commentSchema.safeParse({ content: "Ok", publicationId: id }).success,
        `publicationId ${id} should be rejected`
      ).toBe(false);
    }
  });

  it("rejects a decimal publicationId", () => {
    expect(
      commentSchema.safeParse({ content: "Ok", publicationId: 1.5 }).success
    ).toBe(false);
  });
});

// ─── ratingSchema ────────────────────────────────────────────────────────────

describe("ratingSchema", () => {
  it("accepts scores from 1 to 5", () => {
    for (const score of [1, 2, 3, 4, 5]) {
      expect(
        ratingSchema.safeParse({ score, publicationId: 1 }).success,
        `score ${score} should be accepted`
      ).toBe(true);
    }
  });

  it("rejects a score of 0", () => {
    expect(
      ratingSchema.safeParse({ score: 0, publicationId: 1 }).success
    ).toBe(false);
  });

  it("rejects a score greater than 5", () => {
    expect(
      ratingSchema.safeParse({ score: 6, publicationId: 1 }).success
    ).toBe(false);
  });

  it("rejects a non-integer score", () => {
    expect(
      ratingSchema.safeParse({ score: 3.5, publicationId: 1 }).success
    ).toBe(false);
  });

  it("rejects a non-positive publicationId", () => {
    expect(
      ratingSchema.safeParse({ score: 3, publicationId: 0 }).success
    ).toBe(false);
  });
});

// ─── reportSchema ────────────────────────────────────────────────────────────

describe("reportSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      reportSchema.safeParse({
        commentId: 1,
        reason: "Ce commentaire contient des propos inappropriés.",
      }).success
    ).toBe(true);
  });

  it("rejects a reason shorter than 10 characters", () => {
    expect(
      reportSchema.safeParse({ commentId: 1, reason: "spam" }).success
    ).toBe(false);
  });

  it("rejects a reason longer than 500 characters", () => {
    expect(
      reportSchema.safeParse({ commentId: 1, reason: "a".repeat(501) }).success
    ).toBe(false);
  });

  it("rejects a non-positive commentId", () => {
    expect(
      reportSchema.safeParse({
        commentId: -1,
        reason: "Raison suffisamment longue.",
      }).success
    ).toBe(false);
  });
});
