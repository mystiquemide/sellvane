import { readdirSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { must } from "./env";

async function main() {
  const sql = postgres(must("DIRECT_URL"), { max: 1, ssl: "require" });
  const dir = new URL("../db/", import.meta.url).pathname;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    await sql.unsafe(readFileSync(dir + f, "utf8"));
    console.log("applied", f);
  }
  const t = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
  console.log("tables:", t.map((r) => r.table_name).join(", "));
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
