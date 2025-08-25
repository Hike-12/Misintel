// components/ui/Spotlight.tsx
import React from "react";
import { cn } from "@/utils/cn";

type SpotlightProps = {
  className?: string;
  fill?: string;
  style?: React.CSSProperties;
};

export const Spotlight = ({ className, fill, style }: SpotlightProps) => {
  return (
    <svg
      className={cn(
        "animate-spotlight pointer-events-none absolute z-[1]",
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
          rx="2500"  // Wider ellipse
          ry="400"   // Taller ellipse
          transform="matrix(-0.8 -0.6 -0.6 0.8 3631.88 2291.09)" // Adjusted angle
          fill={fill || "white"}
          fillOpacity="0.35" // More visible
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