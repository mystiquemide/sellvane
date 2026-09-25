import Image, { type StaticImageData } from "next/image";
import holderStreet from "../../../public/images/holder-street.jpg";
import holderDesk from "../../../public/images/holder-desk.jpg";
import teamTable from "../../../public/images/team-table.jpg";
import teamOffice from "../../../public/images/team-office.jpg";

type Point = { title: string; body: string; icon: React.ReactNode };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...stroke}>
    <path d={d} />
  </svg>
);

const HOLDERS: Point[] = [
  { title: "One number per day", body: "The cap is public and fixed on chain. Nobody can raise it quietly.", icon: <Icon d="M4 12h16M4 6h16M4 18h10" /> },
  { title: "Every move, explained", body: "Each sale and each wait comes with a plain reason and a link to the transaction.", icon: <Icon d="M5 5h14v10H9l-4 4z" /> },
  { title: "Workarounds get flagged", body: "If tokens leave the team account any other way, the page shows it in red.", icon: <Icon d="M12 4 3 20h18zM12 10v4M12 17h.01" /> },
];

const TEAMS: Point[] = [
  { title: "Sign once", body: "One permission from your Base Account sets the daily cap. You can revoke it any time.", icon: <Icon d="M3 17c2.5 0 3.5-6 6-6s1.5 5 4 5 2.5-3 4-3M3 21h18" /> },
  { title: "Proceeds come straight back", body: "The ETH from every sale lands in your team account in the same transaction.", icon: <Icon d="M12 4v12M6 10l6 6 6-6M5 20h14" /> },
  { title: "Never over the line", body: "The agent cannot sell past your cap, and never without a price floor.", icon: <Icon d="M4 20h16M7 16V9M12 16V5M17 16v-4" /> },
];

function Block({
  id,
  label,
  title,
  intro,
  photos,
  points,
  photosFirst,
}: {
  id: string;
  label: string;
  title: string;
  intro: string;
  photos: [StaticImageData, string][];
  points: Point[];
  photosFirst: boolean;
}) {
  return (
    <div aria-labelledby={id} className="py-20 md:py-[120px]">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className={photosFirst ? "md:order-2" : ""}>
          <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">{label}</p>
          <h2 id={id} className="mt-4 font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
            {title}
          </h2>
          <p className="mt-6 max-w-[520px] text-lg leading-[1.6] text-muted">{intro}</p>
        </div>
        <div className={`grid grid-cols-2 gap-2 ${photosFirst ? "md:order-1" : ""}`}>
          {photos.map(([src, alt]) => (
            <div key={alt} className="relative aspect-[3/4] overflow-hidden">
              <Image src={src} alt={alt} fill placeholder="blur" sizes="(min-width: 768px) 300px, 50vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-14 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-12">
        {points.map((p) => (
          <li key={p.title}>
            <span className="text-ink">{p.icon}</span>
            <h3 className="mt-4 text-xl font-bold tracking-[-0.02em]">{p.title}</h3>
            <p className="mt-3 text-base leading-[1.6] text-muted">{p.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Audiences() {
  return (
    <section aria-label="Who Sellvane is for" className="bg-canvas">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <Block
          id="holders-title"
          label="For holders"
          title="Know the most that can hit the market today."
          intro="When team tokens unlock, holders ask one question: how much can they sell on us? Sellvane answers with a number the chain enforces."
          photos={[
            [holderStreet, "A man sitting on a street step, checking his phone"],
            [holderDesk, "Hands holding a phone over a wooden desk"],
          ]}
          points={HOLDERS}
          photosFirst={false}
        />
        <div className="border-t border-dashed border-line" />
        <Block
          id="teams-title"
          label="For teams"
          title="Get paid for your work without crashing your own chart."
          intro="Teams sell to fund the building. Sellvane sells in slices the pool can take, so holders see a plan instead of a dump."
          photos={[
            [teamTable, "A small team working on laptops around a wooden table"],
            [teamOffice, "A team talking around a table in a bright office"],
          ]}
          points={TEAMS}
          photosFirst
        />
      </div>
    </section>
  );
}
