import { defineConfig } from "drizzle-kit";
import { loadEnvFile } from "node:process";

try { loadEnvFile(".env.local"); } catch { /* no .env.local */ }

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
