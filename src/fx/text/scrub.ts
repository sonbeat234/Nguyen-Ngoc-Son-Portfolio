// Chữ sáng dần theo scroll (manifesto) + highlight gradient cho <em>.
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { state } from "../../core/state";

export function scrubWords(el: HTMLElement) {
  el.dataset.fxScrub = "1";
  if (state.reduced) return;                       // giảm chuyển động: chữ hiện đủ ngay, không mờ chờ cuộn
  const split = SplitText.create(el, { type: "words" });
  gsap.fromTo(split.words, { opacity: 0.1, color: "#8a8a93" }, {
    opacity: 1, color: "#edebe6", stagger: 0.06, ease: "none",
    scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 38%", scrub: 0.6 },
  });
  // từ được bọc <em> nhận gradient accent chạy ngang khi sáng
  el.querySelectorAll("em").forEach((em) => {
    gsap.fromTo(em, { backgroundPositionX: "100%" }, {
      backgroundPositionX: "0%", ease: "none",
      scrollTrigger: { trigger: em, start: "top 75%", end: "top 45%", scrub: true },
    });
  });
}

export function initScrub(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-scrub]:not([data-fx-scrub])").forEach(scrubWords);
}
