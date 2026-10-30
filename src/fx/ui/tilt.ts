// Tilt 3D + spotlight theo con trỏ cho card (CSS ở base.css .card::before/::after).
import gsap from "gsap";
import { state } from "../../core/state";

export function tilt(card: HTMLElement, amount = Number(card.dataset.tilt || 1)) {
  if (card.dataset.fxTilt) return;
  card.dataset.fxTilt = "1";
  const spot = (e: PointerEvent) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.setProperty("--mx", `${px * 100}%`);
    card.style.setProperty("--my", `${py * 100}%`);
    return { px, py };
  };
  if (state.touch) { card.addEventListener("pointermove", spot); return; }   // touch: chỉ spotlight
  const rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
  const ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
  gsap.set(card, { transformPerspective: 900 });
  card.addEventListener("pointermove", (e) => {
    const { px, py } = spot(e);
    rx((0.5 - py) * 10 * amount); ry((px - 0.5) * 12 * amount);
  });
  card.addEventListener("pointerleave", () => { rx(0); ry(0); });
}

export function initTilt(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => tilt(el));
}
