// components/Footer.tsx
import React from "react";
import { Mail, Globe, Shield, Zap, Search, Brain, FileText, BookOpen } from "lucide-react";

function Footer() {
  return (
    <footer className="relative py-16 px-4 bg-muted/50 dark:bg-background border-t border-white/10">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-muted/50 dark:bg-background"></div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-4">
              MisIntel
            </h3>
            <p className="text-neutral-400 mb-6 leading-relaxed max-w-md">
              Empowering users to combat misinformation with AI-powered verification tools. 
              Verify news, detect deepfakes, and build media literacy skills.
            </p>
            <div className="flex space-x-4">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-neutral-300 border border-white/10">
                <Search className="h-4 w-4" />
              </div>
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-neutral-300 border border-white/10">
                <Brain className="h-4 w-4" />
              </div>
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-neutral-300 border border-white/10">
                <FileText className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-neutral-100 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#fact-checker" className="text-neutral-400 hover:text-neutral-100 transition-colors duration-200 text-sm flex items-center">
                  <Search className="h-3 w-3 mr-2" />
                  Fact Checker
                </a>
              </li>
              <li>
                <a href="#features" className="text-neutral-400 hover:text-neutral-100 transition-colors duration-200 text-sm flex items-center">
                  <Zap className="h-3 w-3 mr-2" />
                  Features
                </a>
              </li>
              <li>
                <a href="#trending-news" className="text-neutral-400 hover:text-neutral-100 transition-colors duration-200 text-sm flex items-center">
                  <BookOpen className="h-3 w-3 mr-2" />
                  News
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Info */}
          <div>
            <h4 className="text-lg font-semibold text-neutral-100 mb-4">
              Contact & Info
            </h4>
            <ul className="space-y-3">
              <li className="text-neutral-400 text-sm flex items-center">
                <Mail className="h-3 w-3 mr-2" />
                support@misintel.ai
              </li>
              <li className="text-neutral-400 text-sm flex items-center">
                <Globe className="h-3 w-3 mr-2" />
                MisIntel.ai
              </li>
              <li className="text-neutral-400 text-sm flex items-center">
                <Shield className="h-3 w-3 mr-2" />
                Privacy First
              </li>
              <li className="text-neutral-400 text-sm flex items-center">
                <Zap className="h-3 w-3 mr-2" />
                Always Free
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-neutral-400 text-sm mb-4 md:mb-0">
              © 2025 MisIntel.
            </div>
            <div className="flex space-x-6 text-sm">
              <p className="text-neutral-400 hover:text-neutral-100 transition-colors duration-200">
                Crafted By Team T-REX
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;