import { Nav } from "@/components/Nav";
import { Hero } from "@/components/landing/Hero";
import { LiveStrip } from "@/components/landing/LiveStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProofBand } from "@/components/landing/ProofBand";

export default function Home() {
  return (
    <div className="relative">
      <Nav variant="overlay" />
      <main>
        <Hero />
        <LiveStrip />
        <HowItWorks />
        <ProofBand />
      </main>
    </div>
  );
}
