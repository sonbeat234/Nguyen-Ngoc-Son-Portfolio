// Chương hiện tại = chương cắt đường giữa viewport (tức chiếm phần lớn màn hình).
// Khi đổi: tween --accent/--accent-2 trên :root, báo cho dock (nhãn decode) và rail (chấm active).
import gsap from "gsap";
import { token } from "../../stage/palette";

export type ChapterInfo = { el: HTMLElement; id: string; index: number; title: string; accent: string; accent2: string; scene: string | null };

export const chapters: ChapterInfo[] = [...document.querySelectorAll<HTMLElement>("section.chapter")].map((el, index) => ({
  el, id: el.id, index,
  title: el.dataset.title ?? el.id,
  accent: el.dataset.accent ?? token("--primary"),
  accent2: el.dataset.accent2 ?? token("--primary-2"),
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

type AccentListener = (accent: string) => void;
const accentListeners = new Set<AccentListener>();
/** màu accent đang tween, báo theo nấc ~100 ms (con trỏ SVG không cần cập nhật mỗi frame) */
export function onAccent(fn: AccentListener) {
  accentListeners.add(fn);
  return () => accentListeners.delete(fn);
}

/** tween accent toàn site (menu preview cũng dùng) */
export function tweenAccent(a: string, b: string, duration = 1.2) {
  const html = document.documentElement;
  let last = 0;
  const emit = (v: string) => accentListeners.forEach((fn) => fn(v));
  gsap.to(html, {
    "--accent": a, "--accent-2": b, duration, ease: "power2.out", overwrite: "auto",
    onUpdate() {
      const now = performance.now();
      if (now - last < 100) return;
      last = now;
      emit(String(gsap.getProperty(html, "--accent")));
    },
    onComplete: () => emit(a),
  });
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
