// Nút/phần tử bị con trỏ hút nhẹ (elastic). data-magnetic="0.5" = độ hút.
import gsap from "gsap";
import { state } from "../../core/state";

export function magnetic(el: HTMLElement, strength = Number(el.dataset.magnetic || 0.35)) {
  if (state.touch || el.dataset.fxMagnetic) return;
  el.dataset.fxMagnetic = "1";
  const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  });
  el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
}

export function initMagnetic(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => magnetic(el));
}
