// Masked line/word/char reveal (Amber Halftone, Topo, Particle Network) bằng GSAP SplitText.
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { state } from "../../core/state";

export type RevealMode = "words" | "lines" | "chars" | "flip";

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
  if (mode === "flip" && !state.reduced) return flipReveal(el);
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

/**
 * V4 "flip": ký tự lật 3D quanh trục X (rotateX -95° → 0), lan từ TÂM ra hai đầu; xong thì gỡ tách (DOM sạch, đọc
 * đúng) và chữ nghiêng <em> nhận một vệt gradient quét qua (CSS .is-swept). Không mask → dấu tiếng Việt không bị cắt.
 */
function flipReveal(el: HTMLElement) {
  const sp = SplitText.create(el, { type: "words,chars", charsClass: "fx-ch" });
  return gsap.fromTo(sp.chars, { rotateX: -95, opacity: 0, transformOrigin: "50% 50% -0.45em", transformPerspective: 600 }, {
    rotateX: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: { each: 0.026, from: "center" },
    scrollTrigger: { trigger: el, start: "top 86%", once: true },
    onComplete: () => { sp.revert(); el.classList.add("is-swept"); },
  });
}

/** mọi [data-reveal="words|lines|chars|flip"] chưa xử lý; data-reveal-manual để section tự gọi splitReveal */
export function initReveals(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-split):not([data-reveal-manual])").forEach((el) => {
    splitReveal(el, (el.dataset.reveal || "words") as RevealMode);
  });
}
