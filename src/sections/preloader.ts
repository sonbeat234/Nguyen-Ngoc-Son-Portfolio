// Chương 00 — Preloader "UPLINK" (spec mục 12/00, cảm hứng uplink-loader.html).
// % = (font tải xong + ảnh decode + từng shader prewarm) / tổng. Log terminal mỗi bước có decode,
// thanh 16 ô sáng dần. reveal(): chromatic wordmark R/G/B hội tụ + iris mở từ tâm.
// HỢP ĐỒNG với main.ts (giữ nguyên chữ ký):
//   initPreloader(): khoá scroll ("preloader"), prewarm stage + font + ảnh, resolve khi tải xong.
//   reveal(): chạy intro, ẩn .preloader (display:none), mở scroll, phát window event "signal:intro".
import gsap from "gsap";
import { stage } from "../stage/instance";
import { lockScroll } from "../core/scroll";
import { state } from "../core/state";
import { $, $$ } from "../core/dom";
import { decodeText } from "../fx/text/decode";

export type Preloader = { reveal: () => Promise<void> };

const FONTS: [string, string][] = [
  ['700 300px "Syncopate"', "syncopate"],
  ['400 1em "Instrument Serif"', "instrument-serif"],
  ['italic 400 1em "Instrument Serif"', "instrument-serif-italic"],
  ['400 1em "Fragment Mono"', "fragment-mono"],
  ['300 1em "Geist"', "geist-300"],
  ['400 1em "Geist"', "geist-400"],
];
const IMAGES = [1, 2, 3, 4, 5].map((i) => `/img/gallery-${i}.webp`);
const MIN_MS = 1900;
const LOG_LINES = 6;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const withTimeout = <T>(p: Promise<T>, ms: number) => Promise.race([p.then(() => undefined, () => undefined), wait(ms)]);

export async function initPreloader(): Promise<Preloader> {
  const root = $(".preloader");
  lockScroll(true, "preloader");
  const t0 = performance.now();

  const num = $(".pre-num", root);
  const log = $(".pre-log", root);
  const cells = $$(".pre-bar i", root);
  const dots = $(".pre-dots", root);
  const status = $(".pre-status", root);

  // ---- tiến độ: số hiển thị đuổi theo số thật (tween) để bộ đếm chạy mượt
  const total = FONTS.length + IMAGES.length + stage.ids.length;
  let done = 0, lit = 0;
  const shown = { v: 0 };
  const paint = () => {
    const v = Math.min(100, Math.round(shown.v));
    num.textContent = v < 10 ? `00${v}` : v < 100 ? `0${v}` : "100";
    const on = Math.min(cells.length, Math.floor((shown.v / 100) * cells.length + 1e-6));
    while (lit < on) { cells[lit].classList.add("on", "flash"); lit++; }
  };
  const addLog = (text: string) => {
    const li = document.createElement("li");
    li.textContent = text;
    log.appendChild(li);
    while (log.children.length > LOG_LINES) log.firstElementChild!.remove();
    decodeText(li, { duration: 380, scramble: 8 });
  };
  const step = (line: string) => {
    done++;
    addLog(line);
    gsap.to(shown, { v: (done / total) * 100, duration: 0.5, ease: "power2.out", overwrite: true, onUpdate: paint });
  };

  let dotN = 3;
  const dotTimer = setInterval(() => { dotN = (dotN % 3) + 1; dots.textContent = ".".repeat(dotN); }, 360);

  addLog("> uplink handshake … ok");
  addLog(`> stage ${stage.ids.length} scenes · 1 context`);

  const fonts = Promise.all(FONTS.map(([face, name]) =>
    withTimeout(document.fonts.load(face), 4000).then(() => step(`> loading ${name}.woff2 … ok`))));
  const images = Promise.all(IMAGES.map((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return withTimeout(img.decode(), 5000).then(() => step(`> decoding ${src.split("/").pop()} … ok`));
  }));
  const shaders = stage.prewarm((_, __, id) => step(`> compiling ${id}.frag … ok`));

  await Promise.all([fonts, images, shaders]);
  await withTimeout(document.fonts.ready, 3000);
  const elapsed = performance.now() - t0;
  if (elapsed < MIN_MS) await wait(MIN_MS - elapsed);
  await gsap.to(shown, { v: 100, duration: 0.35, ease: "power1.out", overwrite: true, onUpdate: paint });
  addLog("> signal locked · 100%");
  status.textContent = "Uplink established";
  clearInterval(dotTimer);
  dots.textContent = "";

  return {
    reveal() {
      return new Promise<void>((resolve) => {
        const finish = () => {
          root.style.display = "none";
          resolve();
        };
        const open = () => {
          lockScroll(false, "preloader");
          window.dispatchEvent(new CustomEvent("signal:intro"));
        };
        if (state.reduced) {
          gsap.timeline({ onComplete: finish })
            .to(root, { opacity: 0, duration: 0.5, ease: "power1.out" })
            .add(open, 0.1);
          return;
        }
        // iris phủ hết góc màn: bán kính = nửa đường chéo + lề
        const R = Math.ceil(Math.hypot(innerWidth, innerHeight) / 2 + 40);
        gsap.timeline({ onComplete: finish })
          .to([".pre-center", ".pre-log", ".pre-marks", ".pre-sig"], { opacity: 0, duration: 0.35, ease: "power2.in" }, 0)
          .set(".pre-rgb", { autoAlpha: 1 }, 0.2)
          .fromTo(".pre-rgb .r", { x: -12 }, { x: 0, duration: 0.9, ease: "expo.out" }, 0.25)
          .fromTo(".pre-rgb .b", { x: 12 }, { x: 0, duration: 0.9, ease: "expo.out" }, 0.25)
          .fromTo(".pre-rgb .g", { y: 3 }, { y: 0, duration: 0.9, ease: "expo.out" }, 0.25)
          .fromTo(root, { "--r": "0px" }, { "--r": `${R}px`, duration: 1.2, ease: "expo.inOut" }, 1.15)
          .add(open, 1.5);
      });
    },
  };
}
