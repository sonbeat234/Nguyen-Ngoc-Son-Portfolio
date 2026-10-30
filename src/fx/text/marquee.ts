// Marquee vô tận, tốc độ và chiều theo vận tốc cuộn.
import { onTick } from "../../core/loop";
import { state } from "../../core/state";

/** track: phần tử chứa nội dung lặp (bọc trong .marquee để cắt tràn). base: px/s */
export function marquee(track: HTMLElement, base = Number(track.dataset.speed || 60)) {
  if (track.dataset.fxMarquee) return;
  track.dataset.fxMarquee = "1";
  track.innerHTML += track.innerHTML;                          // nhân đôi để lặp liền mạch
  let x = 0;
  let half = track.scrollWidth / 2;                            // cache: chỉ đo lại khi resize
  new ResizeObserver(() => (half = track.scrollWidth / 2)).observe(track);
  const dir = track.dataset.dir === "right" ? -1 : 1;
  onTick((_, dt) => {
    if (state.reduced || half <= 0) return;
    const speed = base * (1 + Math.abs(state.scroll.smooth) * 6) * state.scroll.direction * dir;
    x = (x - speed * dt) % half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
}

export function initMarquee(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-marquee]").forEach((t) => marquee(t));
}
