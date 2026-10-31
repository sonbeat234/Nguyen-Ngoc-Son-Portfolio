// Chữ sáng dần theo scroll (manifesto) + highlight gradient cho <em>.
// V4 (đọc chữ): từ chưa "sáng" vẫn đọc được — bắt đầu ở opacity 0.4 màu --mute, sáng hết sớm (bottom 55%) thành --bone.
// <em> KHÔNG bị tách (SplitText ignore) để background-clip:text giữ được: gradient PRIMARY → SIGNAL quét ngang khi sáng.
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { state } from "../../core/state";
import { token } from "../../stage/palette";

export function scrubWords(el: HTMLElement) {
  el.dataset.fxScrub = "1";
  if (state.reduced) { el.classList.add("is-lit"); return; }   // giảm chuyển động: chữ hiện đủ ngay, không mờ chờ cuộn
  const ems = [...el.querySelectorAll<HTMLElement>("em")];
  const split = SplitText.create(el, { type: "words", ignore: "em" });
  const words = (split.words as HTMLElement[]).filter((w) => !w.closest("em"));
  const trigger = { trigger: el, start: "top 80%", end: "bottom 55%", scrub: 0.6 };
  gsap.fromTo(words, { opacity: 0.4, color: token("--mute") }, {
    opacity: 1, color: token("--bone"), stagger: 0.06, ease: "none", scrollTrigger: trigger,
  });
  ems.forEach((em) => {
    // em giữ opacity 1 (màu chờ là --mute, đã đủ tương phản trên panel); chỉ quét gradient
    gsap.fromTo(em, { backgroundPositionX: "100%" }, {
      backgroundPositionX: "0%", ease: "none",
      scrollTrigger: { trigger: em, start: "top 78%", end: "top 52%", scrub: true },
    });
  });
}

export function initScrub(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-scrub]:not([data-fx-scrub])").forEach(scrubWords);
}
