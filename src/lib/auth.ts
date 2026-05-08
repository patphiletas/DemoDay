import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { accounts, sessions, users, verifications } from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { accounts, sessions, users, verifications },
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  appName: "Maison d'Édition Alternative",
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["http://localhost:3000", "https://demo-day-wine.vercel.app"],
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
