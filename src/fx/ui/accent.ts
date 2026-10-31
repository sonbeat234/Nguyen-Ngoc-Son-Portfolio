// Chương hiện tại = chương cắt đường giữa viewport (tức chiếm phần lớn màn hình).
//
// V5-perf: KHÔNG tween --accent/--accent-2 trên :root nữa. Hai biến là @property inherits:true → mỗi frame tween
// = style recalc TOÀN TRANG (1095 phần tử, ~36 ms/lần đo được trên Intel UHD) đúng lúc dissolve shader chạy.
// Thay vào đó:
//  - mỗi section mang accent TĨNH của nó (style inline lúc init) → nội dung không bao giờ restyle khi đổi chương;
//  - chỉ các lớp UI cố định (dock, rail, progress, trace, menu) nhận accent chương hiện tại, chuyển màu bằng
//    CSS transition của @property --accent ngay trên chính chúng (cây DOM nhỏ, base.css);
//  - overlay project mang accent của Projects.
// ?legacyfx: hành vi cũ (gsap tween trên :root) để so sánh.
import gsap from "gsap";
import { token } from "../../stage/palette";
import { state } from "../../core/state";

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
/** báo màu accent UI mới (một lần mỗi lần đổi) */
export function onAccent(fn: AccentListener) {
  accentListeners.add(fn);
  return () => accentListeners.delete(fn);
}

/** các lớp UI cố định nhận accent của chương hiện tại (transition CSS trên chính chúng) */
const UI = ".dock, .rail, .progress, .trace, #menu";
let uiRoots: HTMLElement[] = [];

/** đổi accent của UI toàn cục (menu preview cũng dùng): ghi 1 lần, CSS transition lo phần chuyển màu */
export function tweenAccent(a: string, b: string, duration = 1.2) {
  if (state.legacyfx) return legacyTween(a, b, duration);
  if (!uiRoots.length) uiRoots = [...document.querySelectorAll<HTMLElement>(UI)];
  for (const el of uiRoots) {
    const s = el.style;
    s.setProperty("--accent-dur", `${duration}s`);
    s.setProperty("--accent", a);
    s.setProperty("--accent-2", b);
  }
  accentListeners.forEach((fn) => fn(a));
}

function legacyTween(a: string, b: string, duration: number) {
  const html = document.documentElement;
  gsap.to(html, {
    "--accent": a, "--accent-2": b, duration, ease: "power2.out", overwrite: "auto",
    onComplete: () => accentListeners.forEach((fn) => fn(a)),
  });
}

export function initAccent() {
  if (!state.legacyfx) {
    // accent tĩnh theo section + overlay project (mở từ Projects)
    for (const c of chapters) { c.el.style.setProperty("--accent", c.accent); c.el.style.setProperty("--accent-2", c.accent2); }
    const pj = chapters.find((c) => c.id === "projects"), pv = document.getElementById("project-view");
    if (pj && pv) { pv.style.setProperty("--accent", pj.accent); pv.style.setProperty("--accent-2", pj.accent2); }
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const c = chapters.find((x) => x.el === e.target);
      if (!c || c === current) continue;
      current = c;
      tweenAccent(c.accent, c.accent2);
      listeners.forEach((fn) => fn(c));
      window.dispatchEvent(new CustomEvent("signal:chapter", { detail: { id: c.id, index: c.index, title: c.title } }));
    }
  }, { rootMargin: "-49.5% 0px -49.5% 0px", threshold: 0 });
  chapters.forEach((c) => io.observe(c.el));
}
