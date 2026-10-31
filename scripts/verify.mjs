// Kiểm tra headless: screenshot từng chương ở desktop + mobile, gom lỗi console/WebGL, đếm WebGL context.
//
//   node scripts/verify.mjs [--port 4173] [--out verify] [--chapters hero,about] [--steps 1]
//                           [--viewports desktop,laptop,tablet,mobile] [--reduced] [--boundaries] [--path "/?debug"]
//                           [--base https://site.pages.dev] [--projects] [--gpu]
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
// --base https://….pages.dev để kiểm tra bản đã deploy thay cho server cục bộ
const origin = opt("base", `http://localhost:${port}`).replace(/\/$/, "");
const url = `${origin}${opt("path", "/?debug")}`;

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: args.includes("--gpu")
    ? ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"]          // GPU thật (Windows) — số đo thời gian đại diện hơn
    : ["--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const errors = [];
const report = { url, reduced, chapters: [], contexts: {}, peakContexts: 0, overflow: {}, edges: {}, errors };
const SIZES = {
  desktop: { width: 1440, height: 900 }, laptop: { width: 1280, height: 720 },
  tablet: { width: 820, height: 1180 }, mobile: { width: 375, height: 812 },
};

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
  // thời gian preloader: tài nguyên tải xong → preloader biến mất (≤ 2.2 s), mở lại trong phiên (≤ 0.8 s)
  if (name === viewports[0] && !report.preloader) {
    const tail = () => page.evaluate(() => {
      const t = (n) => performance.getEntriesByName(n)[0]?.startTime;
      return Math.round(t("preloader:done") - t("preloader:loaded"));
    });
    const first = await tail();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.getEntriesByName("preloader:done").length > 0, null, { timeout: 120000 });
    report.preloader = { firstMs: first, repeatMs: await tail() };
    await page.waitForTimeout(600);
  }

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

// --projects: kịch bản overlay chi tiết dự án (sách trên desktop/laptop/tablet ≥ 900px, cuộn trên mobile)
async function projects(name) {
  const viewport = SIZES[name];
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: name === "mobile", hasTouch: name === "mobile" });
  page.setDefaultTimeout(120000);
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${name} projects] ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${name} projects] pageerror: ${e.message}`));
  const ready = () => page.waitForFunction(() => { const p = document.querySelector(".preloader"); return !p || getComputedStyle(p).display === "none"; }, null, { timeout: 120000 });
  const shot = (f) => page.screenshot({ path: path.join(out, `${name}-pv-${f}.png`) });
  const pv = report.projects[name] = {};

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await ready();
  await page.waitForTimeout(800);
  await page.evaluate(() => { const y = scrollY + document.getElementById("projects").getBoundingClientRect().top + innerHeight * 0.3; window.__lenis.scrollTo(y, { immediate: true, force: true }); });
  await page.waitForTimeout(2200);
  await page.focus(".pcard .pc-hit");
  await page.keyboard.press("Enter");                       // bàn phím: Enter trên card mở overlay
  await page.waitForTimeout(1800);
  pv.open = await page.evaluate(() => ({ hidden: document.getElementById("project-view").hidden, mode: document.getElementById("project-view").dataset.mode, hash: location.hash, mainInert: document.querySelector("main").inert }));
  await shot("1-open");
  if (pv.open.mode === "book") {
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(1500);
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(1500);
    pv.afterArrows = await page.$eval(".pv-pageno", (e) => e.textContent);
    await shot("2-arrows");
    // kéo góc trang nửa chừng rồi chụp trang đang lật dở
    const c = await page.$eval(".pv-corner-next", (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.86 }; });
    const pw = await page.$eval(".pv-spread", (e) => e.getBoundingClientRect().width / 2);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) { await page.mouse.move(c.x - (pw * 0.62 * k) / 12, c.y - k * 2); await page.waitForTimeout(30); }
    await page.waitForTimeout(400);
    pv.dragMid = await page.evaluate(() => ({ strips: document.querySelectorAll(".pv-strip").length, tt: getComputedStyle(document.querySelector(".pv-curl") ?? document.body).getPropertyValue("--tt"), buildMs: window.__bookBuildMs ?? null }));
    await shot("3-drag");
    await page.mouse.up();
    await page.waitForTimeout(1400);
    pv.afterDrag = await page.$eval(".pv-pageno", (e) => e.textContent);
  } else {
    // chế độ cuộn: 3 vị trí
    for (const [k, f] of [[1, 0.0], [2, 0.45], [3, 0.85]]) {
      await page.$eval(".pv-scroll", (e, f) => e.scrollTo(0, (e.scrollHeight - e.clientHeight) * f), f);
      await page.waitForTimeout(1600);
      await shot(`scroll-${k}`);
    }
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1600);
  pv.afterEsc = await page.evaluate(() => ({ hidden: document.getElementById("project-view").hidden, focusOnCard: document.activeElement?.classList.contains("pc-hit") ?? false, hash: location.hash, mainInert: document.querySelector("main").inert }));
  if (!pv.afterEsc.hidden || !pv.afterEsc.focusOnCard) errors.push(`[${name} projects] Esc: overlay hidden=${pv.afterEsc.hidden} focusOnCard=${pv.afterEsc.focusOnCard}`);

  // mở thẳng link #project/die-01: overlay phải hiện sau preloader
  await page.goto(`${url.split("#")[0]}#project/die-01`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.waitForTimeout(2200);
  pv.deepLink = await page.evaluate(() => ({ hidden: document.getElementById("project-view").hidden, title: document.getElementById("pv-title").textContent }));
  if (pv.deepLink.hidden) errors.push(`[${name} projects] deep link #project/die-01 did not open the overlay`);
  await shot("4-deeplink");
  await page.close();
}

if (flag("projects")) {
  report.projects = {};
  for (const v of viewports) await projects(v);
} else {
  for (const v of viewports) report.chapters = await run(v);
}
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
if (report.projects) console.log(JSON.stringify(report.projects, null, 1));
console.log(`contexts peak ${report.peakContexts}; per chapter ${JSON.stringify(report.contexts)}`);
console.log(errors.length ? errors.join("\n") : `OK: ${report.chapters.length} chapters, no console errors`);
await browser.close();
process.exit(errors.length ? 1 : 0);
