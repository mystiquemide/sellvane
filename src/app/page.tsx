import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { featuredSlug } from "@/lib/featured";
import { Hero } from "@/components/landing/Hero";
import { LiveStrip } from "@/components/landing/LiveStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProofBand } from "@/components/landing/ProofBand";
import { Audiences } from "@/components/landing/Audiences";
import { ForLaunchpads } from "@/components/landing/ForLaunchpads";
import { BuiltWith } from "@/components/landing/BuiltWith";

export default function Home() {
  const slug = featuredSlug();
  return (
    <div className="relative">
      <Nav variant="overlay" />
      <main id="main" tabIndex={-1}>
        <Hero />
        <LiveStrip slug={slug} />
        <ProofBand />
        <HowItWorks />
        <Audiences slug={slug} />
        <ForLaunchpads />
        <BuiltWith />
      </main>
      <Footer />
    </div>
  );
}
