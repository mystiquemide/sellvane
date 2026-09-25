import { formatEther, isAddress } from "viem";
import { getToken, listTokens, type TokenRow } from "../registry";
import { tokenSnapshot } from "../status";
import { listDecisions } from "../store/db";
import { findWethPool, readTokenInfo, TokenCheckError } from "../chain/token";
import { previewMaxSale } from "../preview";
import { basescanAddress, basescanTx, pct, short, tokenLabel, tokens, until, utcTime } from "../format";

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const origin = () => process.env.PUBLIC_ORIGIN ?? "https://sellvane.midelabs.xyz";
const MANAGER = "0xf85210B21cC50302F477BA56686d2019dC9b67Ad";

type Button = { text: string; url: string };
type Reply = { text: string; buttons?: Button[][] };

export async function sendMessage(chatId: number, r: Reply) {
  await fetch(`${API()}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: r.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(r.buttons ? { reply_markup: { inline_keyboard: r.buttons } } : {}),
    }),
  }).catch(() => undefined);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const livePage = (row: TokenRow, hash = "") => `${origin()}/live/${row.slug}${hash}`;
const code = (s: string) => `<code>${esc(s)}</code>`;

function eth(wei: bigint): string {
  const n = Number(formatEther(wei));
  if (n === 0) return "0";
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(Math.min(18, Math.ceil(-Math.log10(n)) + 2));
}

async function resolve(arg: string | undefined): Promise<TokenRow | null | "bad"> {
  const key = arg?.trim() || process.env.TOKEN_ADDRESS || "";
  if (!isAddress(key)) return "bad";
  return getToken(key);
}

const notCapped = (arg: string | undefined): Reply => ({
  text: "No Sellvane cap for this token. Nothing limits how much its team can sell through Sellvane.",
  buttons: arg ? [[{ text: "Cap this token", url: `${origin()}/start?token=${arg}` }]] : undefined,
});

function help(): Reply {
  return {
    text: [
      "<b>Sellvane</b> puts a public daily sell cap on a team's unlocked tokens, enforced on Base. An AI agent sells inside it, only when the pool can take it.",
      "",
      "<b>Watch a token</b>",
      "/cap [token] - today's cap, sold, left, reset",
      "/moves [token] - the agent's latest moves and reasons",
      "/bypass [token] - anything that left the team account outside the cap",
      "/pool [token] - the pool the agent sells into",
      "/verify [token] - where to check it all on Base",
      "",
      "<b>Find tokens</b>",
      "/tokens - every capped token",
      "/check &lt;address&gt; - is a token capped?",
      "",
      "<b>For teams</b>",
      "/captoken &lt;address&gt; [cap %] [impact %] - check your token and preview the agent's sales",
      "",
      "Without an address, the watch commands show Sellvane's live test token.",
    ].join("\n"),
    buttons: [[{ text: "Open Sellvane", url: origin() }, { text: "Cap your token", url: `${origin()}/start` }]],
  };
}

async function capReply(row: TokenRow): Promise<Reply> {
  const s = await tokenSnapshot(row);
  const d = row.decimals;
  const lines = [
    `<b>${esc(tokenLabel(s.token))}</b>`,
    `Today the team can sell at most ${code(tokens(s.cap.allowance, d))} tokens.`,
    "",
    `Already sold today: ${code(tokens(s.cap.spentThisPeriod, d))}`,
    `Still allowed today: ${code(tokens(s.cap.remaining, d))}`,
    s.cap.periodEnd ? `Cap resets in ${until(s.cap.periodEnd)} (at ${utcTime(s.cap.periodEnd)})` : "No active cap right now.",
  ];
  if (s.cap.activePermissions > 1) lines.push(`Sum of ${s.cap.activePermissions} active permissions.`);
  lines.push(
    "",
    s.uncappedMoves.length
      ? `<b>Alert:</b> ${s.uncappedMoves.length} uncapped ${s.uncappedMoves.length === 1 ? "move" : "moves"}. See /bypass.`
      : "Bypass watch: nothing left the team account outside the cap.",
    `Read from Base at block ${Number(s.block).toLocaleString("en-US")}.`,
  );
  return { text: lines.join("\n"), buttons: [[{ text: "Open live page", url: livePage(row) }]] };
}

const STAMP: Record<string, string> = { SELL: "SOLD", WAIT: "WAITED", SKIP: "PAUSED", BLOCKED: "BLOCKED" };
const BY: Record<string, string> = { model: "the agent", fallback: "a safe default", rule: "a fixed rule", manual: "hand, as a proof" };

async function movesReply(row: TokenRow): Promise<Reply> {
  const moves = await listDecisions(row.permissionHash, 5);
  if (!moves.length) return { text: `No agent moves yet for ${esc(tokenLabel(row))}.`, buttons: [[{ text: "Open live page", url: livePage(row) }]] };
  const out = [`<b>Latest moves, ${esc(tokenLabel(row))}</b>`, ""];
  for (const m of moves) {
    const amt = m.amountIn ? ` ${tokens(m.amountIn, row.decimals)} tokens` : "";
    const imp = m.action === "SELL" && m.impactBps != null ? `, ${pct(m.impactBps)} impact` : "";
    out.push(`<b>${STAMP[m.action] ?? m.action}</b>${amt}${imp}, ${utcTime(m.at)}`);
    out.push(`“${esc(m.reason)}”`);
    const tx = m.txHash ? ` <a href="${basescanTx(m.txHash)}">${m.txStatus === "reverted" ? "Refused tx" : "Transaction"}</a>` : "";
    out.push(`Decided by ${BY[m.source] ?? m.source}.${tx}`);
    out.push("");
  }
  return { text: out.join("\n"), buttons: [[{ text: "All moves", url: livePage(row, "#agent") }]] };
}

async function bypassReply(row: TokenRow): Promise<Reply> {
  const s = await tokenSnapshot(row);
  const d = row.decimals;
  const out = [
    `<b>Bypass watch, ${esc(tokenLabel(s.token))}</b>`,
    `Checked every transfer from block ${Number(s.scan.fromBlock).toLocaleString("en-US")} through ${Number(s.scan.toBlock).toLocaleString("en-US")}.`,
    "",
    `Went through Sellvane, under the cap: ${code(String(s.cappedMoves))}`,
    `Went around the cap: ${code(String(s.uncappedMoves.length))}`,
  ];
  if (!s.uncappedMoves.length) out.push("", "In that range, nothing left the team account outside the cap.");
  for (const m of s.uncappedMoves.slice(0, 5)) {
    out.push("", `<b>Uncapped:</b> ${tokens(m.amount, d)} tokens to ${code(short(m.to))} at block ${Number(m.blockNumber).toLocaleString("en-US")}. <a href="${basescanTx(m.txHash)}">Transaction</a>`);
  }
  return { text: out.join("\n"), buttons: [[{ text: "Open bypass watch", url: livePage(row, "#bypass") }]] };
}

async function poolReply(row: TokenRow): Promise<Reply> {
  const s = await tokenSnapshot(row);
  const per1M = BigInt(s.pool.midWeiPerToken) * BigInt(1_000_000);
  return {
    text: [
      `<b>The pool it sells into, ${esc(tokenLabel(s.token))}</b>`,
      `Uniswap v3, ${s.pool.fee / 10000}% fee tier`,
      "",
      `Tokens in the pool: ${code(tokens(s.pool.tokenReserve, row.decimals))}`,
      `ETH in the pool: ${code(eth(BigInt(s.pool.wethReserve)))}`,
      `Price per 1,000,000 tokens: ${code(`${eth(per1M)} ETH`)}`,
      `Max price impact per sale: ${code(pct(row.maxImpactBps))}`,
    ].join("\n"),
    buttons: [[{ text: "Pool on BaseScan", url: basescanAddress(s.pool.address) }]],
  };
}

async function verifyReply(row: TokenRow): Promise<Reply> {
  return {
    text: [
      `<b>Check it yourself, ${esc(tokenLabel(row))}</b>`,
      "The cap, the sales and every transfer can be checked on Base without Sellvane.",
      "",
      `1. The cap is held by Coinbase's Spend Permission Manager. Permission: ${code(row.permissionHash)}`,
      "2. The seller contract sends the ETH to the team account in the same transaction and has no withdraw function.",
      `3. Every transfer out of the team account ${code(short(row.teamAccount))} is on BaseScan.`,
    ].join("\n"),
    buttons: [
      [{ text: "Spend Permission Manager", url: basescanAddress(MANAGER) }],
      [{ text: "Seller source", url: "https://github.com/mystiquemide/sellvane/blob/main/contracts/src/SellvaneSeller.sol" }],
      [{ text: "Team account transfers", url: `https://basescan.org/token/${row.token}?a=${row.teamAccount}` }],
    ],
  };
}

async function tokensReply(): Promise<Reply> {
  const rows = await listTokens();
  if (!rows.length) return { text: "No tokens are capped yet.", buttons: [[{ text: "Cap the first one", url: `${origin()}/start` }]] };
  const out = [`<b>Capped tokens (${rows.length})</b>`, ""];
  for (const r of rows.slice(0, 20)) out.push(`${esc(tokenLabel(r))}: <a href="${livePage(r)}">live page</a>`);
  return { text: out.join("\n"), buttons: [[{ text: "Launchpad view", url: `${origin()}/launchpad` }]] };
}

/** Parse "0.5" or "0.5%" into basis points, within bounds. */
function bpsArg(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = raw ? Number(raw.replace("%", "")) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100))) : fallback;
}

/** Steps 1 and 2 of /start in chat: check the token, preview the agent's sales, link to sign. */
async function capTokenReply(args: string[]): Promise<Reply> {
  const [addr, capArg, impactArg] = args;
  if (!addr) return { text: "Send your token address: /captoken 0x... [cap % of supply] [max impact %]\nExample: /captoken 0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed 0.5 1" };
  let info;
  let pool;
  try {
    info = await readTokenInfo(addr);
    pool = await findWethPool(info.token);
  } catch (e) {
    return { text: e instanceof TokenCheckError ? esc(e.message) : "Base did not answer. Try again in a minute." };
  }
  const existing = await getToken(info.token).catch(() => null);
  if (existing) {
    return {
      text: `${esc(`${info.name} (${info.symbol})`)} is already capped by team account ${code(short(existing.teamAccount))}. Only that account can change it.`,
      buttons: [[{ text: "Open live page", url: livePage(existing) }]],
    };
  }
  const capBps = bpsArg(capArg, 50, 1, 10000);
  const impactBps = bpsArg(impactArg, 100, 10, 500);
  const capRaw = (info.totalSupply * BigInt(capBps)) / BigInt(10000);
  const p = await previewMaxSale(info.token, pool.pool, pool.fee, info.decimals, impactBps);
  const sales = p.maxSale ? (capRaw + p.maxSale.amountIn - BigInt(1)) / p.maxSale.amountIn : null;
  const text = [
    `<b>${esc(`${info.name} (${info.symbol})`)}</b>, read from Base`,
    `Uniswap v3 pool, ${pool.fee / 10000}% fee tier, ${code(eth(pool.wethReserve))} ETH deep`,
    "",
    `Daily cap: ${code(tokens(capRaw.toString(), info.decimals))} ${esc(info.symbol)} (${capBps / 100}% of supply)`,
    `Max price impact per sale: ${code(pct(impactBps))}`,
    "",
    p.maxSale
      ? `Right now the agent could sell about ${code(tokens(p.maxSale.amountIn.toString(), info.decimals))} ${esc(info.symbol)} in one sale, for about ${code(eth(p.maxSale.ethOut))} ETH. Your full daily cap would take about ${sales} sales.`
      : `The pool is too thin: even a small sale would move the price more than ${pct(impactBps)}. The agent would wait.`,
    "",
    "To make it live, sign the cap from your team's Coinbase Base Account. That needs the wallet window, so it happens on the web.",
  ].join("\n");
  return { text, buttons: [[{ text: "Sign the cap on Sellvane", url: `${origin()}/start?token=${info.token}` }]] };
}

type Update = { message?: { chat: { id: number }; text?: string } };

/** Handle one Telegram update. The bot only reads chain data; it never moves funds or signs. */
export async function handleUpdate(u: Update) {
  const msg = u.message;
  if (!msg?.text) return;
  const parts = msg.text.trim().split(/\s+/);
  const cmd = parts[0].split("@")[0].toLowerCase();
  const args = parts.slice(1);
  const chat = msg.chat.id;
  try {
    if (cmd === "/start" || cmd === "/help") return sendMessage(chat, help());
    if (cmd === "/tokens") return sendMessage(chat, await tokensReply());
    if (cmd === "/captoken") return sendMessage(chat, await capTokenReply(args));
    const watch: Record<string, (r: TokenRow) => Promise<Reply>> = {
      "/cap": capReply,
      "/moves": movesReply,
      "/bypass": bypassReply,
      "/pool": poolReply,
      "/verify": verifyReply,
      "/check": capReply,
    };
    const fn = watch[cmd];
    if (!fn) return sendMessage(chat, { text: "I did not get that. Send /help to see what I can do." });
    if (cmd === "/check" && !args[0]) return sendMessage(chat, { text: "Send a token or team account address: /check 0x..." });
    const row = await resolve(args[0]);
    if (row === "bad") return sendMessage(chat, { text: "That is not a Base address. It should be 0x followed by 40 characters." });
    if (!row) return sendMessage(chat, notCapped(args[0]));
    return sendMessage(chat, await fn(row));
  } catch {
    return sendMessage(chat, { text: "Base did not answer just now. Try again in a minute." });
  }
}

export const COMMANDS = [
  { command: "cap", description: "Today's cap, sold, left and reset" },
  { command: "moves", description: "The agent's latest moves and reasons" },
  { command: "bypass", description: "Anything that left outside the cap" },
  { command: "pool", description: "The pool the agent sells into" },
  { command: "verify", description: "Where to check it all on Base" },
  { command: "tokens", description: "Every capped token" },
  { command: "check", description: "Is a token capped? /check 0x..." },
  { command: "captoken", description: "Check your token and preview sales" },
  { command: "help", description: "What Sellvane does" },
];

// Exposed for local previews and tests.
export const replies = { help, capReply, movesReply, bypassReply, poolReply, verifyReply, tokensReply, capTokenReply };
