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
      },
      output: {
        entryFileNames: "popup.js",
      },
    },
  },
});