import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { LiveStrip } from "@/components/landing/LiveStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProofBand } from "@/components/landing/ProofBand";
import { Audiences } from "@/components/landing/Audiences";
import { ForLaunchpads } from "@/components/landing/ForLaunchpads";
import { BuiltWith } from "@/components/landing/BuiltWith";

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
        <BuiltWith />
      </main>
      <Footer />
    </div>
  );
}
