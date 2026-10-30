// Skew + giãn chữ lớn theo vận tốc cuộn.
import gsap from "gsap";
import { onTick } from "../../core/loop";
import { state } from "../../core/state";

type Setter = { skew: gsap.QuickToFunc; sy: gsap.QuickToFunc; k: number };
const setters: Setter[] = [];
let started = false;

export function addSkew(el: HTMLElement, k = Number(el.dataset.skew || 1)) {
  if (state.reduced || el.dataset.fxSkew) return;
  el.dataset.fxSkew = "1";
  setters.push({
    skew: gsap.quickTo(el, "skewY", { duration: 0.5, ease: "power3.out" }),
    sy: gsap.quickTo(el, "scaleY", { duration: 0.5, ease: "power3.out" }),
    k,
  });
  if (started) return;
  started = true;
  let last = 0;
  onTick(() => {
    const v = state.scroll.smooth;
    if (Math.abs(v - last) < 0.002) return;          // không gọi quickTo khi đứng yên
    last = v;
    setters.forEach((s) => { s.skew(v * -6 * s.k); s.sy(1 + Math.abs(v) * 0.12 * s.k); });
  });
}

export function initVelocitySkew(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-skew]").forEach((el) => addSkew(el));
}
