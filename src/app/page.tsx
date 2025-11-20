// app/page.tsx
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FactCheckTool from '@/components/FactCheckTool';
import FeaturedStats from '@/components/FeaturedStats';
import CallToAction from '@/components/CallToAction';
import WhatsAppExtension from '@/components/WhatsAppExtension';
import Footer from '@/components/Footer';
import TrendingNews from '@/components/TrendingNews';
import CrisisBanner from '@/components/CrisisBanner';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <CrisisBanner /> 
      <div>
        <section id="home">
          <HeroSection />
        </section>
        
        <section id="fact-checker">
          <FactCheckTool />
        </section>

        <section id="trending-news" className="py-12">
          <TrendingNews />
        </section>

        <section className="py-12">
          <FeaturedStats />
        </section>
        
        <section id="features" className="py-12">
          <WhatsAppExtension />
        </section>

        <section className="py-12">
          <CallToAction />
        </section>
        
        <section id="about">
          <Footer />
        </section>
      </div>
    </main>
  );
}