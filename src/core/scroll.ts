import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { state } from "./state";

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

export const lenis = new Lenis({
  lerp: state.reduced ? 1 : 0.085,
  smoothWheel: !state.reduced,
  wheelMultiplier: 0.95,
  touchMultiplier: 1.4,
});

lenis.on("scroll", (l: Lenis) => {
  state.scroll.y = l.scroll;
  state.scroll.velocity = state.reduced ? 0 : l.velocity;
  state.scroll.progress = l.progress;
  state.scroll.direction = (l.direction || state.scroll.direction || 1) as 1 | -1;
  ScrollTrigger.update();
});
// chạy trước tick chính (prioritize) để state.scroll luôn mới trong cùng frame
gsap.ticker.add((t) => lenis.raf(t * 1000), false, true);

/** offset (px, âm = dừng sớm hơn) để đích không nằm sát mép trên, dưới dock */
export const scrollTo = (target: string | HTMLElement | number, duration = 1.6, offset = 0) =>
  lenis.scrollTo(target as never, { duration, offset, easing: (t: number) => 1 - Math.pow(1 - t, 4) });

/** Khoá scroll trong preloader và menu. Nhiều lý do khoá chồng nhau được (preloader, menu, tab ẩn). */
const locks = new Set<string>();
export const lockScroll = (on: boolean, reason = "app") => {
  if (on) locks.add(reason); else locks.delete(reason);
  if (locks.size) lenis.stop(); else lenis.start();
};
document.addEventListener("visibilitychange", () => lockScroll(document.hidden, "hidden"));
