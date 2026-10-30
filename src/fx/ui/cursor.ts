// Con trỏ: dùng con trỏ HỆ THỐNG (phần cứng, OS vẽ → không bao giờ trễ dù shader nặng) với hình SVG "probe"
// (chữ thập + chấm tâm, viền tối để nổi trên mọi nền) đổi màu theo accent của section.
// Vòng ring chỉ là lớp trang trí: bám rất nhanh (damp 32, độc lập fps), giãn theo tốc độ chuột,
// phóng to + hiện nhãn data-cursor khi trỏ vào link/nút, co lại khi nhấn.
// Không dùng mix-blend-mode: blend trên canvas WebGL toàn màn buộc compositing lại mỗi frame.
import { onTick } from "../../core/loop";
import { state } from "../../core/state";
import { damp } from "../../core/math";
import { onChapter } from "./accent";

const INK = "#04060a";

function cursorUrl(color: string, hot: boolean) {
  const svg = hot
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>` +
      `<circle cx='16' cy='16' r='4.2' fill='${INK}'/><circle cx='16' cy='16' r='3' fill='${color}'/></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>` +
      `<path d='M16 5v6.5M16 20.5V27M5 16h6.5M20.5 16H27' stroke='${INK}' stroke-width='3.4' stroke-linecap='round'/>` +
      `<path d='M16 5v6.5M16 20.5V27M5 16h6.5M20.5 16H27' stroke='${color}' stroke-width='1.5' stroke-linecap='round'/>` +
      `<circle cx='16' cy='16' r='2.6' fill='${INK}'/><circle cx='16' cy='16' r='1.6' fill='${color}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16`;
}

function setCursorColor(color: string) {
  const root = document.documentElement.style;
  root.setProperty("--cur", cursorUrl(color, false));
  root.setProperty("--cur-hot", cursorUrl(color, true));
}

export function initCursor() {
  if (state.touch) return;
  setCursorColor(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#5ce1ff");
  document.documentElement.classList.add("has-cursor");
  onChapter((c) => setCursorColor(c.accent));

  const ring = document.createElement("div");
  ring.className = "cur-ring";
  ring.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "cur-label";
  ring.appendChild(label);
  document.body.appendChild(ring);

  let rx = 0, ry = 0, scale = 1, targetScale = 1, seen = false;
  let lastX = -1, lastY = -1, lastS = -1;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || seen) return;
    seen = true;                                   // xuất hiện ngay tại con trỏ, không trượt từ góc màn
    rx = e.clientX; ry = e.clientY;
    ring.classList.add("is-on");
  }, { passive: true });
  document.addEventListener("pointerover", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("a,button,[data-cursor]");
    targetScale = t ? Number(t.dataset.cursorScale ?? 1.9) : 1;
    label.textContent = t?.dataset.cursor ?? "";
    ring.classList.toggle("is-hot", !!t);
    ring.classList.toggle("has-label", !!t?.dataset.cursor);
  });
  document.documentElement.addEventListener("pointerleave", () => ring.classList.remove("is-on"));
  document.documentElement.addEventListener("pointerenter", () => { if (seen) ring.classList.add("is-on"); });

  onTick((_, dt) => {
    if (!seen) return;
    const m = state.mouse;
    if (state.reduced) { rx = m.x; ry = m.y; }
    else { rx = damp(rx, m.x, 32, dt); ry = damp(ry, m.y, 32, dt); }
    scale = damp(scale, targetScale * (m.down ? 0.78 : 1), 18, dt);
    const stretch = state.reduced ? 0 : Math.min(m.speed / 5000, 0.35);
    const s = scale + stretch;
    // bỏ qua ghi DOM khi vòng đã đứng yên đúng chỗ
    if (Math.abs(rx - lastX) < 0.05 && Math.abs(ry - lastY) < 0.05 && Math.abs(s - lastS) < 0.002) return;
    lastX = rx; lastY = ry; lastS = s;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0) translate(-50%,-50%) scale(${s.toFixed(3)},${(scale - stretch * 0.5).toFixed(3)})`;
  });
}
