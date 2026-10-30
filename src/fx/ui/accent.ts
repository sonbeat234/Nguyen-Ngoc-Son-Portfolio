// Chương hiện tại = chương cắt đường giữa viewport (tức chiếm phần lớn màn hình).
// Khi đổi: tween --accent/--accent-2 trên :root, báo cho dock (nhãn decode) và rail (chấm active).
import gsap from "gsap";

export type ChapterInfo = { el: HTMLElement; id: string; index: number; title: string; accent: string; accent2: string; scene: string | null };

export const chapters: ChapterInfo[] = [...document.querySelectorAll<HTMLElement>("section.chapter")].map((el, index) => ({
  el, id: el.id, index,
  title: el.dataset.title ?? el.id,
  accent: el.dataset.accent ?? "#8b7cff",
  accent2: el.dataset.accent2 ?? "#b9a8ff",
  scene: el.dataset.scene ?? el.dataset.preview ?? null,
}));

type Listener = (c: ChapterInfo) => void;
const listeners = new Set<Listener>();
let current: ChapterInfo | null = null;

export const currentChapter = () => current;
export function onChapter(fn: Listener) {
  listeners.add(fn);
  if (current) fn(current);
  return () => listeners.delete(fn);
}

/** tween accent toàn site (menu preview cũng dùng) */
export function tweenAccent(a: string, b: string, duration = 1.2) {
  gsap.to(document.documentElement, { "--accent": a, "--accent-2": b, duration, ease: "power2.out", overwrite: "auto" });
}

export function initAccent() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const c = chapters.find((x) => x.el === e.target);
      if (!c || c === current) continue;
      current = c;
      document.documentElement.dataset.chapter = c.id;
      tweenAccent(c.accent, c.accent2);
      listeners.forEach((fn) => fn(c));
      window.dispatchEvent(new CustomEvent("signal:chapter", { detail: { id: c.id, index: c.index, title: c.title } }));
    }
  }, { rootMargin: "-49.5% 0px -49.5% 0px", threshold: 0 });
  chapters.forEach((c) => io.observe(c.el));
}
