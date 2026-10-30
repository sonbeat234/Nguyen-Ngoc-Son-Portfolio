// Masked line/word/char reveal (Amber Halftone, Topo, Particle Network) bằng GSAP SplitText.
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { state } from "../../core/state";

export type RevealMode = "words" | "lines" | "chars";

function targetsOf(self: SplitText, mode: RevealMode) {
  return mode === "chars" ? self.chars : mode === "lines" ? self.lines : self.words;
}

/**
 * Tách el và trả về animation reveal.
 * - trigger mặc định: ScrollTrigger "top 86%" của chính el.
 * - trigger:false → tween dừng ở trạng thái ẩn (paused) để section tự play()/timeline hoá.
 */
export function splitReveal(el: HTMLElement, mode: RevealMode = "words", trigger: boolean | ScrollTrigger.Vars = true) {
  el.classList.add("is-split");
  if (state.reduced) {
    // chế độ thay thế: fade đơn giản, không tách chữ
    return gsap.from(el, {
      opacity: 0, duration: 0.8, ease: "power1.out", paused: trigger === false,
      scrollTrigger: trigger === false ? undefined : { trigger: el, start: "top 86%", toggleActions: "play none none reverse", ...(typeof trigger === "object" ? trigger : {}) },
    });
  }
  let anim: gsap.core.Tween | undefined;
  SplitText.create(el, {
    type: "lines,words,chars",
    mask: mode === "chars" ? "words" : "lines",
    autoSplit: true,
    onSplit(self) {
      anim = gsap.from(targetsOf(self, mode), {
        yPercent: 115,
        rotate: mode === "chars" ? 8 : 0,
        opacity: 0,
        filter: "blur(6px)",
        duration: 1.15,
        ease: "power4.out",
        stagger: mode === "chars" ? 0.018 : 0.045,
        paused: trigger === false,
        scrollTrigger: trigger === false ? undefined : { trigger: el, start: "top 86%", toggleActions: "play none none reverse", ...(typeof trigger === "object" ? trigger : {}) },
      });
      return anim;
    },
  });
  return anim!;
}

/** mọi [data-reveal="words|lines|chars"] chưa xử lý; data-reveal-manual để section tự gọi splitReveal */
export function initReveals(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-split):not([data-reveal-manual])").forEach((el) => {
    splitReveal(el, (el.dataset.reveal || "words") as RevealMode);
  });
}
