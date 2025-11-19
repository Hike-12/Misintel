"use client";

import React from "react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

function CallToAction() {
  const handleStartVerifyingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const targetElement = document.getElementById('fact-checker');
    if (targetElement) {
      const navbarHeight = 80; // Adjust based on your navbar height
      const targetPosition = targetElement.offsetTop - navbarHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="py-20 relative bg-muted/50 dark:bg-background">
      {/* Call to Action */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative rounded-3xl p-8 text-center border border-white/10">
          {/* Card Glowing Effect */}
          <div className="absolute inset-0 rounded-3xl">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
            />
          </div>
                   
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-4">
              Ready to Combat Misinformation?
            </h3>
            <p className="text-neutral-400 mb-6 text-lg max-w-2xl mx-auto">
              Join thousands of users who trust MisIntel to verify information before sharing.
            </p>
                     
            {/* Button with Glowing Effect */}
            <div className="relative inline-block rounded-lg">
              <div className="absolute inset-0 rounded-lg">
                <GlowingEffect
                  spread={30}
                  glow={true}
                  disabled={false}
                  proximity={48}
                  inactiveZone={0.01}
                />
              </div>
              <button
                onClick={handleStartVerifyingClick}
                className="relative inline-block bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 border border-white/20 z-20 backdrop-blur-sm cursor-pointer"
              >
                Start Verifying Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallToAction;