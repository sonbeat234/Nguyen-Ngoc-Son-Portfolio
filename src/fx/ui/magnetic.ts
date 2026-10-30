// Nút/phần tử bị con trỏ hút nhẹ (elastic). data-magnetic="0.5" = độ hút.
// quickTo tạo ở lần chạm đầu (không giành thuộc tính x/y của tween intro đang chờ phát);
// độ lệch tính theo tâm GỐC của nút (trừ phần đã bị hút) → lực hút ổn định, không rung.
import gsap from "gsap";
import { state } from "../../core/state";

export function magnetic(el: HTMLElement, strength = Number(el.dataset.magnetic || 0.35)) {
  if (state.touch || el.dataset.fxMagnetic) return;
  el.dataset.fxMagnetic = "1";
  let xTo: gsap.QuickToFunc | null = null, yTo: gsap.QuickToFunc | null = null;
  el.addEventListener("pointermove", (e) => {
    xTo ??= gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    yTo ??= gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - (gsap.getProperty(el, "x") as number);
    const cy = r.top + r.height / 2 - (gsap.getProperty(el, "y") as number);
    xTo((e.clientX - cx) * strength);
    yTo((e.clientY - cy) * strength);
  });
  el.addEventListener("pointerleave", () => { xTo?.(0); yTo?.(0); });
}

export function initMagnetic(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => magnetic(el));
}
