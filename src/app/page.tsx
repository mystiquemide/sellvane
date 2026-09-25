import { Nav } from "@/components/Nav";
import { Hero } from "@/components/landing/Hero";
import { LiveStrip } from "@/components/landing/LiveStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProofBand } from "@/components/landing/ProofBand";
import { Audiences } from "@/components/landing/Audiences";
import { ForLaunchpads } from "@/components/landing/ForLaunchpads";

export default function Home() {
  return (
    <div className="relative">
      <Nav variant="overlay" />
      <main>
        <Hero />
        <LiveStrip />
        <HowItWorks />
        <ProofBand />
        <Audiences />
        <ForLaunchpads />
      </main>
    </div>
  );
}
