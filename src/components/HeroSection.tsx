"use client";

import Link from "next/link";
import { cn } from "@/utils/cn";
import { Button } from "./ui/moving-border";
import { BackgroundBeams } from "./ui/background-beams";

// Spotlight Component (keep this in your /components/ui/Spotlight.tsx)
export const Spotlight = ({
  className,
  fill,
  style
}: {
  className?: string;
  fill?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <svg
      className={cn(
        "animate-spotlight pointer-events-none absolute z-[1] h-[200%] w-[200%]",
        className
      )}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="2200"
          ry="350"
          transform="matrix(-0.85 -0.5 -0.5 0.85 3631.88 2291.09)"
          fill={fill || "white"}
          fillOpacity="0.4"
        />
      </g>
      <defs>
        <filter
          id="filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur"/>
        </filter>
      </defs>
    </svg>
  );
};

// Updated HeroSection with increased height and adjusted title
function HeroSection() {
  const handleFactCheckingClick = () => {
    const targetElement = document.getElementById('fact-checker');
    if (targetElement) {
      const navbarHeight = 80;
      const targetPosition = targetElement.offsetTop - navbarHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleLearnMoreClick = () => {
    const targetElement = document.getElementById('features');
    if (targetElement) {
      const navbarHeight = 80;
      const targetPosition = targetElement.offsetTop - navbarHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative flex h-[45rem] w-full overflow-hidden rounded-md bg-black antialiased md:items-center md:justify-center">
      {/* Grid Background */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 [background-size:40px_40px] select-none",
          "[background-image:linear-gradient(to_right,#171717_1px,transparent_1px),linear-gradient(to_bottom,#171717_1px,transparent_1px)]"
        )}
      />

      {/* Top-Corner Spotlight */}
      <div className="absolute inset-0 overflow-hidden">
        <Spotlight
          className="top-0 left-0 origin-top-left"
          fill="white"
          style={{
            transform: 'translate(-25%, -25%) rotate(-15deg)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl p-4 pt-32 md:pt-32">
        <h1 className="bg-opacity-50 bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-center text-5xl font-bold text-transparent md:text-8xl">
          MisIntel
        </h1>

        <div className="mt-12 space-y-8">
          <p className="mx-auto max-w-lg text-center text-base font-normal text-neutral-300">
            Combat misinformation with <span className="font-semibold text-white">AI-powered verification</span>
          </p>

          <p className="mx-auto max-w-2xl text-center text-base font-normal text-neutral-300">
            Verify news articles, detect deepfakes, and identify misinformation using advanced AI technology.
            Protect yourself and your community from fake news with our comprehensive verification system.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            borderRadius="1.75rem" 
            className="relative bg-transparent text-black dark:text-white border-2 border-transparent hover:border-white transition-all duration-300 cursor-pointer"
            onClick={handleFactCheckingClick}
          >
            Start Fact-Checking
          </Button>
          
          <Button 
            borderRadius="1.75rem" 
            className="relative bg-transparent text-black dark:text-white border-2 border-transparent hover:border-white transition-all duration-300 cursor-pointer"
            onClick={handleLearnMoreClick}
          >
            Learn More
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-4 rounded-[22px] bg-zinc-900">
            <div className="text-3xl font-bold text-white mb-2">99.2%</div>
            <div className="text-sm text-neutral-400">Accuracy Rate</div>
          </div>
          <div className="p-4 rounded-[22px] bg-zinc-900">
            <div className="text-3xl font-bold text-white mb-2">4 AI</div>
            <div className="text-sm text-neutral-400">Verification APIs</div>
          </div>
          <div className="p-4 rounded-[22px] bg-zinc-900">
            <div className="text-3xl font-bold text-white mb-2">&lt;3s</div>
            <div className="text-sm text-neutral-400">Response Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;