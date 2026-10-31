// Preloader "POWER-ON" (cảm hứng uplink-loader.html): chip khởi động, màu chủ đạo PRIMARY.
// % = (font tải xong + ảnh decode + từng shader prewarm) / tổng. Log terminal: mỗi dòng decode khi xuất hiện,
// thanh 16 ô sáng dần, nhãn "POWER-ON" chạy sóng ký tự (fx/ui/characterWave → waveLabel), số % nhấp nháy neon.
// reveal(): tên tách 3 kênh PRIMARY / SIGNAL / PRIMARY_2 (screen) hội tụ thành chữ BONE glow PRIMARY,
// rồi iris mở từ tâm với viền sáng PRIMARY.
// Thời gian: sau khi tài nguyên tải xong ≤ 2.2 s (tối thiểu hiện 0.7 s để không nháy). Mở lại trong cùng phiên
// (sessionStorage) ≤ 0.8 s.
// HỢP ĐỒNG với main.ts:
//   initPreloader(): khoá scroll ("preloader"), prewarm stage + font + ảnh, resolve khi tải xong.
//   reveal(): chạy intro, ẩn .preloader (display:none), mở scroll, phát window event "signal:intro".
import gsap from "gsap";
import { stage } from "../stage/instance";
import { lockScroll } from "../core/scroll";
import { state } from "../core/state";
import { $, $$ } from "../core/dom";
import { decodeText } from "../fx/text/decode";
import { waveLabel } from "../fx/ui/characterWave";
import { profile } from "../content/profile";

export type Preloader = { reveal: () => Promise<void> };

// mẫu chữ có dấu tiếng Việt để trình duyệt tải cả subset vietnamese (unicode-range) của Google Fonts
const SAMPLE = `${profile.fullName} Aa09`;
const FONTS: [string, string][] = [
  ['700 1em "Unbounded"', "unbounded-700"],
  ['300 1em "Unbounded"', "unbounded-300"],
  ['italic 400 1em "Instrument Serif"', "instrument-serif-italic"],
  ['400 1em "JetBrains Mono"', "jetbrains-mono"],
  ['300 1em "Geist"', "geist-300"],
  ['400 1em "Geist"', "geist-400"],
];
const IMAGES = profile.portrait ? [profile.portrait] : [];
const MIN_MS = 700;                    // hiện tối thiểu (tính từ lúc mở trang) để không nháy
const LOG_LINES = 6;
const SESSION_KEY = "nns:booted";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const withTimeout = <T>(p: Promise<T>, ms: number) => Promise.race([p.then(() => undefined, () => undefined), wait(ms)]);

function bootedBefore() {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}
function markBooted() {
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* storage bị chặn: lần sau vẫn chạy bản đầy đủ */ }
}

export async function initPreloader(): Promise<Preloader> {
  const root = $(".preloader");
  lockScroll(true, "preloader");
  const t0 = performance.now();
  const fast = bootedBefore();
  root.classList.toggle("is-fast", fast);

  const num = $(".pre-num", root);
  const log = $(".pre-log", root);
  const cells = $$(".pre-bar i", root);
  const dots = $(".pre-dots", root);
  const status = $(".pre-status", root);
  const stopWave = waveLabel($(".pre-word", root));

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
    if (!fast) decodeText(li, { duration: 380, scramble: 8 });
  };
  const step = (line: string) => {
    done++;
    addLog(line);
    gsap.to(shown, { v: (done / total) * 100, duration: fast ? 0.15 : 0.45, ease: "power2.out", overwrite: true, onUpdate: paint });
  };

  let dotN = 3;
  const dotTimer = setInterval(() => { dotN = (dotN % 3) + 1; dots.textContent = ".".repeat(dotN); }, 360);

  addLog("> power-on reset … ok");
  addLog(`> stage ${stage.ids.length} scenes · 1 context`);

  const fonts = Promise.all(FONTS.map(([face, name]) =>
    withTimeout(document.fonts.load(face, SAMPLE), 4000).then(() => step(`> loading ${name} … ok`))));
  const images = Promise.all(IMAGES.map((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return withTimeout(img.decode(), 5000).then(() => step(`> decoding ${src.split("/").pop()} … ok`));
  }));
  const shaders = stage.prewarm((_, __, id) => step(`> compiling ${id}.frag … ok`));

  await Promise.all([fonts, images, shaders]);
  performance.mark("preloader:loaded");          // verify.mjs đo quãng loaded → done (≤ 2.2 s, lặp phiên ≤ 0.8 s)
  await withTimeout(document.fonts.ready, fast ? 300 : 1500);
  const elapsed = performance.now() - t0;
  if (!fast && elapsed < MIN_MS) await wait(MIN_MS - elapsed);
  await gsap.to(shown, { v: 100, duration: fast ? 0.1 : 0.25, ease: "power1.out", overwrite: true, onUpdate: paint });
  addLog("> boot complete · 100%");
  status.textContent = "System ready";
  clearInterval(dotTimer);
  dots.textContent = "";

  return {
    reveal() {
      return new Promise<void>((resolve) => {
        const finish = () => {
          stopWave();
          root.style.display = "none";
          performance.mark("preloader:done");
          markBooted();
          resolve();
        };
        const open = () => {
          lockScroll(false, "preloader");
          window.dispatchEvent(new CustomEvent("signal:intro"));
        };
        if (state.reduced) {
          gsap.timeline({ onComplete: finish })
            .to(root, { opacity: 0, duration: fast ? 0.3 : 0.5, ease: "power1.out" })
            .add(open, 0.1);
          return;
        }
        // iris phủ hết góc màn: bán kính = nửa đường chéo + lề
        const R = Math.ceil(Math.hypot(innerWidth, innerHeight) / 2 + 60);
        const tl = gsap.timeline({ onComplete: finish });
        if (fast) {
          // mở lại trong phiên: bỏ hội tụ kênh màu, chỉ chữ cuối + iris ngắn (≤ 0.8 s cả quá trình)
          tl.to([".pre-center", ".pre-log", ".pre-marks", ".pre-sig"], { opacity: 0, duration: 0.18, ease: "power2.in" }, 0)
            .set(".pre-rgb", { autoAlpha: 1 }, 0)
            .set(".pre-rgb .f", { opacity: 1 }, 0)
            .set(root, { "--rim": 1 }, 0.08)
            .fromTo(root, { "--r": "0px" }, { "--r": `${R}px`, duration: 0.45, ease: "expo.in" }, 0.08)
            .add(open, 0.2);
          return;
        }
        tl.to([".pre-center", ".pre-log", ".pre-marks", ".pre-sig"], { opacity: 0, y: -8, duration: 0.3, ease: "power2.in" }, 0)
          .set(".pre-rgb", { autoAlpha: 1 }, 0.1)
          // 3 kênh lệch nhau rồi hội tụ (screen cộng sáng); chữ BONE glow PRIMARY hiện lên khi khớp
          .fromTo(".pre-rgb .r", { x: -16, y: -2 }, { x: 0, y: 0, duration: 0.6, ease: "expo.out" }, 0.1)
          .fromTo(".pre-rgb .b", { x: 16, y: 2 }, { x: 0, y: 0, duration: 0.6, ease: "expo.out" }, 0.1)
          .fromTo(".pre-rgb .g", { y: 5, scaleX: 1.02 }, { y: 0, scaleX: 1, duration: 0.6, ease: "expo.out" }, 0.1)
          .fromTo(".pre-rgb .f", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }, 0.42)
          .to(".pre-rgb .r, .pre-rgb .g, .pre-rgb .b", { opacity: 0, duration: 0.3 }, 0.6)
          // iris mở có viền sáng PRIMARY (preloader::after đọc --r, --rim)
          .set(root, { "--rim": 1 }, 0.55)
          .fromTo(root, { "--r": "0px" }, { "--r": `${R}px`, duration: 0.9, ease: "expo.inOut" }, 0.55)
          .add(open, 0.85);
      });
    },
  };
}
