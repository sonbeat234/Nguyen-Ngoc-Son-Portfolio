// "Precision frame" (portal-field.html): viền mảnh inset với 4 dấu góc, nhãn mono 4 góc,
// toạ độ chuột realtime + giờ UTC. Cập nhật chữ tối đa 10 lần/s, chỉ ghi DOM khi giá trị đổi.
import { onTick } from "../../core/loop";
import { state } from "../../core/state";

export function initPrecisionFrame(frame: HTMLElement, isActive: () => boolean = () => true) {
  const coords = frame.querySelector<HTMLElement>("[data-frame-coords]");
  const clock = frame.querySelector<HTMLElement>("[data-frame-clock]");
  let acc = 1, lastCoords = "", lastClock = "";
  return onTick((_, dt) => {
    acc += dt;
    if (acc < 0.1 || !isActive()) return;
    acc = 0;
    if (coords) {
      const t = `X ${(state.mouse.sx / state.w).toFixed(3)}  Y ${(state.mouse.sy / state.h).toFixed(3)}`;
      if (t !== lastCoords) { coords.textContent = t; lastCoords = t; }
    }
    if (clock) {
      const t = `${new Date().toISOString().slice(11, 19)} UTC`;
      if (t !== lastClock) { clock.textContent = t; lastClock = t; }
    }
  });
}
