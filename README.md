# Sellvane

A public daily sell cap on a team's unlocked tokens, enforced on Base. An AI agent sells inside the cap, only when the pool can take the sale.

Live: https://sellvane.midelabs.xyz · Bot: https://t.me/sellvane_bot · X: https://x.com/sellvane

## The problem

Token unlocks are when teams dump on their holders. Vesting schedules say when tokens unlock, not how fast they get sold, so holders find out after the price is gone.

## How it works

1. The team signs one Coinbase spend permission from its Base smart account: at most N tokens per day, spendable only by the Sellvane seller contract.
2. The cap is enforced by Coinbase's SpendPermissionManager on-chain. Sellvane can't sell more than the cap, and the team can revoke at any time.
3. Every 10 minutes the agent quotes the Uniswap v3 pool, computes a safe slice from price impact, and asks an LLM to pick SELL (a fraction of that slice) or WAIT. Anything invalid becomes WAIT. Every sale is simulated before it's sent.
4. The live page shows the cap, what's been sold, the agent's reasons, and a bypass watch that flags any token leaving the team account outside the cap.

Anyone can verify it: the cap, the sales and every transfer are read straight from Base.

## Try it

- See a live cap: https://sellvane.midelabs.xyz/live
- Put a cap on your token: https://sellvane.midelabs.xyz/start (or try it with the DEGEN sample, no signing needed to preview)
- For launchpads: https://sellvane.midelabs.xyz/launchpad

## Contracts (Base mainnet, verified)

| Contract | Address |
|---|---|
| SellvaneSeller | [0x719a235Be27F0b7B7F82775aFBEA6a2dE6264fe6](https://basescan.org/address/0x719a235Be27F0b7B7F82775aFBEA6a2dE6264fe6#code) |
| Test token | [0xe7f3ee414aC0D341763dCE8E3AB6A2f630A8C8Cf](https://basescan.org/address/0xe7f3ee414aC0D341763dCE8E3AB6A2f630A8C8Cf#code) |
| Coinbase SpendPermissionManager | [0xf85210B21cC50302F477BA56686d2019dC9b67Ad](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad) |

## Stack

Next.js, viem, Base Account SDK, Coinbase spend permissions, Uniswap v3, Groq (`openai/gpt-oss-120b`), Postgres (Neon), Foundry.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in RPC, keys, database
npm run db:migrate
npm run dev
npm test                     # unit tests
cd contracts && forge test --fork-url $BASE_RPC_URL   # fork tests
```

`npm run tick` runs one agent cycle. In production a cron calls `POST /api/tick` with `TICK_SECRET`.

## License

MIT
