import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { LaunchpadView } from "@/components/launchpad/LaunchpadView";

export const metadata: Metadata = {
  title: "Launchpad view | Sellvane",
  description: "Every token a launchpad launched, with each team's daily sell cap, today's sales and any move around the cap, read live from Base.",
};

export default function LaunchpadPage() {
  return (
    <>
      <Nav
        back
        links={[
          { href: "#tokens", label: "Your tokens" },
          { href: "#require", label: "How to require it" },
          { href: "/live", label: "Live cap" },
        ]}
      />
      <main>
        <LaunchpadView />
      </main>
    </>
  );
}
