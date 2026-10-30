// Chương 05 — Amplify: 4 biến thể laser (vendor/laserShaders, 4 scene laser0..3 dùng chung program)
// trên track ngang 4 panel. Weight của stage theo panel đang hiện (tam giác quanh mỗi panel × coverage).
// Panel 2: Predictive Arc, panel 4: Data Pixel Arc (vendor 2D, lazy, chỉ render khi thấy).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onTick } from "../core/loop";
import { lazyMount } from "../core/lazy";
import { coverage, $, $$ } from "../core/dom";
import { state } from "../core/state";
import { stage } from "../stage/instance";
import { createPredictiveArcRenderer, PREDICTIVE_ARC_DEFAULTS, type PredictiveArcOptions } from "../vendor/predictiveArcRenderer";
import { createDataPixelArcRenderer, DATA_PIXEL_ARC_DEFAULTS, type DataPixelArcOptions } from "../vendor/dataPixelArcRenderer";

type Arc = { resize: (w: number, h: number) => void; render: () => void };

/** canvas 2D vendor: tạo khi chương gần viewport, render trong tick chung khi khung biểu đồ đang hiện */
function mountArc(sec: HTMLElement, host: HTMLElement, create: (c: HTMLCanvasElement) => Arc | null) {
  const canvas = $<HTMLCanvasElement>("canvas", host);
  let r: Arc | null = null, visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(host);
  const ro = new ResizeObserver(() => r?.resize(host.clientWidth, host.clientHeight));
  lazyMount(sec, {
    mount() { r = create(canvas); r?.resize(host.clientWidth, host.clientHeight); ro.observe(host); },
    unmount() { ro.disconnect(); r = null; },
  });
  onTick(() => { if (r && visible) r.render(); });
}

export function initLasers() {
  const sec = $("#c05");
  const track = $(".c05-track", sec);
  const panels = $$(".c05-panel", sec);
  const copies = panels.map((p) => $(".c05-copy", p));
  const scan = $(".c05-scan", sec);
  const fill = $(".c05-meter i", sec);
  const ticks = $$(".c05-meter li", sec);

  const tween = gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth), ease: "none",
    scrollTrigger: {
      trigger: sec, pin: "#c05 .pin", scrub: 1, start: "top top",
      end: () => "+=" + (track.scrollWidth - innerWidth), invalidateOnRefresh: true,
    },
  });

  // stat lớn đếm lên khi panel vào (containerAnimation = track ngang); cuộn ngược ra thì reset
  panels.forEach((panel) => {
    const el = $(".c05-count", panel);
    const to = Number(el.dataset.to ?? 0), dec = Number(el.dataset.dec ?? 0);
    const o = { v: 0 };
    const show = () => (el.textContent = o.v.toFixed(dec));
    show();
    ScrollTrigger.create({
      trigger: panel, containerAnimation: tween, start: "left 65%",
      onEnter: () => gsap.to(o, { v: to, duration: state.reduced ? 0 : 1.4, ease: "power3.out", onUpdate: show, overwrite: true }),
      onLeaveBack: () => gsap.to(o, { v: 0, duration: 0.3, onUpdate: show, overwrite: true }),
    });
  });

  // weight stage theo tiến độ track thực (tween đang scrub), đọc layout ở tick "early"
  let cover = 0, p = 0;
  onTick(() => {
    cover = coverage(sec).cover;
    p = tween.progress();
    const f = p * 3;                                  // 0..3 qua 4 panel
    for (let i = 0; i < 4; i++) stage.setWeight(`laser${i}`, cover * Math.max(0, 1 - Math.abs(f - i)), p);
  }, "early");

  // ghi DOM ở tick thường: chữ panel trượt ngược chiều track, vạch scan + thanh đo theo tiến độ
  let lastP = -1, active = -1;
  onTick(() => {
    if (cover <= 0 || p === lastP) return;
    lastP = p;
    const f = p * 3;
    for (let i = 0; i < copies.length; i++) {
      const d = Math.max(-1, Math.min(1, i - f));    // 1 = đang vào từ phải, -1 = đang ra bên trái
      copies[i].style.transform = state.reduced ? "" : `translate3d(${d * 20}vw,0,0)`;
    }
    scan.style.transform = `translate3d(${p * (state.w - 2)}px,0,0)`;
    fill.style.transform = `scaleX(${p})`;
    const a = Math.round(f);
    if (a !== active) { active = a; ticks.forEach((t, i) => t.classList.toggle("is-on", i <= a)); }
  });

  // biểu đồ trang trí (sắc độ chỉnh bằng CSS hue-rotate như component gốc), tốc độ theo vận tốc cuộn
  const predictive: PredictiveArcOptions = { ...PREDICTIVE_ARC_DEFAULTS, spacing: 5, dotSize: 5 };
  const pixel: DataPixelArcOptions = { ...DATA_PIXEL_ARC_DEFAULTS, pixelSize: state.mobile ? 6 : 7 };
  onTick(() => {
    const v = 1 + Math.abs(state.scroll.smooth) * 3;
    predictive.speed = v * (state.reduced ? 0.25 : 1);
    pixel.speed = v * (state.reduced ? 0.25 : 1);
  }, "early");
  mountArc(sec, $(".c05-viz--predictive", sec), (c) => createPredictiveArcRenderer(c, () => predictive));
  mountArc(sec, $(".c05-viz--pixel", sec), (c) => createDataPixelArcRenderer(c, () => pixel));
}
