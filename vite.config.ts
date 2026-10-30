import { defineConfig } from "vite";

export default defineConfig({
  // mỗi dev server song song (subagent) dùng cache riêng: VITE_CACHE_DIR=node_modules/.vite-A
  cacheDir: process.env.VITE_CACHE_DIR ?? "node_modules/.vite",
  server: { port: 5173 },
  preview: { port: 4173 },
  optimizeDeps: {
    // khai báo trước để dev server không phải tối ưu lại (và reload trang) giữa chừng
    include: ["gsap", "gsap/ScrollTrigger", "gsap/SplitText", "gsap/Flip", "lenis", "three128"],
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
});
