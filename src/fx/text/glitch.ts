// Glitch khi chuột di nhanh (Flux Vortex: neuform-isolated/sources/flux-vortex.html).
import gsap from "gsap";
import { onTick } from "../../core/loop";
import { state } from "../../core/state";

const targets = new Set<HTMLElement>();
let started = false;
/** ngưỡng px/s; chương có thể hạ xuống (vd Signal Lost) bằng setGlitchThreshold */
let threshold = 1800;
export const setGlitchThreshold = (v: number) => (threshold = v);

export function glitchOnce(el: HTMLElement, strength = 1) {
  if (el.dataset.animating) return;
  el.dataset.animating = "1";
  gsap.to(el, {
    x: () => (Math.random() - 0.5) * 6 * strength, y: () => (Math.random() - 0.5) * 3 * strength,
    textShadow: "2px 0 rgba(255,60,90,.55), -2px 0 rgba(60,220,255,.55)",
    duration: 0.05, yoyo: true, repeat: 5,
    onComplete: () => { gsap.set(el, { x: 0, y: 0, textShadow: "none" }); setTimeout(() => (el.dataset.animating = ""), 220); },
  });
}

export function addGlitch(el: HTMLElement) {
  targets.add(el);
  if (started) return;
  started = true;
  onTick(() => {
    if (state.reduced || state.mouse.speed < threshold) return;
    targets.forEach((t) => glitchOnce(t));
  });
}

export function initGlitch(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-glitch]").forEach(addGlitch);
}
