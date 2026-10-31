// Scroll-reveal nhẹ cho khối chưa có chuyển động vào màn: [data-rise] mờ → rõ + trượt lên 24px, MỘT lần.
// Các phần tử vào màn cùng lúc được stagger (ScrollTrigger.batch). Chỉ transform + opacity, xong thì gỡ inline style.
// Không gắn lên phần tử mà GSAP đã giữ transform (magnetic, tilt, reveal riêng của section) — gắn lên khung chứa.
// Reduced-motion: bỏ qua hẳn, nội dung hiện sẵn.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { state } from "../../core/state";

const Y = 24;          // px trượt lên
const DUR = 0.6;       // s — nằm trong khoảng 200–600 ms
const STAGGER = 0.08;  // s giữa các phần tử cùng batch

export function initRise(root: ParentNode = document) {
  const els = [...root.querySelectorAll<HTMLElement>("[data-rise]:not([data-fx-rise])")];
  if (!els.length) return;
  els.forEach((el) => (el.dataset.fxRise = "1"));
  if (state.reduced) return;

  gsap.set(els, { opacity: 0, y: Y });
  ScrollTrigger.batch(els, {
    start: "top 90%",
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      opacity: 1, y: 0, duration: DUR, ease: "power3.out", stagger: STAGGER, overwrite: true,
      clearProps: "opacity,transform",
    }),
  });
}
