import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { ShareButton } from "@/components/live/ShareButton";
import { LiveView } from "@/components/live/LiveView";
import { getToken } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Live sell cap | Sellvane",
  description: "The team's daily sell cap, every agent sale and wait, and every token that left the team account, read live from Base.",
};

export default async function LivePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Section links only make sense when the token has a live page to jump through.
  const capped = await getToken(token).catch(() => null);
  return (
    <>
      <Nav
        back
        cta={<ShareButton />}
        links={
          capped
            ? [
                { href: "#cap", label: "Today's cap" },
                { href: "#bypass", label: "Bypass watch" },
                { href: "#agent", label: "Agent moves" },
                { href: "#verify", label: "Check it yourself" },
              ]
            : [
                { href: "/launchpad", label: "Capped tokens" },
                { href: "/start", label: "Cap a token" },
              ]
        }
      />
      <main id="main" tabIndex={-1}>
        <LiveView slug={token.toLowerCase()} />
      </main>
    </>
  );
}
