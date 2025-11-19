import React from "react";

export default function WhatsAppExtension() {
  return (
    <section className="py-20 px-4 bg-muted/50 dark:bg-background">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-8 text-center">
          Try MisIntel on WhatsApp & Web Extension
        </h2>
        <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-12 text-center">
          Experience AI-powered fact checking on your favorite platforms. Use our WhatsApp bot or browser extension for instant verification.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* WhatsApp Bot Image */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="w-full h-64 flex items-center justify-center bg-neutral-900/30 rounded-xl mb-4">
              {/* Replace src with your WhatsApp bot image */}
              <img
                src="/whatsapp-bot.png"
                alt="WhatsApp Bot"
                className="max-h-56 rounded-lg object-contain"
              />
            </div>
            <h3 className="text-xl font-semibold text-neutral-100 mb-2 text-center">
              WhatsApp Bot
            </h3>
            <p className="text-neutral-400 text-sm text-center">
              Chat with MisIntel on WhatsApp for quick fact checks and misinformation detection.
            </p>
          </div>
          {/* Web Extension Image */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="w-full h-64 flex items-center justify-center bg-neutral-900/30 rounded-xl mb-4">
              {/* Replace src with your Web Extension image */}
              <img
                src="/web-extension.png"
                alt="Web Extension"
                className="max-h-56 rounded-lg object-contain"
              />
            </div>
            <h3 className="text-xl font-semibold text-neutral-100 mb-2 text-center">
              Web Extension
            </h3>
            <p className="text-neutral-400 text-sm text-center">
              Use the MisIntel browser extension to verify articles and social posts instantly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}