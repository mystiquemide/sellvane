import { Nav } from "@/components/Nav";
import { Hero } from "@/components/landing/Hero";
import { LiveStrip } from "@/components/landing/LiveStrip";

export default function Home() {
  return (
    <div className="relative">
      <Nav variant="overlay" />
      <main>
        <Hero />
        <LiveStrip />
      </main>
    </div>
  );
}
