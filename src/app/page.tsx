// app/page.tsx
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FactCheckTool from '@/components/FactCheckTool';
import FeaturedStats from '@/components/FeaturedStats';
import WhyTruthGuard from '@/components/WhyTruthGuard';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <div> {/* Remove the pt-20 padding */}
        <section id="home">
          <HeroSection />
        </section>
        
        <section id="fact-checker">
          <FactCheckTool />
        </section>
        
        <section id="features">
          <FeaturedStats />
        </section>
        
        <section id="how-it-works">
          <WhyTruthGuard />
        </section>
        
        <section id="about">
          <Footer />
        </section>
      </div>
    </main>
  );
}