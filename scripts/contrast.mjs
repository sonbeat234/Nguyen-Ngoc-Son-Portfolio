// Đo tương phản WCAG của chữ trên nền shader (nền đổi theo thời gian):
//   node scripts/contrast.mjs [--port 5173] [--out verify-v4] [--viewports desktop,mobile] [--sections hero,about]
// Mỗi section × 3 vị trí cuộn × 3 khung hình: chụp màn hình khi mọi khối chữ trong suốt (color /
// -webkit-text-fill-color: transparent, bỏ text-shadow, bỏ nền clip-text) → nền thật sau chữ. PNG giải mã bằng
// canvas trong một trang phụ. Độ sáng nền lấy phân vị 95 (chữ sáng) hoặc 5 (chữ tối) — trường hợp xấu nhất,
// trộn màu chữ với nền theo opacity hiệu dụng (tích opacity tổ tiên × alpha màu) rồi tính tỉ lệ WCAG.
// Ngưỡng: chữ thường 4.5:1; chữ lớn (≥ 24px, hoặc ≥ 18.66px và đậm ≥ 700) 3:1.
// Chỉ đo khối nằm trong dải đọc (tâm khối ở 8–92% chiều cao màn) và đang hiện (opacity hiệu dụng ≥ 0.5;
// từ scrub được đo cả khi mờ). Xuất <out>/contrast.json; exit 1 nếu có khối trượt.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const port = opt("port", "5173");
const out = opt("out", "verify-v4");
const origin = opt("base", `http://localhost:${port}`).replace(/\/$/, "");
const url = `${origin}/?debug`;
const viewports = opt("viewports", "desktop,mobile").split(",");
const onlySections = opt("sections", "").split(",").filter(Boolean);
const SIZES = { desktop: { width: 1440, height: 900 }, laptop: { width: 1280, height: 720 }, tablet: { width: 820, height: 1180 }, mobile: { width: 375, height: 812 } };
const POS = [0.15, 0.5, 0.85];
const FRAMES = 3;
const shots = args.includes("--shots");   // lưu ảnh nền (chữ trong suốt) của khung đầu mỗi vị trí

// tiêu đề, đoạn văn, nhãn, datasheet, card, CV
const SELECTORS = [
  ".hero-eyebrow", ".hero-name", ".hero-tag", ".hero-lede", ".hero-readout dt", ".hero-readout dd", ".hero-ctas .btn",
  ".sec-head .eyebrow", ".sec-title", ".sec-sub",
  ".about-intro", ".about-intro strong", ".ds-cap", ".ds thead th", ".ds tbody th", ".ds-pin", ".ds-val", ".score-num", ".score-label", ".score-max", ".pkg-cap",
  ".flow-head .eyebrow", ".flow-sub", ".flow-count", ".flow-stage-name", ".stage.is-active .stage-num", ".stage.is-active .stage-title",
  ".stage.is-active .stage-text", ".stage.is-active .stage-tags", "#flow.is-linear .stage-title", "#flow.is-linear .stage-text",
  ".pc-die", ".pc-status", ".pc-title", ".pc-field dt", ".pc-field dd", ".pc-open", ".proj-head-note",
  ".cv-name", ".cv-field", ".cv-meta dt", ".cv-meta dd", ".cv-h", ".cv-summary", ".cv-tl-period", ".cv-tl-title", ".cv-meter-label", ".cv-meter-val", ".cv-foot", ".cv-actions .btn",
  ".eol-line", ".eol-bar .mono", ".eol-credit", ".eol-bar .btn",
];
// đo cả khi đang mờ (từ scrub chưa "sáng" vẫn phải đọc được)
const DIM_OK = ["[data-scrub] > div", "[data-scrub] em"];

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: args.includes("--gpu")
    ? ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"]          // GPU thật (Windows) — số đo thời gian đại diện hơn
    : ["--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const helper = await browser.newPage();
const results = [];
const errors = [];

async function bgStats(png, rects) {
  return helper.evaluate(async ([b64, rects]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return rects.map((r) => {
      const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y));
      const w = Math.min(c.width - x0, Math.ceil(r.w)), h = Math.min(c.height - y0, Math.ceil(r.h));
      if (w < 2 || h < 2) return null;
      const d = x.getImageData(x0, y0, w, h).data;
      const L = new Float32Array(w * h);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) L[j] = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      L.sort();
      const q = (p) => L[Math.min(L.length - 1, Math.floor(p * L.length))];
      return { p5: q(0.05), p50: q(0.5), p95: q(0.95) };
    });
  }, [png.toString("base64"), rects]);
}

const HIDE_CSS = `.hud,.dock,.rail,.trace,.progress,.grain{display:none!important}
.__ct-hide,.__ct-hide *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke-color:transparent!important}
.__ct-hide.__ct-clip,.__ct-hide .__ct-clip{background-image:none!important}`;

async function collect(page, id) {
  return page.evaluate(([id, sels, dimOk]) => {
    const sec = document.getElementById(id);
    const vh = innerHeight, vw = innerWidth;
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const hex = (h) => { const n = parseInt(h.replace("#", ""), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }; };
    const effOpacity = (el) => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
    const out = [];
    let k = 0;
    const take = (sel, el, allowDim) => {
      if (!sec.contains(el) || el.closest("[aria-hidden=true]") || el.closest(".sr-only") || el.dataset.ct) return;
      const cs = getComputedStyle(el);
      if (cs.visibility !== "visible" || cs.display === "none") return;
      // hộp bao các dòng chữ thật (Range rects của text node), không phải cả hộp phần tử (icon, padding)
      let r = { left: 1e9, top: 1e9, right: -1e9, bottom: -1e9 };
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.textContent.trim() || t.parentElement.closest(".sr-only")) continue;   // con aria-hidden của SplitText vẫn là chữ hiện
        const range = document.createRange();
        range.selectNodeContents(t);
        for (const q of range.getClientRects()) {
          if (q.width < 1 || q.height < 1) continue;
          r = { left: Math.min(r.left, q.left), top: Math.min(r.top, q.top), right: Math.max(r.right, q.right), bottom: Math.max(r.bottom, q.bottom) };
        }
      }
      r.width = r.right - r.left; r.height = r.bottom - r.top;
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return;
      const cy = (r.top + r.bottom) / 2;
      if (cy < vh * 0.08 || cy > vh * 0.92) return;
      if (!el.textContent.trim()) return;
      const op = effOpacity(el);
      if (op < 0.5 && !allowDim) return;
      let col = parse(cs.color);
      // chữ clip-text (em gradient): đo theo màu đầu gradient (PRIMARY)
      if (col && col.a === 0 && cs.backgroundClip === "text") col = hex(getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());
      if (!col || col.a === 0) return;
      const fs = parseFloat(cs.fontSize), fw = Number(cs.fontWeight) || 400;
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      el.dataset.ct = String(k);
      out.push({
        k: k++, sel, text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 48), color: col, alpha: col.a * op, fs, fw, large,
        rect: { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(vw, r.right) - Math.max(0, r.left), h: Math.min(vh, r.bottom) - Math.max(0, r.top) },
      });
    };
    for (const sel of sels) document.querySelectorAll(sel).forEach((el) => take(sel, el, false));
    for (const sel of dimOk) document.querySelectorAll(sel).forEach((el) => take(sel, el, true));
    return out;
  }, [id, SELECTORS, DIM_OK]);
}

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const unlin = (L) => (L <= 0.0031308 ? L * 12.92 : 1.055 * L ** (1 / 2.4) - 0.055) * 255;

async function run(vp) {
  const page = await browser.newPage({ viewport: SIZES[vp], deviceScaleFactor: 1, isMobile: vp === "mobile", hasTouch: vp === "mobile" });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(`[${vp}] pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const p = document.querySelector(".preloader"); return !p || getComputedStyle(p).display === "none"; }, null, { timeout: 120000 });
  await page.addStyleTag({ content: HIDE_CSS });
  await page.waitForTimeout(2500);   // intro hero xong
  const ids = (await page.$$eval("section.chapter", (els) => els.map((e) => e.id))).filter((id) => !onlySections.length || onlySections.includes(id));
  for (const id of ids) {
    for (const f of POS) {
      await page.evaluate(([id, f]) => {
        const r = document.getElementById(id).getBoundingClientRect();
        const span = r.height - innerHeight;
        const y = span > innerHeight * 0.4 ? scrollY + r.top + span * f : scrollY + r.top + (f - 0.5) * innerHeight * 0.5;
        window.__lenis.scrollTo(Math.max(0, y), { immediate: true, force: true });
      }, [id, f]);
      await page.waitForTimeout(1600);
      const blocks = await collect(page, id);
      if (!blocks.length) continue;
      const worst = blocks.map(() => ({ p5: 1, p95: 0, p50: 0 }));
      for (let fr = 0; fr < FRAMES; fr++) {
        await page.evaluate(() => document.querySelectorAll("[data-ct]").forEach((el) => {
          el.classList.add("__ct-hide");
          [el, ...el.querySelectorAll("*")].forEach((n) => { if (getComputedStyle(n).backgroundClip === "text") n.classList.add("__ct-clip"); });
        }));
        const png = await page.screenshot();
        if (shots && fr === 0) fs.writeFileSync(path.join(out, `bg-${vp}-${id}-${f}.png`), png);
        await page.evaluate(() => document.querySelectorAll(".__ct-hide,.__ct-clip").forEach((el) => el.classList.remove("__ct-hide", "__ct-clip")));
        const st = await bgStats(png, blocks.map((b) => b.rect));
        st.forEach((s, i) => { if (!s) return; worst[i].p95 = Math.max(worst[i].p95, s.p95); worst[i].p5 = Math.min(worst[i].p5, s.p5); worst[i].p50 = s.p50; });
        await page.waitForTimeout(450);
      }
      await page.evaluate(() => document.querySelectorAll("[data-ct]").forEach((el) => el.removeAttribute("data-ct")));
      blocks.forEach((b, i) => {
        const w = worst[i];
        const Ltext0 = 0.2126 * lin(b.color.r) + 0.7152 * lin(b.color.g) + 0.0722 * lin(b.color.b);
        const light = Ltext0 >= w.p50;
        const Lbg = light ? w.p95 : w.p5;
        // chữ có alpha < 1: trộn màu chữ với nền (theo sRGB, như trình duyệt) rồi mới tính độ sáng
        const bgC = unlin(Lbg);
        const mix = (c) => lin(c * b.alpha + bgC * (1 - b.alpha));
        const Lt = 0.2126 * mix(b.color.r) + 0.7152 * mix(b.color.g) + 0.0722 * mix(b.color.b);
        const ratio = (Math.max(Lt, Lbg) + 0.05) / (Math.min(Lt, Lbg) + 0.05);
        const need = b.large ? 3 : 4.5;
        results.push({
          viewport: vp, section: id, pos: f, sel: b.sel, text: b.text, fontSize: b.fs, large: b.large,
          alpha: Number(b.alpha.toFixed(2)), bgL: Number(Lbg.toFixed(4)), ratio: Number(ratio.toFixed(2)), need, pass: ratio >= need,
        });
      });
    }
  }
  await page.close();
}

for (const vp of viewports) await run(vp);
await browser.close();
const fails = results.filter((r) => !r.pass);
const minBySelector = {};
for (const r of results) { const k = `${r.viewport} ${r.sel}`; minBySelector[k] = Math.min(minBySelector[k] ?? 99, r.ratio); }
fs.writeFileSync(path.join(out, "contrast.json"), JSON.stringify({ url, measured: results.length, fails: fails.length, minBySelector, errors, failures: fails, results }, null, 2));
console.log(`measured ${results.length} blocks · ${fails.length} below threshold`);
for (const f of fails.slice(0, 60)) console.log(`  x ${f.viewport} #${f.section}@${f.pos} ${f.sel} "${f.text}" ${f.ratio}:1 < ${f.need} (alpha ${f.alpha})`);
if (errors.length) console.log(errors.join("\n"));
process.exit(fails.length || errors.length ? 1 : 0);
