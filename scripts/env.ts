import { readFileSync, writeFileSync } from "node:fs";

export const ENV_PATH = new URL("../.env.local", import.meta.url).pathname;

export function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/** Write or replace KEY=value in .env.local and mirror it into process.env. */
export function setEnv(key: string, value: string) {
  let env = readFileSync(ENV_PATH, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  env = re.test(env) ? env.replace(re, `${key}=${value}`) : env + `${key}=${value}\n`;
  writeFileSync(ENV_PATH, env, { mode: 0o600 });
  process.env[key] = value;
}
