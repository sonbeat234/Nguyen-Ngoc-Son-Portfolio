// "Kính mờ" vẽ trong composite của stage, thay cho CSS backdrop-filter (V5-perf mục b).
// backdrop-filter nằm trên canvas WebGL vẽ lại mỗi frame → GPU process phải blur lại cả vùng mỗi frame (trace before:
// FinishPaintRenderPass ~2.3 s / 7 s). Ở đây: đo rect các khối kính đang hiện ở tick "early" (như shield.ts) → stage
// blur nền 1/4 độ phân giải một lần cho mọi khối và dán vào đúng khung bo góc. Panel DOM giữ nền bán trong suốt cũ.
// Độ mạnh = opacity inline mà GSAP đang ghi (readout mờ dần khi cuộn, card hiện dần) — khối ẩn thì kính cũng ẩn.
// ?legacyfx: tắt module này, CSS backdrop-filter cũ chạy lại (base.css / sections/*.css: html.legacyfx …).
import { onTick } from "../../core/loop";
import { state } from "../../core/state";
import { stage } from "../../stage/instance";

const MAX = 8;
/** [selector, bão hoà] — bão hoà như saturate() của backdrop-filter cũ */
const SPECS: [string, number][] = [
  [".hero-readout", 1], ["#about .about-text", 1.2], ["#flow .stage", 1], [".card", 1.2], [".btn-glass > span", 1],
];

type Pane = { el: HTMLElement; sat: number; rad: number };

export function initFrost(root: ParentNode = document) {
  if (state.legacyfx) return;
  const panes: Pane[] = [];
  for (const [sel, sat] of SPECS) {
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (el.dataset.fxFrost) return;
      el.dataset.fxFrost = "1";
      panes.push({ el, sat, rad: 0 });
    });
  }
  if (!panes.length) return;
  // bán kính góc: đọc lúc init / resize (không mỗi frame)
  const radii = () => panes.forEach((p) => (p.rad = parseFloat(getComputedStyle(p.el).borderTopLeftRadius) || 0));
  radii();
  addEventListener("resize", radii);

  const visible = new Set<Pane>();
  const byEl = new Map(panes.map((p) => [p.el, p]));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const p = byEl.get(e.target as HTMLElement)!;
    if (e.isIntersecting) visible.add(p); else visible.delete(p);
  }));
  panes.forEach((p) => io.observe(p.el));

  const html = document.documentElement, R = stage.frost, P = stage.frostP;
  onTick(() => {
    let n = 0;
    // menu / overlay project phủ trang: main ẩn nên kính phía sau cũng phải tắt
    if (!html.classList.contains("menu-open") && !html.classList.contains("pv-open")) {
      for (const p of visible) {
        if (n >= MAX) break;
        const op = p.el.style.opacity === "" ? 1 : parseFloat(p.el.style.opacity);
        if (!(op > 0.01)) continue;
        const b = p.el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        const k = n * 4;
        R[k] = b.left; R[k + 1] = b.top; R[k + 2] = b.right; R[k + 3] = b.bottom;
        P[k] = p.rad; P[k + 1] = Math.min(1, op); P[k + 2] = p.sat;
        n++;
      }
    }
    stage.frostN = n;
  }, "early");
}
