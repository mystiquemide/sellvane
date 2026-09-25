import { basescanAddress } from "@/lib/format";
import { CopyValue } from "../CopyValue";
import type { TokenState } from "@/lib/useToken";

const MANAGER = "0xf85210B21cC50302F477BA56686d2019dC9b67Ad";
const SELLER_SOURCE = "https://github.com/mystiquemide/sellvane/blob/main/contracts/src/SellvaneSeller.sol";

export function CheckYourself({ s }: { s: TokenState }) {
  const d = s.status === "ready" ? s.data : null;
  const steps = [
    {
      title: "The cap is held by Coinbase's contract, not ours",
      body: "The team's limit lives in the Spend Permission Manager on Base. This is the permission Sellvane sells under:",
      mono: d ? <CopyValue value={d.sellvanePermission} label="permission hash" /> : null,
      link: { href: basescanAddress(MANAGER), label: "Spend Permission Manager on BaseScan" },
    },
    {
      title: "The seller cannot keep the money",
      body: "Every sale sends the ETH to the team account in the same transaction. The contract has no withdraw function and refuses stray ETH. Read the source:",
      mono: d ? <CopyValue value={d.seller} label="seller contract address" /> : null,
      link: { href: SELLER_SOURCE, label: "SellvaneSeller.sol on GitHub" },
    },
    {
      title: "Every token that left the team account",
      body: "BaseScan lists every transfer out of the team account. Compare it with the bypass watch above.",
      mono: d ? <CopyValue value={d.team.address} label="team account address" /> : null,
      link: d ? { href: `https://basescan.org/token/${d.token.address}?a=${d.team.address}`, label: "Team account transfers on BaseScan" } : null,
    },
  ];

  return (
    <section id="verify" aria-labelledby="verify-title" className="scroll-mt-6 mx-auto mt-16 max-w-[1200px] px-4 pb-24 md:px-6 md:pb-[120px]">
      <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">Check it yourself</p>
      <h2 id="verify-title" className="mt-4 font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
        Don&apos;t trust this page.
      </h2>
      <p className="mt-4 max-w-[640px] text-lg leading-[1.6] text-muted">The cap, the sales and every transfer above can be checked on Base without us. Here is where to look.</p>

      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
        {steps.map((st, i) => (
          <li key={st.title} className="border-t border-dashed border-line pt-6">
            <span className="font-mono text-sm text-muted">0{i + 1}</span>
            <h3 className="mt-4 text-xl font-bold tracking-[-0.02em]">{st.title}</h3>
            <p className="mt-3 text-base leading-[1.6] text-muted">{st.body}</p>
            {st.mono ? <div className="mt-3">{st.mono}</div> : <div className="mt-3 h-4 w-40 rounded-full bg-line" aria-hidden="true" />}
            {st.link ? (
              <a href={st.link.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block font-medium underline underline-offset-4">
                {st.link.label} →
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
