import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { ShareButton } from "@/components/live/ShareButton";
import { LiveView } from "@/components/live/LiveView";

export const metadata: Metadata = {
  title: "Live sell cap | Sellvane",
  description: "The team's daily sell cap, every agent sale and wait, and every token that left the team account, read live from Base.",
};

export default function LivePage() {
  return (
    <>
      <Nav
        back
        cta={<ShareButton />}
        links={[
          { href: "#cap", label: "Today's cap" },
          { href: "#bypass", label: "Bypass watch" },
          { href: "#agent", label: "Agent moves" },
          { href: "#verify", label: "Check it yourself" },
        ]}
      />
      <main>
        <LiveView />
      </main>
    </>
  );
}
