import { Client } from "pg";
import { loadEnvFile } from "node:process";

try { loadEnvFile(".env.local"); } catch { /* no .env.local */ }

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    DROP TABLE IF EXISTS reports CASCADE;
    DROP TABLE IF EXISTS ratings CASCADE;
    DROP TABLE IF EXISTS comments CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS publications CASCADE;
    DROP TABLE IF EXISTS manuscripts CASCADE;
    DROP TABLE IF EXISTS sessions CASCADE;
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS verifications CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  console.log("Toutes les tables supprimées.");
  await client.end();
}

main().catch(console.error);
