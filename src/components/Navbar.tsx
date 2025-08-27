// components/Navbar.tsx
"use client";

import { useState } from "react";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";

export function NavbarDemo() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: "Fact Checker",
      link: "#fact-checker",
    },
    {
      name: "Why MisIntel?",
      link: "#features",
    },
    {
      name: "How It Works",
      link: "#how-it-works",
    },
    {
      name: "Contact",
      link: "#about",
    },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    const targetId = href.replace('#', '');
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      const navbarHeight = 80; // Adjust based on your navbar height
      const targetPosition = targetElement.offsetTop - navbarHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
    
    // Close mobile menu if open
    setIsMobileMenuOpen(false);
  };

  const handleGetStartedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const targetElement = document.getElementById('fact-checker');
    if (targetElement) {
      const navbarHeight = 80;
      const targetPosition = targetElement.offsetTop - navbarHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
    
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="relative w-full">
      <Navbar className="bg-black/80 backdrop-blur-md border-b border-white/10 fixed top-0 left-0 right-0 z-50">
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              MisIntel
            </h1>
          </NavbarLogo>
          <NavItems 
            items={navItems.map(item => ({
              ...item,
              onClick: (e: React.MouseEvent<HTMLAnchorElement>) => handleNavClick(e, item.link)
            }))} 
            className="text-gray-300 hover:text-white transition-colors duration-200" 
          />
          <div className="flex items-center gap-4">
            <NavbarButton
              onClick={handleGetStartedClick}
              variant="primary"
              className="bg-gradient-to-b from-neutral-50 to-neutral-400 text-black font-semibold hover:from-neutral-100 hover:to-neutral-300 cursor-pointer"
            >
              Get Started
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                MisIntel
              </h1>
            </NavbarLogo>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            className="bg-black/95 backdrop-blur-md"
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={(e) => handleNavClick(e, item.link)}
                className="relative text-neutral-300 hover:text-white py-3 px-4 text-lg transition-all duration-200 block cursor-pointer rounded-md hover:bg-white/10 backdrop-blur-sm"
              >
                {item.name}
              </a>
            ))}
            <div className="flex w-full flex-col gap-4 mt-4">
              <NavbarButton
                onClick={handleGetStartedClick}
                variant="primary"
                className="w-full bg-gradient-to-b from-neutral-50 to-neutral-400 text-black font-semibold hover:from-neutral-100 hover:to-neutral-300 cursor-pointer"
              >
                Get Started
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}

export default NavbarDemo;