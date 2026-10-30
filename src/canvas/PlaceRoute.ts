// Minh hoạ physical design cho Stage 06, lặp vô hạn (chu kỳ CYCLE giây):
// 0–32% placement (standard cell rơi vào hàng) → 34–48% clock tree chữ H mọc từ tâm
// → 48–88% routing Manhattan (M1 ngang, M2 dọc) → giữ một nhịp rồi mờ đi và lặp.
// Hình học tính trước bằng RNG có seed vào typed array; render không cấp phát.
import { state } from "../core/state";
import { clamp } from "../core/math";

const ROWS = 9;
const NETS = 34;
const CYCLE = 11;
const CELL_FILL = "rgba(233,237,242,0.150)";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPlaceRoute(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const r = rng(0x1c2d);

  // cell: x, width, row, thời điểm xuất hiện
  const xs: number[] = [], ws: number[] = [], rows: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    let x = 0.01 + r() * 0.03;
    while (x < 0.95) {
      const w = 0.025 + r() * 0.06;
      if (x + w > 0.99) break;
      xs.push(x); ws.push(w); rows.push(row);
      x += w + 0.006 + (r() < 0.2 ? r() * 0.05 : 0);
    }
  }
  const N = xs.length;
  const cx = Float32Array.from(xs), cw = Float32Array.from(ws), crow = Uint8Array.from(rows);
  const cAt = new Float32Array(N);
  const order = Array.from({ length: N }, (_, i) => i).sort(() => r() - 0.5);
  order.forEach((c, k) => (cAt[c] = (k / N) * 0.3));

  // net: chân ở tâm 2 cell khác hàng, đi M1 ngang rồi M2 dọc
  const nA = new Uint16Array(NETS), nB = new Uint16Array(NETS), nAt = new Float32Array(NETS);
  for (let i = 0; i < NETS; i++) {
    nA[i] = (r() * N) | 0;
    do nB[i] = (r() * N) | 0; while (crow[nB[i]] === crow[nA[i]]);
    nAt[i] = 0.48 + (i / NETS) * 0.32;
  }

  let w = 1, h = 1, dpr = 1, t = 0;
  const css = getComputedStyle(canvas);
  const m1 = css.getPropertyValue("--pr-m1").trim() || "#5ce1ff";
  const m2 = css.getPropertyValue("--pr-m2").trim() || "#a08cff";
  const clk = css.getPropertyValue("--pr-clk").trim() || "#f2c86b";

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2) * state.quality;
    w = Math.max(1, canvas.clientWidth);
    h = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  resize();

  function render(dt: number) {
    t = (t + dt * (state.reduced ? 0.25 : 1) / CYCLE) % 1;
    const fade = 1 - clamp((t - 0.93) / 0.07);
    const pad = Math.min(w, h) * 0.08;
    const X = pad, Y = pad, W = w - pad * 2, H = h - pad * 2, rh = H / ROWS;
    const px = (u: number) => X + u * W, py = (v: number) => Y + v * H;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = fade;

    // biên lõi + vòng pad I/O + hàng cell
    ctx.strokeStyle = "rgba(233,237,242,.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(X - 6.5, Y - 6.5, W + 13, H + 13);
    ctx.fillStyle = "rgba(233,237,242,.18)";
    for (let i = 1; i < 12; i++) {
      const u = i / 12;
      ctx.fillRect(px(u) - 3, Y - 14, 6, 5); ctx.fillRect(px(u) - 3, Y + H + 9, 6, 5);
      ctx.fillRect(X - 14, py(u) - 3, 5, 6); ctx.fillRect(X + W + 9, py(u) - 3, 5, 6);
    }
    ctx.strokeStyle = "rgba(233,237,242,.07)";
    ctx.beginPath();
    for (let i = 0; i <= ROWS; i++) { const y = Math.round(Y + i * rh) + 0.5; ctx.moveTo(X, y); ctx.lineTo(X + W, y); }
    ctx.stroke();

    // placement
    for (let i = 0; i < N; i++) {
      const k = clamp((t - cAt[i]) / 0.05);
      if (k <= 0) continue;
      const x = px(cx[i]), cwid = cw[i] * W, y = Y + crow[i] * rh;
      const drop = (1 - k) * rh * 0.8;
      ctx.fillStyle = k >= 1 ? CELL_FILL : `rgba(233,237,242,${(0.05 + 0.1 * k).toFixed(3)})`;
      ctx.fillRect(x, y + rh * 0.14 - drop, cwid, rh * 0.72);
      ctx.strokeStyle = "rgba(233,237,242,.32)";
      ctx.strokeRect(x + 0.5, y + rh * 0.14 - drop + 0.5, cwid - 1, rh * 0.72 - 1);
    }

    // clock tree chữ H: 4 cấp, mỗi cấp mọc ra trong 1/4 pha CTS
    const ct = clamp((t - 0.34) / 0.14);
    if (ct > 0) {
      ctx.strokeStyle = clk; ctx.lineWidth = 1.6;
      ctx.beginPath();
      hLevel(0.5, 0.5, 0.25, 0, ct * 4);
      ctx.stroke();
    }

    // routing
    ctx.lineWidth = 1.4;
    for (let i = 0; i < NETS; i++) {
      const f = clamp((t - nAt[i]) / 0.08);
      if (f <= 0) continue;
      const a = nA[i], b = nB[i];
      const ax = px(cx[a] + cw[a] / 2), ay = Y + (crow[a] + 0.5) * rh;
      const bx = px(cx[b] + cw[b] / 2), by = Y + (crow[b] + 0.5) * rh;
      const dx = bx - ax, dy = by - ay, L = Math.abs(dx) + Math.abs(dy), d = f * L;
      const hx = Math.min(d, Math.abs(dx)) * Math.sign(dx);
      ctx.strokeStyle = m1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + hx, ay); ctx.stroke();
      if (d > Math.abs(dx)) {
        ctx.strokeStyle = m2;
        ctx.beginPath(); ctx.moveTo(bx, ay); ctx.lineTo(bx, ay + (d - Math.abs(dx)) * Math.sign(dy)); ctx.stroke();
      }
      ctx.fillStyle = m1;
      ctx.fillRect(ax - 2, ay - 2, 4, 4);
      if (f >= 1) { ctx.fillStyle = m2; ctx.fillRect(bx - 2, by - 2, 4, 4); }
    }
    ctx.globalAlpha = 1;

    // H-tree đệ quy: cấp chẵn nằm ngang, cấp lẻ thẳng đứng; grow = số cấp đã mọc (có phần lẻ)
    function hLevel(u: number, v: number, half: number, level: number, grow: number) {
      const k = clamp(grow - level);
      if (k <= 0 || level > 3) return;
      const horizontal = level % 2 === 0;
      const e = half * k;
      if (horizontal) { ctx.moveTo(px(u - e), py(v)); ctx.lineTo(px(u + e), py(v)); }
      else { ctx.moveTo(px(u), py(v - e)); ctx.lineTo(px(u), py(v + e)); }
      if (k < 1) return;
      const next = level % 2 === 0 ? half : half / 2;
      if (horizontal) { hLevel(u - half, v, next, level + 1, grow); hLevel(u + half, v, next, level + 1, grow); }
      else { hLevel(u, v - half, next, level + 1, grow); hLevel(u, v + half, next, level + 1, grow); }
    }
  }

  return { render, resize };
}
