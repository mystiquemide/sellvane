import { isAddress } from "viem";
import { getToken, type TokenRow } from "../registry";
import { tokenSnapshot } from "../status";
import { listDecisions } from "../store/db";
import { basescanTx, pct, tokenLabel, tokens, until, utcTime } from "../format";

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const origin = () => process.env.PUBLIC_ORIGIN ?? "https://sellvane.midelabs.xyz";

export async function sendMessage(chatId: number, html: string) {
  await fetch(`${API()}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => undefined);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function resolve(arg: string | undefined): Promise<TokenRow | null | "bad"> {
  const key = arg?.trim() || process.env.TOKEN_ADDRESS || "";
  if (!isAddress(key)) return "bad";
  return getToken(key);
}

const HELP = () =>
  [
    "<b>Sellvane</b> puts a public daily sell cap on a team's unlocked tokens, enforced on Base. An AI agent sells inside it, only when the pool can take it.",
    "",
    "/cap [token] - today's cap, sold, left, reset time",
    "/moves [token] - the agent's latest moves with reasons",
    "/check &lt;address&gt; - is a token capped?",
    "",
    "Without a token, /cap and /moves show Sellvane's live test token.",
    `Site: ${origin()}`,
  ].join("\n");

export async function capText(row: TokenRow): Promise<string> {
  const s = await tokenSnapshot(row);
  const d = row.decimals;
  const lines = [
    `<b>${esc(tokenLabel(s.token))}</b>, read from Base at block ${Number(s.block).toLocaleString("en-US")}`,
    "",
    `Cap per day: <code>${tokens(s.cap.allowance, d)}</code>`,
    `Sold today: <code>${tokens(s.cap.spentThisPeriod, d)}</code>`,
    `Still allowed: <code>${tokens(s.cap.remaining, d)}</code>`,
    s.cap.periodEnd ? `Resets in ${until(s.cap.periodEnd)} (at ${utcTime(s.cap.periodEnd)})` : "No active cap.",
    "",
    s.uncappedMoves.length
      ? `Alert: ${s.uncappedMoves.length} uncapped ${s.uncappedMoves.length === 1 ? "move" : "moves"}: tokens left the team account outside the cap.`
      : "Bypass watch: nothing left the team account outside the cap.",
    "",
    `Live page: ${origin()}/live/${row.slug}`,
  ];
  return lines.join("\n");
}

const STAMP: Record<string, string> = { SELL: "SOLD", WAIT: "WAITED", SKIP: "PAUSED", BLOCKED: "BLOCKED" };

export async function movesText(row: TokenRow): Promise<string> {
  const moves = (await listDecisions(row.permissionHash, 3)) ?? [];
  if (!moves.length) return `No agent moves yet for ${esc(tokenLabel(row))}.`;
  const out = [`<b>Latest moves, ${esc(tokenLabel(row))}</b>`, ""];
  for (const m of moves) {
    const amt = m.amountIn ? ` ${tokens(m.amountIn, row.decimals)} tokens` : "";
    const imp = m.action === "SELL" && m.impactBps != null ? `, ${pct(m.impactBps)} impact` : "";
    out.push(`<b>${STAMP[m.action] ?? m.action}</b>${amt}${imp} at ${utcTime(m.at)}`);
    out.push(`“${esc(m.reason)}”`);
    if (m.txHash) out.push(basescanTx(m.txHash));
    out.push("");
  }
  out.push(`All moves: ${origin()}/live/${row.slug}#agent`);
  return out.join("\n");
}

type Update = { message?: { chat: { id: number }; text?: string } };

/** Handle one Telegram update. Replies are plain reads of chain data; the bot never moves funds. */
export async function handleUpdate(u: Update) {
  const msg = u.message;
  if (!msg?.text) return;
  const [rawCmd, arg] = msg.text.trim().split(/\s+/, 2);
  const cmd = rawCmd.split("@")[0].toLowerCase();
  const chat = msg.chat.id;
  try {
    if (cmd === "/start" || cmd === "/help") return sendMessage(chat, HELP());
    if (cmd === "/cap" || cmd === "/moves" || cmd === "/check") {
      if (cmd === "/check" && !arg) return sendMessage(chat, "Send a token or team account address: /check 0x...");
      const row = await resolve(arg);
      if (row === "bad") return sendMessage(chat, "That is not a Base address. It should be 0x followed by 40 characters.");
      if (!row) return sendMessage(chat, `No Sellvane cap for this token. The team can set one at ${origin()}/start?token=${arg}`);
      if (cmd === "/moves") return sendMessage(chat, await movesText(row));
      return sendMessage(chat, await capText(row));
    }
    return sendMessage(chat, "I did not get that. Try /cap, /moves or /check 0x...");
  } catch {
    return sendMessage(chat, "Base did not answer just now. Try again in a minute.");
  }
}

export const COMMANDS = [
  { command: "cap", description: "Today's cap, sold, left and reset time" },
  { command: "moves", description: "The agent's latest moves with reasons" },
  { command: "check", description: "Is a token capped? /check 0x..." },
  { command: "help", description: "What Sellvane does" },
];
