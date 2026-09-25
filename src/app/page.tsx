import { Nav } from "@/components/Nav";
import { Hero } from "@/components/landing/Hero";

export default function Home() {
  return (
    <div className="relative">
      <Nav variant="overlay" />
      <main>
        <Hero />
      </main>
    </div>
  );
}
