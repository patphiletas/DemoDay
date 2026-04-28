import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    type: "postgres",
    url: process.env.DATABASE_URL,
  },
  secret: process.env.BETTER_AUTH_API_KEY,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
});