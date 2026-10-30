// Chương 04 — Form (chrome): scene `liquid` (morph/camera/"nổ" theo progress trong stage/scenes.ts).
// - 4 card kính bay vào từ 4 phía quanh blob (timeline scrub), số liệu đếm lên khi card đáp.
// - Tiêu đề "FORM FOLLOWS FEELING" = Typography Vortex (vendor/typographyVortexRenderer, mode dark);
//   mobile/touch: tiêu đề chữ thật với masked reveal.
// - Wireframe Forms (canvas/WireframeForms, port wireframe-forms.html) mờ 25%, xoay theo scroll.
import gsap from "gsap";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { onTick } from "../core/loop";
import { lazyMount } from "../core/lazy";
import { createTypographyVortexRenderer, type TypographyVortexOptions } from "../vendor/typographyVortexRenderer";
import { createWireframeForms } from "../canvas/WireframeForms";

const VORTEX: TypographyVortexOptions = {
  mode: "dark",
  phrase: "FORM FOLLOWS FEELING / ",
  speed: 1,
  ringGrowth: 1.21,
  opacity: 1,
  dissolveRadius: 1,
  particleAmount: 1,
  suctionDuration: 920,
};

// hướng bay vào của 4 card: trái, trên, dưới, phải (spec: x/y ±40vw, rotateY ±40 → 0)
const FROM = [
  { x: "-40vw", y: 0, rotateY: 40 },
  { x: 0, y: "-40vw", rotateY: -40 },
  { x: 0, y: "40vw", rotateY: 40 },
  { x: "40vw", y: 0, rotateY: -40 },
];

export function initChrome() {
  const sec = $("#c04");
  const cards = $$(".c04-card", sec);
  const title = $(".c04-title", sec);
  const vortexHost = $(".c04-vortex", sec);
  const useVortex = !state.mobile && !state.touch;

  // tiêu đề: vortex trên desktop (chữ thật giữ cho trình đọc màn hình), reveal trên mobile
  if (useVortex) {
    title.classList.add("sr-only");
    let cleanup: (() => void) | null = null;
    lazyMount(sec, {
      mount() { cleanup = createTypographyVortexRenderer(vortexHost, $<HTMLCanvasElement>("canvas", vortexHost), () => VORTEX); },
      unmount() { cleanup?.(); cleanup = null; },
    });
  } else {
    vortexHost.remove();
    title.dataset.reveal = "chars";
  }

  // wireframe forms: canvas 2D, chỉ render khi chương giao viewport
  const wireCanvas = $<HTMLCanvasElement>(".c04-wire", sec);
  let wire: ReturnType<typeof createWireframeForms> | null = null;
  let visible = false, progress = 0, spin = 0;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
  const ro = new ResizeObserver(() => wire?.resize());
  lazyMount(sec, {
    mount() { wire = createWireframeForms(wireCanvas); ro.observe(wireCanvas); },
    unmount() { ro.disconnect(); wire = null; },
  });
  onTick((_, dt) => {
    if (!wire || !visible) return;
    spin += dt * (state.reduced ? 0.05 : 0.3) * (1 + Math.abs(state.scroll.smooth) * 4);
    wire.render(spin * 0.4 + progress * 2.2, spin + progress * Math.PI * 3);
  });

  // số liệu: đếm theo timeline (scrub nên cuộn ngược thì đếm ngược)
  const counters = cards.map((card) => {
    const el = $(".c04-stat b", card);
    return { el, from: Number(el.dataset.from ?? 0), to: Number(el.dataset.to ?? 0), v: { n: Number(el.dataset.from ?? 0) } };
  });
  counters.forEach((c) => (c.el.textContent = String(c.from)));

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: {
      trigger: sec, start: "top top", end: "+=250%", pin: "#c04 .pin", scrub: 1,
      onUpdate: (st) => (progress = st.progress),
    },
  });
  tl.fromTo(".c04-head", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0);
  if (useVortex) tl.fromTo(vortexHost, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: "power2.out" }, 0);
  cards.forEach((card, i) => {
    const at = 0.5 + i * 0.85;
    // reduced-motion: vẫn gắn với cuộn nhưng chỉ trượt ngắn + fade, không xoay
    const from = state.reduced ? { x: 0, y: 24, rotateY: 0 } : FROM[i];
    tl.fromTo(card, { ...from, autoAlpha: 0, transformPerspective: 900 }, { x: 0, y: 0, rotateY: 0, autoAlpha: 1, duration: 1.4 }, at);
    const c = counters[i];
    tl.fromTo(c.v, { n: c.from }, {
      n: c.to, duration: 1, ease: "power2.out",
      onUpdate: () => { c.el.textContent = String(Math.round(c.v.n)); },
    }, at + 0.7);
  });
  // giữ một nhịp để đọc, rồi card lùi ra và tan khi blob "nổ" sang laser
  tl.to({}, { duration: 1.2 });
  tl.to(cards, { autoAlpha: 0, scale: 0.9, filter: "blur(8px)", stagger: 0.08, duration: 0.8, ease: "power2.in" });
  if (useVortex) tl.to(vortexHost, { autoAlpha: 0, scale: 1.25, duration: 0.9, ease: "power2.in" }, "<");
  tl.to(".c04-head, .c04-hint", { autoAlpha: 0, y: -20, duration: 0.6, ease: "power2.in" }, "<");
}
