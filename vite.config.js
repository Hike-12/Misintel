import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "public",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "src/extension/popup.tsx"),
        background: path.resolve(__dirname, "src/extension/background.js"),
        content: path.resolve(__dirname, "src/extension/content.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'popup' ? 'popup.js' : '[name].js';
        },
        format: 'es'
      },
    },
  },
});