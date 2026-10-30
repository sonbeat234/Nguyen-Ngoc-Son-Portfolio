// Chương 10 — Signal Lost. Một TV CRT lớn (khung CSS: bezel, núm, LED, loa) chứa vendor/crt/crtRenderer
// (1 WebGL context, lazy + giải phóng), pin 300% chia 4 kênh terminal → cinematic → blue-screen → nintendo.
// Đổi kênh: motion vọt 3 trong 300ms, dải nhiễu stage (u_glitch), núm xoay, LED nháy, nhãn decode.
// Tiêu đề neon canvas (Glassblown Neon) nhấp nháy từng chữ; scanline toàn trang + glitch chữ khi cuộn/di chuột nhanh.
// Không có scene stage: TV bật (power-on) khi vào pin, tắt kiểu CRT (thu về vạch → chấm) trước khi rời.
import gsap from "gsap";
import { onTick } from "../core/loop";
import { state } from "../core/state";
import { $, $$ } from "../core/dom";
import { clamp, damp, smoothstep } from "../core/math";
import { mountVendor } from "../core/vendor";
import { lazyMount } from "../core/lazy";
import { stage } from "../stage/instance";
import { createCrtRenderer, CRT_DEFAULTS, CRT_VARIANTS, crtStyle, type CrtOptions } from "../vendor/crt/crtRenderer";
import { createNeonSign, NEON_AMBER, NEON_GREEN } from "../canvas/NeonSign";
import { decodeTo } from "../fx/text/decode";
import { glitchOnce, setGlitchThreshold } from "../fx/text/glitch";

const NAMES = ["TERMINAL", "CINEMATIC", "BLUE SCREEN", "NINTENDO"];

export function initSignal() {
  const sec = $("#c10");
  const tv = $(".c10-tv", sec);
  const screen = $(".c10-screen", sec);               // host của CRT (không transform, để renderer đo đúng)
  const picture = $(".c10-picture", sec);             // lớp được thu/giãn khi bật/tắt
  const crtCanvas = $<HTMLCanvasElement>(".c10-crt", sec);
  const board = $(".c10-neon", sec);
  const neonCanvas = $<HTMLCanvasElement>(".c10-neon canvas", sec);
  const ch = $(".c10-ch", sec);
  const hold = $(".c10-hold", sec);
  const chips = $$(".c10-chan li", sec);
  const knob = $(".c10-knob--ch", sec);
  const vol = $(".c10-knob--vol", sec);
  const led = $(".c10-led--sync", sec);
  const scan = $(".scanlines");

  const baseMotion = state.reduced ? 0.35 : 1;
  const opts: CrtOptions = { ...CRT_DEFAULTS, variant: "terminal", motion: baseMotion, speed: state.reduced ? 0.4 : 1 };

  // ---- CRT: 1 context, lazy mount/unmount + release ----
  mountVendor(sec, crtCanvas, (c) => createCrtRenderer(screen, c, () => opts), (r) => r.render(performance.now()));

  // ---- tiêu đề neon (canvas 2D, bake theo kích thước khung) ----
  let neon: ReturnType<typeof createNeonSign> | null = null;
  let neonVisible = false;
  lazyMount(sec, {
    mount() {
      neon = createNeonSign(board, neonCanvas, {
        layouts: [
          { minAspect: 3.1, lines: ["SIGNAL LOST,", "IMAGE HOLDING"] },
          { minAspect: 0, lines: ["SIGNAL", "LOST,", "IMAGE", "HOLDING"] },
        ],
        palette: (line, n) => (line < n / 2 ? NEON_AMBER : NEON_GREEN),
        faulty: (line, n, i) => (n === 2 ? line === 1 && i === 9 : line === 3 && i === 3),   // chữ D của HOLDING
        reduced: state.reduced,
      });
      neon.ignite(0.1);
    },
    unmount() { neon?.dispose(); neon = null; },
  });
  new ResizeObserver(() => neon?.resize()).observe(board);
  new IntersectionObserver(([e]) => (neonVisible = e.isIntersecting)).observe(board);
  onTick((_, dt) => { if (neon && neonVisible) neon.render(dt); });

  // ---- đổi kênh ----
  let cur = -1, spike = 0;
  const setVariant = (i: number) => {
    if (i === cur) return;
    const first = cur < 0;
    cur = i;
    opts.variant = CRT_VARIANTS[i];
    screen.style.background = crtStyle(opts.variant).background;
    chips.forEach((c, k) => c.classList.toggle("is-on", k === i));
    const label = `CH 0${i + 1} · ${NAMES[i]}`;
    if (first) { ch.textContent = label; return; }
    decodeTo(ch, label, { duration: 520 });
    gsap.to(knob, { rotation: i * 90 - 135, duration: 0.9, ease: "elastic.out(1, 0.45)", overwrite: true });
    gsap.fromTo(led, { opacity: 1 }, { opacity: 0.15, duration: 0.06, repeat: 5, yoyo: true, overwrite: true });
    if (state.reduced) return;
    // motion vọt lên 3 rồi về trong 300ms: nhiễu analog + dải dropout của chính shader CRT
    gsap.timeline({ overwrite: true })
      .to(opts, { motion: 3, duration: 0.1, ease: "power2.out" })
      .to(opts, { motion: baseMotion, duration: 0.2, ease: "power2.in" });
    spike = 0.9;
    neon?.kick(5);
    glitchOnce(board, 1.6);
    glitchOnce(ch, 1.2);
  };
  setVariant(0);
  gsap.set(knob, { rotation: -135 });

  // ---- pin 300%: bật máy → 4 kênh → tắt máy ----
  gsap.set(picture, { scaleY: 0.006, scaleX: 1, filter: "brightness(3)" });
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec, start: "top top", end: "+=300%", pin: "#c10 .pin", scrub: true,
      onUpdate: (st) => setVariant(Math.min(3, Math.floor(clamp((st.progress - 0.05) / 0.86) * 4))),
      onEnter: () => neon?.ignite(0),
      onEnterBack: () => neon?.ignite(0),
    },
  });
  tl.to(picture, { scaleY: 1, filter: "brightness(1)", duration: 0.04, ease: "expo.out" }, 0)
    .to(vol, { rotation: 250, duration: 1 }, 0)
    .to(picture, { scaleY: 0.006, filter: "brightness(3.2)", duration: 0.035, ease: "power3.in" }, 0.93)
    .to(picture, { scaleX: 0, duration: 0.025, ease: "power2.in" }, 0.965)
    .to(".c10-dot", { opacity: 1, scale: 1, duration: 0.005 }, 0.985)
    .to(".c10-dot", { opacity: 0, scale: 0.2, duration: 0.01 }, 0.99)
    .to([board, ".c10-readout"], { opacity: 0, y: -24, duration: 0.03 }, 0.97)
    .to(tv, { opacity: 0.35, duration: 0.02 }, 0.98);

  // TV trôi vào khi chương tới (trước pin): mờ → rõ, không cut cứng với chương 09
  gsap.fromTo(tv, { opacity: 0, scale: 0.9, yPercent: 8 }, {
    opacity: 1, scale: 1, yPercent: 0, ease: "none",
    scrollTrigger: { trigger: sec, start: "top bottom", end: "top top", scrub: true },
  });
  gsap.fromTo(board, { opacity: 0 }, {
    opacity: 1, ease: "none",
    scrollTrigger: { trigger: sec, start: "top 85%", end: "top 20%", scrub: true },
  });

  // ---- scanline toàn trang, glitch stage, ngưỡng glitch chữ: theo độ phủ của chương ----
  let near = false;
  new IntersectionObserver(([e]) => (near = e.isIntersecting), { rootMargin: "60% 0px 60% 0px" }).observe(sec);
  let g = 0, scanLevel = -1, low = false, cover = 0, kickAt = 0, holdSec = -1, holdStart = 0;
  onTick((time, dt) => {
    if (!near && g < 0.001 && scanLevel === 0) return;
    if (near) {
      const r = sec.getBoundingClientRect();
      cover = clamp((Math.min(r.bottom, state.h) - Math.max(r.top, 0)) / state.h);
    } else cover = 0;
    const v = state.reduced ? 0 : Math.abs(state.scroll.smooth);
    spike = damp(spike, 0, 7, dt);
    g = damp(g, cover * (0.08 + Math.min(1, v * 1.8)) + spike * cover, 10, dt);
    stage.glitch = g < 0.003 ? 0 : Math.min(1.2, g);

    const s = Math.round(smoothstep(0.1, 0.65, cover) * 100) / 100;
    if (s !== scanLevel) { scanLevel = s; scan.style.opacity = String(s * 0.6); }
    const inside = cover > 0.5;
    if (inside !== low) { low = inside; setGlitchThreshold(inside ? 900 : 1800); holdStart = time; }

    // cuộn nhanh trong chương: vài ống neon tắt phụt
    if (inside && v > 0.45 && time - kickAt > 0.14) { kickAt = time; neon?.kick(2); }
    // đồng hồ "image holding" chạy khi đang ở trong chương
    if (inside) {
      const sec2 = Math.floor(time - holdStart);
      if (sec2 !== holdSec) {
        holdSec = sec2;
        hold.textContent = `HOLD ${String(Math.floor(sec2 / 60)).padStart(2, "0")}:${String(sec2 % 60).padStart(2, "0")}`;
      }
    }
  }, "early");
}
