"use client";

import React from "react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Target, Search, Zap, BookOpen, Shield, Cpu, Clock, Eye, Heart } from "lucide-react";
import SplineGlobe from "./SplineGlobe";
import SilverEarth from "./SplineGlobe";


function FeaturedStats() {
  const stats = [
    {
      value: "4",
      label: "AI Models",
      icon: <Cpu className="h-4 w-4 text-black dark:text-neutral-400" />,
      area: "md:[grid-area:1/1/2/4]"
    },
    {
      value: "24/7",
      label: "Availability",
      icon: <Clock className="h-4 w-4 text-black dark:text-neutral-400" />,
      area: "md:[grid-area:1/4/2/7]"
    },
    {
      value: "100%",
      label: "Privacy",
      icon: <Eye className="h-4 w-4 text-black dark:text-neutral-400" />,
      area: "md:[grid-area:1/7/2/10]"
    },
    {
      value: "Free",
      label: "Forever",
      icon: <Heart className="h-4 w-4 text-black dark:text-neutral-400" />,
      area: "md:[grid-area:1/10/2/13]"
    },
  ];

  return (
    <div className="py-20 px-4 relative bg-muted/50 dark:bg-background" id="why-misintel">
      <div className="text-center mb-16 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-6 pb-2">
          Why Choose MisIntel?
        </h2>
        <p className="text-neutral-300 text-lg max-w-3xl mx-auto leading-relaxed">
          Advanced AI technology meets comprehensive fact-checking to give you the most reliable misinformation detection available.
        </p>
      </div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Features Grid - Using the exact layout from your screenshot */}
        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2 mb-16">
          {/* Top Left */}
          <GridItem
            area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
            icon={<Target className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="99.2% Accuracy"
            description="Industry-leading accuracy in detecting misinformation across text, images, and URLs."
            slim={false}
          />

          {/* Bottom Left */}
          <GridItem
            area="md:[grid-area:2/1/3/7] xl:[grid-area:2/1/3/5]"
            icon={<Search className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Multi-Source Verification"
            description="Combines 4 powerful APIs for comprehensive content analysis."
            slim={false}
          />

          {/* Center - Slimmer Width Box */}
          <GridItem
  area="md:[grid-area:1/5/3/9] xl:[grid-area:1/5/3/9]"
  icon={<Zap className="h-5 w-5 text-white" />}
  title={
    <div className="text-center">
      <div className="mb-1 flex justify-center">
        <SilverEarth />
      </div>
      <div className="text-lg md:text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mt-2">
        Real-time Analysis
      </div>
    </div>
  }
  description="Instant verification results in under 3 seconds with our optimized pipeline."
  slim={true}
/>
          {/* Top Right */}
          <GridItem
            area="md:[grid-area:1/9/2/13] xl:[grid-area:1/9/2/13]"
            icon={<BookOpen className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Educational Insights"
            description="Learn why content is flagged with detailed explanations."
            slim={false}
          />

          {/* Bottom Right */}
          <GridItem
            area="md:[grid-area:2/9/3/13] xl:[grid-area:2/9/3/13]"
            icon={<Shield className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Privacy Protected"
            description="Your data is never stored or shared. Complete privacy guarantees."
            slim={false}
          />
        </ul>
        
        {/* Additional stats section with glowing effect */}
        <div className="max-w-6xl mx-auto">
          <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-1">
            {stats.map((stat, index) => (
              <StatsItem
                key={index}
                area={stat.area}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  slim?: boolean;
}

const GridItem = ({ area, icon, title, description, slim = false }: GridItemProps) => {
  return (
    <li className={`list-none ${area} ${slim ? 'min-h-[12rem]' : 'min-h-[14rem]'}`}>
      <div className={`relative h-full rounded-2xl border border-white/10 p-2 md:rounded-3xl md:p-3 ${slim ? 'border-white/15' : ''}`}>
        <GlowingEffect
          spread={slim ? 30 : 40}
          glow={true}
          disabled={false}
          proximity={slim ? 48 : 64}
          inactiveZone={0.01}
        />
        <div className={`border-0.75 relative flex h-full flex-col justify-between overflow-hidden rounded-xl p-6 md:p-6 ${slim ? 'gap-4' : 'gap-6'}`}>
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className={`w-fit rounded-lg border border-neutral-600 p-2 ${slim ? 'p-1.5' : ''}`}>
              {icon}
            </div>
            <div className={`space-y-3 ${slim ? 'space-y-2' : ''}`}>
              <h3 className={`font-sans font-semibold text-balance text-neutral-100 ${slim ? 'text-md md:text-lg' : 'text-lg md:text-xl'}`}>
                {title}
              </h3>
              <p className={`font-sans text-neutral-400 leading-relaxed ${slim ? 'text-xs md:text-sm' : 'text-sm md:text-sm'}`}>
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

interface StatsItemProps {
  area: string;
  icon: React.ReactNode;
  value: string;
  label: string;
}

const StatsItem = ({ area, icon, value, label }: StatsItemProps) => {
  return (
    <li className={`min-h-[8rem] list-none ${area}`}>
      <div className="relative h-full rounded-2xl border border-white/10 p-2 md:rounded-2xl md:p-3">
        <GlowingEffect
          spread={20}
          glow={true}
          disabled={false}
          proximity={32}
          inactiveZone={0.01}
        />
        <div className="border-0.75 relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl p-4 md:p-4">
          <div className="w-fit rounded-lg border border-neutral-600 p-2">
            {icon}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-100 md:text-3xl">
              {value}
            </div>
            <div className="text-xs text-neutral-400 md:text-sm">
              {label}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export default FeaturedStats;