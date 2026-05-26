import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/sudoku-app/",
  server: {
    port: 3000,
    strictPort: true, // don't try another port automatically
    host: true, // optional: listen on 0.0.0.0
  },
});
