// Dải chữ chạy sóng theo scroll — chỉ port phần chuyển động của Character Wave / Filmstrip
// (threeui-main/src/shaders/character-carousel/sources/character-wave.html, hàm render(): mỗi card đặt theo
// delta = khoảng cách tới pha hiện tại, focus = exp(-d²·1.05), y lượn sin, rotateY/Z theo delta).
// Pha = tiến độ cuộn của chương + quán tính theo vận tốc. Không nhúng ảnh nhân vật (file gốc > 260KB).
import { onTick } from "../../core/loop";
import { state } from "../../core/state";
import { damp } from "../../core/math";

export function initCharacterWave(host: HTMLElement, text: string, getProgress: () => number) {
  const glyphs = [...text];
  const n = glyphs.length;
  const cards = glyphs.map((ch) => {
    const el = document.createElement("span");
    el.className = "cw-card";
    el.textContent = ch === " " ? "·" : ch;
    if (ch === " ") el.classList.add("is-gap");
    host.appendChild(el);
    return el;
  });
  let phase = 0, visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(host);

  const wrapped = (i: number, p: number) => {
    let d = i - p;
    d -= Math.round(d / n) * n;                // quấn vòng: mọi card luôn có vị trí gần pha
    return d;
  };

  onTick((_, dt) => {
    if (!visible) return;
    const target = getProgress() * n * 1.6 + state.time * (state.reduced ? 0 : 0.35);
    phase = damp(phase, target, state.reduced ? 30 : 5, dt);
    const spacing = Math.min(118, Math.max(46, state.w * 0.075));
    const lift = Math.min(28, state.w * 0.02) * (1 + Math.abs(state.scroll.smooth) * 2.2);
    for (let i = 0; i < n; i++) {
      const delta = wrapped(i, phase);
      const dist = Math.abs(delta);
      const focus = Math.exp(-dist * dist * 0.06);
      const side = Math.max(0, 1 - dist / (n * 0.5));
      const x = delta * spacing;
      const y = -Math.pow(dist, 1.2) * 1.5 + Math.sin(delta * 0.8 + state.time * 1.4) * lift;
      const z = focus * 95 - dist * 22;
      const s = 0.62 + side * 0.18 + focus * 0.4;
      const el = cards[i];
      el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${(-delta * 3.2).toFixed(2)}deg) rotateZ(${(delta * 1.1).toFixed(2)}deg) scale(${s.toFixed(3)})`;
      el.style.opacity = (Math.max(0.12, side * 0.7 + focus * 0.3)).toFixed(3);
    }
  });
}

/**
 * Biến thể nhãn (V4, preloader "POWER-ON"): cùng hàm focus exp(-d²·k) + sóng sin + rotateY theo delta của
 * Character Wave, nhưng ký tự GIỮ thứ tự và vị trí (chỉ nhô lên / sáng lên khi "đỉnh sóng" đi qua) để nhãn
 * vẫn đọc được. Chữ gốc đọc qua aria-label của host, các span tách ký tự aria-hidden. Trả về hàm dừng.
 */
export function waveLabel(host: HTMLElement, speed = 7) {
  const text = host.textContent ?? "";
  host.setAttribute("aria-label", text);
  host.textContent = "";
  const chars = [...text].map((ch) => {
    const el = document.createElement("span");
    el.className = "cw-ch";
    el.setAttribute("aria-hidden", "true");
    el.textContent = ch;
    host.appendChild(el);
    return el;
  });
  const n = chars.length;
  if (state.reduced) return () => {};
  const span = n + 4;                          // quãng nghỉ giữa hai lượt sóng
  const off = onTick(() => {
    const phase = (state.time * speed) % span - 2;
    for (let i = 0; i < n; i++) {
      const delta = i - phase;
      const focus = Math.exp(-delta * delta * 1.05);
      const s = chars[i].style;
      s.transform = `translate3d(0,${(-focus * 0.42).toFixed(3)}em,0) rotateY(${(-delta * 9 * focus).toFixed(1)}deg) scale(${(1 + focus * 0.22).toFixed(3)})`;
      s.setProperty("--f", focus.toFixed(3));
    }
  });
  return () => { off(); chars.forEach((c) => (c.style.transform = "")); };
}
