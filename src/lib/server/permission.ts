import { fromJson, type SpendPermission } from "../chain/permission";

/** The Sellvane permission this deployment serves (created once by the team, stored in env). */
export function servedPermission(): SpendPermission {
  const raw = process.env.PERMISSION_JSON;
  if (!raw) throw new Error("Missing env PERMISSION_JSON");
  return fromJson(JSON.parse(raw));
}
