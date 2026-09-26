import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { listTokens, parsePermission, registerToken, RegistryError } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every active capped token (public). */
export async function GET() {
  const rows = await listTokens();
  return NextResponse.json({
    tokens: rows.map((r) => ({ slug: r.slug, token: r.token, symbol: r.symbol, name: r.name, teamAccount: r.teamAccount, createdAt: r.createdAt })),
  });
}

/** Register a token after its team signed the cap. Every check runs on chain. */
export async function POST(req: Request) {
  const limited = rateLimit(req, "register", 5, 600000);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => null);
    if (!body?.permission) throw new RegistryError(400, "Missing permission.");
    const signature = typeof body.signature === "string" && /^0x[0-9a-fA-F]+$/.test(body.signature) ? (body.signature as `0x${string}`) : undefined;
    const row = await registerToken(parsePermission(body.permission), { maxImpactBps: Number(body.maxImpactBps) || undefined, signature });
    return NextResponse.json({ slug: row.slug, token: row.token, permissionHash: row.permissionHash }, { status: 201 });
  } catch (e) {
    if (e instanceof RegistryError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Your signature worked, but we could not save the cap because Base did not answer. Try again in a minute. You will not be asked to pay anything." }, { status: 503 });
  }
}
