// Skeuomorphic Toggle — port vanilla của threeui-main/src/shaders/skeuomorphic-toggle/ModernToggle.tsx:
// núm chạy bằng lò xo (stiffness 210, damping 19.5), bị bóp theo vận tốc và nghiêng theo hướng chạy.
// Chạy trong tick chung (onTick), tự gỡ khi lò xo dừng.
import { onTick } from "../../core/loop";
import { state } from "../../core/state";

export function createToggle(root: HTMLElement, onChange: (on: boolean) => void, initial = false) {
  const sw = root.querySelector<HTMLButtonElement>("[role=switch]")!;
  const thumb = root.querySelector<HTMLElement>(".c09-toggle__thumb")!;
  let on = initial, value = on ? 1 : 0, velocity = 0;
  let off: (() => void) | null = null;

  const apply = (progress: number, speed: number) => {
    const travel = Math.max(0, sw.clientWidth - thumb.offsetLeft * 2 - thumb.offsetWidth);
    const lean = Math.min(1, Math.abs(speed) / 6);
    thumb.style.transformOrigin = speed >= 0 ? "right center" : "left center";
    thumb.style.transform = `translate3d(${(progress * travel).toFixed(2)}px,0,0) scale(${(1 + lean * 0.16).toFixed(4)},${(1 - lean * 0.1).toFixed(4)})`;
  };

  const run = () => {
    if (off) return;
    off = onTick((_, dt) => {
      const target = on ? 1 : 0;
      const d = Math.min(0.032, dt);
      velocity += ((target - value) * 210 - velocity * 19.5) * d;
      value += velocity * d;
      apply(value, velocity);
      if (Math.abs(target - value) < 0.0006 && Math.abs(velocity) < 0.006) {
        value = target; velocity = 0; apply(target, 0);
        off?.(); off = null;
      }
    });
  };

  const set = (next: boolean, emit = true) => {
    on = next;
    root.dataset.state = on ? "on" : "off";
    sw.setAttribute("aria-checked", String(on));
    if (state.reduced) { value = on ? 1 : 0; velocity = 0; apply(value, 0); }
    else run();
    if (emit) onChange(on);
  };

  sw.addEventListener("click", () => set(!on));
  root.querySelectorAll<HTMLElement>("[data-opt]").forEach((opt) =>
    opt.addEventListener("click", () => set(opt.dataset.opt === "yearly")));
  new ResizeObserver(() => apply(value, 0)).observe(sw);
  set(initial, false);
  return { set, get on() { return on; } };
}
