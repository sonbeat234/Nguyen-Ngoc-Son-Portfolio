// Cursor dot + ring, nhãn theo data-cursor, đổi màu theo accent, giãn theo tốc độ chuột.
import { onTick } from "../../core/loop";
import { state } from "../../core/state";
import { damp } from "../../core/math";

export function initCursor() {
  if (state.touch) return;
  document.documentElement.classList.add("has-cursor");
  const dot = document.createElement("div"); dot.className = "cur-dot";
  const ring = document.createElement("div"); ring.className = "cur-ring";
  const label = document.createElement("span"); label.className = "cur-label"; ring.appendChild(label);
  dot.setAttribute("aria-hidden", "true"); ring.setAttribute("aria-hidden", "true");
  document.body.append(dot, ring);
  let rx = state.mouse.x, ry = state.mouse.y, scale = 1, targetScale = 1;

  document.addEventListener("pointerover", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("a,button,[data-cursor]");
    targetScale = t ? Number(t.dataset.cursorScale ?? 2.2) : 1;
    label.textContent = t?.dataset.cursor ?? "";
    ring.classList.toggle("has-label", !!t?.dataset.cursor);
  });
  document.addEventListener("pointerleave", () => { dot.style.opacity = ring.style.opacity = "0"; });
  document.addEventListener("pointerenter", () => { dot.style.opacity = ring.style.opacity = ""; });
  onTick((_, dt) => {
    rx = damp(rx, state.mouse.x, 14, dt); ry = damp(ry, state.mouse.y, 14, dt);
    scale = damp(scale, targetScale * (state.mouse.down ? 0.8 : 1), 12, dt);
    const stretch = Math.min(state.mouse.speed / 4000, 0.5);
    dot.style.transform = `translate3d(${state.mouse.x}px,${state.mouse.y}px,0) translate(-50%,-50%)`;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%) scale(${scale + stretch},${scale - stretch * 0.5})`;
  });
}

/** co cursor lại một nhịp (vd khi đánh chuông) */
export function pulseCursor() {
  const ring = document.querySelector<HTMLElement>(".cur-ring");
  ring?.animate([{ scale: "1" }, { scale: "0.55" }, { scale: "1" }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)", composite: "add" });
}
