// Design flow (scene `stream`): 7 giai đoạn từ specification tới tape-out — headline ngành, không phải
// kinh nghiệm cá nhân. Desktop ≥ 900px: pin + track cuộn ngang, bộ đếm giai đoạn, parallax trong từng thẻ.
// Mobile / reduced-motion: danh sách dọc, không pin. gsap.matchMedia tự dựng lại khi đổi breakpoint.
// Mỗi giai đoạn có visual riêng, kích hoạt khi tới: PPA morph, block diagram vẽ dần, RTL gõ từng dòng,
// waveform (canvas), netlist có dòng tín hiệu, place & route (canvas), chồng lớp layout tách ra + checklist.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { onTick } from "../core/loop";
import { lazyMount } from "../core/lazy";
import { decodeTo } from "../fx/text/decode";
import { createWaveform } from "../canvas/Waveform";
import { createPlaceRoute } from "../canvas/PlaceRoute";

export function initDesignFlow() {
  const sec = $("#flow");
  const track = $(".flow-track", sec);
  const stages = $$(".stage", sec);
  const idxEl = $("[data-flow-index]", sec);
  const nameEl = $("[data-flow-name]", sec);
  const bar = $(".flow-bar i", sec);

  $$(".viz-rtl .ln", sec).forEach((l, i) => l.style.setProperty("--i", String(i)));

  // ---- giai đoạn đang xem ----
  let active = -1;
  const setActive = (i: number) => {
    if (i === active || i < 0) return;
    active = i;
    stages.forEach((s, k) => {
      s.classList.toggle("is-active", k === i);
      if (k <= i) s.classList.add("is-seen");
    });
    idxEl.textContent = String(i + 1).padStart(2, "0");
    decodeTo(nameEl, stages[i].dataset.name ?? "", { duration: 480 });
    spec.paused(i !== 0);
  };

  // ---- Stage 01: tam giác PPA co giãn qua lại (trade-off) ----
  const shape = $(".spec-shape", sec);
  const pts = $$<SVGCircleElement>(".spec-pts circle", sec);
  const A = [120, 52, 186, 168, 60, 166], B = [120, 84, 204, 178, 40, 150];
  const cur = { v: 0 };
  const spec = gsap.to(cur, {
    v: 1, duration: 2.6, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true,
    onUpdate: () => {
      const v = cur.v;
      let s = "";
      for (let k = 0; k < 3; k++) {
        const x = A[k * 2] + (B[k * 2] - A[k * 2]) * v, y = A[k * 2 + 1] + (B[k * 2 + 1] - A[k * 2 + 1]) * v;
        s += `${x.toFixed(1)},${y.toFixed(1)} `;
        pts[k].setAttribute("cx", x.toFixed(1));
        pts[k].setAttribute("cy", y.toFixed(1));
      }
      shape.setAttribute("points", s);
    },
  });

  // ---- bố cục theo breakpoint ----
  const linear = () => {
    sec.classList.add("is-linear");
    stages.forEach((s, i) => ScrollTrigger.create({
      trigger: s, start: "top 72%", end: "bottom 28%",
      onToggle: (st) => st.isActive && setActive(i),
    }));
    return () => sec.classList.remove("is-linear");
  };
  const horizontal = () => {
    const tween = gsap.to(track, {
      x: () => -(track.scrollWidth - innerWidth), ease: "none",
      scrollTrigger: {
        trigger: sec, pin: "#flow .pin", scrub: 1, start: "top top",
        end: () => "+=" + (track.scrollWidth - innerWidth) * 1.1, invalidateOnRefresh: true,
        onUpdate: (st) => (bar.style.transform = `scaleX(${st.progress.toFixed(4)})`),
      },
    });
    stages.forEach((s, i) => {
      ScrollTrigger.create({
        trigger: s, containerAnimation: tween, start: "left 62%", end: "right 62%",
        onToggle: (st) => st.isActive && setActive(i),
      });
      // parallax trong thẻ: visual trôi ngược chiều track, chữ trôi nhẹ hơn
      gsap.fromTo($(".stage-viz", s), { x: 70 }, {
        x: -70, ease: "none",
        scrollTrigger: { trigger: s, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
      });
      gsap.fromTo($(".stage-copy", s), { x: 24 }, {
        x: -24, ease: "none",
        scrollTrigger: { trigger: s, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
      });
    });
  };

  if (state.reduced) linear();
  else gsap.matchMedia().add({ wide: "(min-width: 900px)", narrow: "(max-width: 899px)" }, (ctx) => (ctx.conditions!.wide ? horizontal() : linear()));
  setActive(0);

  // ---- canvas waveform + place & route: tạo khi chương gần viewport, chỉ render khi khung đang hiện ----
  const waveHost = $(".viz-wave", sec), pnrHost = $(".viz-pnr", sec);
  let wave: ReturnType<typeof createWaveform> | null = null;
  let pnr: ReturnType<typeof createPlaceRoute> | null = null;
  let waveOn = false, pnrOn = false;
  new IntersectionObserver(([e]) => (waveOn = e.isIntersecting)).observe(waveHost);
  new IntersectionObserver(([e]) => (pnrOn = e.isIntersecting)).observe(pnrHost);
  const ro = new ResizeObserver(() => { wave?.resize(); pnr?.resize(); });
  lazyMount(sec, {
    mount() {
      wave = createWaveform($<HTMLCanvasElement>("canvas", waveHost));
      pnr = createPlaceRoute($<HTMLCanvasElement>("canvas", pnrHost));
      ro.observe(waveHost); ro.observe(pnrHost);
    },
    unmount() { ro.disconnect(); wave = null; pnr = null; },
  });
  onTick((_, dt) => {
    if (wave && waveOn) wave.render(dt);
    if (pnr && pnrOn) pnr.render(dt);
  });
}
