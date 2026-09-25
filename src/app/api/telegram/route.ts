import { NextResponse, after } from "next/server";
import { handleUpdate } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Telegram webhook. Answers 200 at once and replies in the background. */
export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const update = await req.json().catch(() => null);
  if (update) after(() => handleUpdate(update));
  return NextResponse.json({ ok: true });
}
