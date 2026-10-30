// Kiểm tra headless: screenshot từng chương ở desktop + mobile, gom lỗi console/WebGL, đếm WebGL context.
//
//   node scripts/verify.mjs [--port 4173] [--out verify] [--chapters c01,c02] [--steps 1]
//                           [--viewports desktop,mobile] [--reduced] [--boundaries] [--path "/?debug"]
//
// Server phải chạy sẵn: `npx vite --port 5174 --strictPort` (dev) hoặc `npm run build && npx vite preview --port 4173`.
// --chapters c00 chụp thêm preloader trong lúc tải. --steps N chụp N điểm đều trong quãng pin của mỗi chương.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def; };
const flag = (name) => args.includes(`--${name}`);

const port = opt("port", "4173");
const out = opt("out", "verify");
const only = opt("chapters", "")?.split(",").map((s) => s.trim()).filter(Boolean);
const steps = Math.max(1, Number(opt("steps", "1")));
const viewports = opt("viewports", "desktop,mobile").split(",");
const reduced = flag("reduced");
const boundaries = flag("boundaries");
const url = `http://localhost:${port}${opt("path", "/?debug")}`;
const origin = `http://localhost:${port}`;

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const errors = [];
const report = { url, reduced, chapters: [], contexts: {}, peakContexts: 0, overflow: {}, edges: {}, errors };
const SIZES = { desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } };

async function run(name) {
  const viewport = SIZES[name];
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: name === "mobile", hasTouch: name === "mobile" });
  // SwiftShader + nhiều trình duyệt verify song song: một frame có thể mất hàng chục giây
  page.setDefaultTimeout(120000);
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" || /WebGL|GL_INVALID|too many active/i.test(t)) errors.push(`[${name}] ${m.type()}: ${t}`);
  });
  page.on("pageerror", (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (r.url().startsWith(origin)) errors.push(`[${name}] requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.url().startsWith(origin) && r.status() >= 400) errors.push(`[${name}] HTTP ${r.status()}: ${r.url()}`); });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (!only.length || only.includes("c00")) {
    for (const ms of [600, 1600]) {
      await page.waitForTimeout(ms === 600 ? 600 : 1000);
      await page.screenshot({ path: path.join(out, `${name}-c00-${ms}ms.png`) });
    }
  }
  await page.waitForFunction(() => {
    const p = document.querySelector(".preloader");
    return !p || getComputedStyle(p).display === "none";
  }, null, { timeout: 120000 });
  await page.waitForTimeout(600);

  const ids = (await page.$$eval("section.chapter", (els) => els.map((e) => e.id))).filter((id) => !only.length || only.includes(id));
  for (const id of ids) {
    for (let k = 0; k < steps; k++) {
      const f = steps === 1 ? 0.5 : (k + 0.5) / steps;
      await page.evaluate(([id, f]) => {
        const el = document.getElementById(id);
        const r = el.getBoundingClientRect();
        const y = scrollY + r.top + Math.max(0, (r.height - innerHeight) * f);   // điểm f trong quãng pin
        if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
      }, [id, f]);
      await page.waitForTimeout(1800);
      const file = steps === 1 ? `${name}-${id}.png` : `${name}-${id}-${k + 1}.png`;
      await page.screenshot({ path: path.join(out, file) });
      const ctx = await page.evaluate(() => window.__signal?.contexts ?? -1);
      report.contexts[`${name}-${id}${steps > 1 ? `-${k + 1}` : ""}`] = ctx;
    }
    if (boundaries) {
      // mép trên của chương ở giữa màn hình: hai scene đang dissolve
      await page.evaluate((id) => {
        const r = document.getElementById(id).getBoundingClientRect();
        const y = scrollY + r.top - innerHeight * 0.5;
        if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
      }, id);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(out, `${name}-${id}-edge.png`) });
      const last = await page.evaluate(() => window.__signal?.stage?.last ?? null);
      if (last) report.edges[`${name}-${id}`] = { a: last.a, b: last.b, mix: Number(last.mix.toFixed(2)) };
    }
  }
  report.peakContexts = Math.max(report.peakContexts, await page.evaluate(() => window.__signal?.peakContexts ?? -1));
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  report.overflow[name] = ov;
  if (ov > 1) errors.push(`[${name}] horizontal overflow ${ov}px`);
  await page.close();
  return ids;
}

for (const v of viewports) report.chapters = await run(v);
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
console.log(`contexts peak ${report.peakContexts}; per chapter ${JSON.stringify(report.contexts)}`);
console.log(errors.length ? errors.join("\n") : `OK: ${report.chapters.length} chapters, no console errors`);
await browser.close();
process.exit(errors.length ? 1 : 0);
