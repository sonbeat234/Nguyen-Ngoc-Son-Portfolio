// Flow Field — port threeui-main/src/shaders/neuform-isolated/sources/flow-field.html (spec mục 10.1).
// 2500 hạt (mobile 1000) trôi theo trường simplex 3D, vệt đuôi bằng nền mờ dần, chuột (toạ độ local) đẩy hạt.
// Tối ưu: stroke được gom theo bucket (8 màu × 3 alpha × 2 độ dày) → ~48 lần stroke/frame thay vì 2500.
// Palette chuyển amber → coral theo `mix` (tiến độ chương).
import { SimplexNoise } from "./simplex";
import { state } from "../core/state";

const AMBER = [[200, 149, 108], [212, 165, 116], [224, 120, 80], [190, 130, 90], [230, 180, 140], [210, 100, 70], [180, 160, 120]];
const CORAL = [[238, 116, 96], [248, 134, 110], [255, 108, 96], [228, 88, 80], [252, 156, 128], [234, 76, 86], [244, 140, 114]];
const CB = 8, ALPHAS = [0.22, 0.42, 0.66], WIDTHS = [0.75, 1.55];
const NBK = CB * ALPHAS.length * WIDTHS.length;

export type FlowPointer = { x: number; y: number; active: boolean };

export function createFlowField(canvas: HTMLCanvasElement, count = 2500) {
  const ctx = canvas.getContext("2d")!;
  const noise = new SimplexNoise(42);
  const n = state.mobile ? Math.round(count / 2.5) : count;
  const px = new Float32Array(n), py = new Float32Array(n), sp = new Float32Array(n);
  const ab = new Uint8Array(n), wb = new Uint8Array(n);
  const segs = Array.from({ length: NBK }, () => new Float32Array(n * 4));
  const counts = new Int32Array(NBK);
  const colors: string[] = new Array(CB).fill("#000");
  let W = 1, H = 1, t = 0, lastMix = -1;

  for (let i = 0; i < n; i++) {
    sp[i] = 0.4 + Math.random();
    const a = 0.15 + Math.random() * 0.55;                       // alpha gốc 0.15..0.7 → 3 bucket
    ab[i] = a < 0.33 ? 0 : a < 0.52 ? 1 : 2;
    wb[i] = 0.5 + Math.random() * 1.5 < 1.25 ? 0 : 1;            // size gốc 0.5..2 → 2 bucket
  }
  const scatter = () => { for (let i = 0; i < n; i++) { px[i] = Math.random() * W; py[i] = Math.random() * H; } };

  const resize = (w = canvas.clientWidth, h = canvas.clientHeight) => {
    const dpr = Math.min(devicePixelRatio || 1, 2) * state.quality;
    W = Math.max(1, w); H = Math.max(1, h);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round";
    scatter();
  };

  const paint = (mix: number) => {
    for (let c = 0; c < CB; c++) {
      const f = ((c + 0.5) / CB) * (AMBER.length - 1);
      const i0 = Math.floor(f), i1 = Math.min(AMBER.length - 1, i0 + 1), k = f - i0;
      const ch = (j: number) => {
        const a = AMBER[i0][j] + (AMBER[i1][j] - AMBER[i0][j]) * k;
        const b = CORAL[i0][j] + (CORAL[i1][j] - CORAL[i0][j]) * k;
        return Math.round(a + (b - a) * mix);
      };
      colors[c] = `rgb(${ch(0)},${ch(1)},${ch(2)})`;
    }
  };

  return {
    resize,
    /** local: con trỏ trong toạ độ canvas; mix: 0 amber → 1 coral; dt: giây */
    render(local: FlowPointer, mix: number, dt: number) {
      if (Math.abs(mix - lastMix) > 0.01) { paint(mix); lastMix = mix; }
      const step = Math.min(dt * 60, 2) * (state.reduced ? 0.25 : 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(10,10,10,0.03)";                          // vệt đuôi
      ctx.fillRect(0, 0, W, H);
      t += 0.0008 * step * (1 + Math.abs(state.scroll.smooth) * 5);   // cuộn nhanh → trường xoáy nhanh
      counts.fill(0);
      const TAU = Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const x = px[i], y = py[i];
        const nx = x * 0.0025, ny = y * 0.0025;
        const a = noise.noise3D(nx, ny, t) * TAU;
        const cn = (noise.noise3D(nx * 1.5 + 100, ny * 1.5 + 100, t * 0.5) + 1) * 0.5;
        let vx = Math.cos(a) * sp[i] * 1.2, vy = Math.sin(a) * sp[i] * 1.2;
        if (local.active) {
          const dx = x - local.x, dy = y - local.y, d = Math.hypot(dx, dy) || 1;
          if (d < 150) { const k = (1 - d / 150) * 2.5; vx += (dx / d) * k; vy += (dy / d) * k; }
        }
        const x2 = x + vx * step, y2 = y + vy * step;
        if (x2 < 0 || x2 > W || y2 < 0 || y2 > H) { px[i] = Math.random() * W; py[i] = Math.random() * H; continue; }
        px[i] = x2; py[i] = y2;
        const c = Math.min(CB - 1, Math.max(0, Math.floor(cn * CB)));
        const b = (c * ALPHAS.length + ab[i]) * WIDTHS.length + wb[i];
        const o = counts[b] * 4, s = segs[b];
        s[o] = x; s[o + 1] = y; s[o + 2] = x2; s[o + 3] = y2;
        counts[b]++;
      }
      for (let b = 0; b < NBK; b++) {
        const m = counts[b];
        if (!m) continue;
        const w = b % WIDTHS.length, al = Math.floor(b / WIDTHS.length) % ALPHAS.length, c = Math.floor(b / (WIDTHS.length * ALPHAS.length));
        ctx.strokeStyle = colors[c];
        ctx.globalAlpha = ALPHAS[al];
        ctx.lineWidth = WIDTHS[w];
        ctx.beginPath();
        const s = segs[b];
        for (let k = 0; k < m; k++) { const o = k * 4; ctx.moveTo(s[o], s[o + 1]); ctx.lineTo(s[o + 2], s[o + 3]); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    dispose() { /* 2D: không giữ tài nguyên ngoài */ },
  };
}
