// Spark Badge — bản thu nhỏ của threeui-main/src/shaders/spark-badge/spark-badge.html cho nhãn "Recommended":
// cùng cơ chế gốc — mask hình → emitter trên đường biên (gradient của mask đã làm mềm) → tàn lửa phóng theo
// pháp tuyến, bị trường curl (2 lớp, precompute) bẻ cong, vẽ thành nét ngắn theo chuyển động và gom theo
// mức sáng (LEVELS) với blend "lighter"; thêm mưa tia nghiêng 60° (WIND). Canvas 2D, không tự RAF.
import { state } from "../../core/state";

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry32(0x5eed12);
const NS = 128, NM = NS - 1;

/** trường vô hướng tileable → curl, tính một lần (makeCurlField gốc, lưới 128 thay vì 256) */
function makeCurlField(seed: number) {
  const r = mulberry32(seed);
  const a = new Float32Array(NS * NS), b = new Float32Array(NS * NS);
  for (let i = 0; i < NS * NS; i++) a[i] = r();
  const R = 4;
  for (let p = 0; p < 3; p++) {
    for (let y = 0; y < NS; y++) { const o = y * NS; for (let x = 0; x < NS; x++) { let s = 0; for (let k = -R; k <= R; k++) s += a[o + ((x + k) & NM)]; b[o + x] = s / (2 * R + 1); } }
    for (let x = 0; x < NS; x++) for (let y = 0; y < NS; y++) { let s = 0; for (let k = -R; k <= R; k++) s += b[(((y + k) & NM) * NS) + x]; a[y * NS + x] = s / (2 * R + 1); }
  }
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < NS * NS; i++) { if (a[i] < mn) mn = a[i]; if (a[i] > mx) mx = a[i]; }
  const sc = 2 / (mx - mn);
  for (let i = 0; i < NS * NS; i++) a[i] = (a[i] - mn) * sc - 1;
  const cx = new Float32Array(NS * NS), cy = new Float32Array(NS * NS);
  let vmax = 0;
  for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
    const dy = a[(((y + 2) & NM) * NS) + x] - a[(((y - 2 + NS) & NM) * NS) + x];
    const dx = a[y * NS + ((x + 2) & NM)] - a[y * NS + ((x - 2 + NS) & NM)];
    const i = y * NS + x; cx[i] = dy; cy[i] = -dx;
    vmax = Math.max(vmax, Math.abs(dy) + Math.abs(dx));
  }
  const inv = 1.9 / vmax;
  for (let i = 0; i < NS * NS; i++) { cx[i] *= inv; cy[i] *= inv; }
  return { cx, cy };
}
type Field = ReturnType<typeof makeCurlField>;
let F1: Field | null = null, F2: Field | null = null;
const _cv = [0, 0];
function curlSample(F: Field, x: number, y: number, out: number[]) {
  x *= NS; y *= NS;
  let x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  x0 &= NM; y0 &= NM;
  const x1 = (x0 + 1) & NM, y1 = (y0 + 1) & NM;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const i00 = y0 * NS + x0, i01 = y0 * NS + x1, i10 = y1 * NS + x0, i11 = y1 * NS + x1;
  const ax = F.cx[i00] + (F.cx[i01] - F.cx[i00]) * u, bx = F.cx[i10] + (F.cx[i11] - F.cx[i10]) * u;
  const ay = F.cy[i00] + (F.cy[i01] - F.cy[i00]) * u, by = F.cy[i10] + (F.cy[i11] - F.cy[i10]) * u;
  out[0] = ax + (bx - ax) * v; out[1] = ay + (by - ay) * v;
}

const LEVELS = [0.19, 0.31, 0.47, 0.68, 0.97];
const levelOf = (a: number) => (a < 0.26 ? 0 : a < 0.39 ? 1 : a < 0.57 ? 2 : a < 0.82 ? 3 : 4);
const WANG = (60 * Math.PI) / 180, WX = Math.cos(WANG), WY = Math.sin(WANG);

export function createSparkBadge(canvas: HTMLCanvasElement, count = state.mobile ? 420 : 760) {
  const ctx = canvas.getContext("2d")!;
  F1 ??= makeCurlField(0x1234);
  F2 ??= makeCurlField(0x9abc);
  const cur = [0, 0];
  let W = 1, H = 1, dpr = 1, CT = 0, color = "#1fd17a", colorAge = 99;
  // emitter trên biên pill (toạ độ px CSS) + pháp tuyến hướng ra ngoài
  let ex = new Float32Array(0), ey = new Float32Array(0), enx = new Float32Array(0), eny = new Float32Array(0);
  const N = count;
  const x = new Float32Array(N), y = new Float32Array(N), nx = new Float32Array(N), ny = new Float32Array(N);
  const rx = new Float32Array(N), ry = new Float32Array(N), spd = new Float32Array(N), len = new Float32Array(N);
  const br = new Float32Array(N), life = new Float32Array(N), max = new Float32Array(N), seed = new Float32Array(N);
  const RN = 28;
  const rxs = new Float32Array(RN), rys = new Float32Array(RN), rl = new Float32Array(RN), rv = new Float32Array(RN), rb = new Float32Array(RN);
  const paths: Path2D[] = new Array(LEVELS.length);

  const curlAt = (px: number, py: number) => {
    const s = 1 / Math.max(W, 1);
    curlSample(F1!, px * s * 1.3 + CT * 0.011, py * s * 1.3 - CT * 0.019, _cv);
    const ox = _cv[0], oy = _cv[1];
    curlSample(F2!, px * s * 3.05 - CT * 0.026, py * s * 3.05 + CT * 0.015, _cv);
    cur[0] = ox + _cv[0] * 0.45; cur[1] = oy + _cv[1] * 0.45;
  };

  const buildEmitters = () => {
    const mw = Math.max(8, Math.round(W)), mh = Math.max(8, Math.round(H));
    const m = document.createElement("canvas"); m.width = mw; m.height = mh;
    const g = m.getContext("2d", { willReadFrequently: true })!;
    const pw = Math.min(mw - 24, 210), ph = Math.min(mh - 20, 36);
    const x0 = (mw - pw) / 2, y0 = (mh - ph) / 2;
    g.strokeStyle = "#fff"; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x0, y0, pw, ph, ph / 2); g.stroke();
    // sao 4 cánh nhỏ bên trái nhãn
    const sx = x0 + ph * 0.62, sy = mh / 2, r = ph * 0.26;
    g.fillStyle = "#fff"; g.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, rr = k % 2 ? r * 0.3 : r; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
    g.closePath(); g.fill();
    const d = g.getImageData(0, 0, mw, mh).data;
    const a = new Float32Array(mw * mh);
    for (let i = 0; i < mw * mh; i++) a[i] = d[i * 4 + 3] / 255;
    const X: number[] = [], Y: number[] = [], NX: number[] = [], NY: number[] = [];
    for (let yy = 1; yy < mh - 1; yy++) for (let xx = 1; xx < mw - 1; xx++) {
      const i = yy * mw + xx;
      const gx = a[i + 1] - a[i - 1], gy = a[i + mw] - a[i - mw];
      const mg = Math.hypot(gx, gy);
      if (mg < 0.2) continue;
      X.push(xx); Y.push(yy); NX.push(-gx / mg); NY.push(-gy / mg);
    }
    ex = Float32Array.from(X); ey = Float32Array.from(Y); enx = Float32Array.from(NX); eny = Float32Array.from(NY);
  };

  const spawn = (i: number, seeded: boolean) => {
    if (!ex.length) return;
    const e = (rnd() * ex.length) | 0;
    x[i] = ex[e] + (rnd() - 0.5) * 0.8; y[i] = ey[e] + (rnd() - 0.5) * 0.8;
    const pin = rnd() < 0.55 ? 0.85 : 0.1;                // tàn bám viền (nét sáng) hoặc bay tự do (lông lửa)
    const sp = rnd() < 0.58 + pin * 0.38 ? (rnd() < 0.5 ? -1 : 1) * (1.44 + (rnd() - 0.5) * 0.42 * (1 - pin * 0.7)) : (rnd() - 0.5) * 1.15;
    const cs = Math.cos(sp), sn = Math.sin(sp);
    rx[i] = enx[e] * cs - eny[e] * sn; ry[i] = enx[e] * sn + eny[e] * cs;
    nx[i] = rx[i]; ny[i] = ry[i];
    spd[i] = W * (0.01 + Math.pow(rnd(), 1.8) * 0.09) * (1 - pin * 0.9);
    len[i] = 1.2 + Math.pow(rnd(), 2.3) * 5.5;
    br[i] = 0.74 + rnd() * 0.94;
    max[i] = (0.17 + rnd() * 0.74) * (1 - pin * 0.55);
    seed[i] = rnd() * 1000;
    life[i] = seeded ? rnd() * max[i] : max[i];
  };
  const spawnRain = (i: number, seeded: boolean) => {
    rl[i] = 8 + Math.pow(rnd(), 1.45) * 26;
    rv[i] = H * (1.1 + rnd() * 1.2);
    rb[i] = 0.25 + Math.pow(rnd(), 1.3) * 0.8;
    const skew = (WX / WY) * (H + rl[i]);
    rxs[i] = seeded ? rnd() * W : -skew + rnd() * (W + skew);
    rys[i] = seeded ? rnd() * H : -rl[i] * WY - rnd() * 10;
  };

  const resize = (w = canvas.clientWidth, h = canvas.clientHeight) => {
    dpr = Math.min(devicePixelRatio || 1, 2) * state.quality;
    W = Math.max(1, w); H = Math.max(1, h);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    buildEmitters();
    for (let i = 0; i < N; i++) spawn(i, true);
    for (let i = 0; i < RN; i++) spawnRain(i, true);
  };
  resize();

  const lit = (s: number, k: number) => { const v = Math.sin((s + k * 1.7) * 127.1) * 43758.5453; return v - Math.floor(v) > 0.28; };

  return {
    resize,
    render(dt: number) {
      const d = Math.min(dt, 1 / 20) * (state.reduced ? 0.25 : 1);
      CT += d;
      if ((colorAge += d) > 1) { colorAge = 0; color = getComputedStyle(canvas).getPropertyValue("--accent").trim() || color; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (let l = 0; l < LEVELS.length; l++) paths[l] = new Path2D();

      // tàn lửa: bước mô phỏng (stepFur gốc) rồi vẽ nét ngắn theo hướng chuyển động (strand gốc)
      for (let i = 0; i < N; i++) {
        life[i] -= d;
        if (life[i] <= 0) { spawn(i, false); continue; }
        const age = 1 - life[i] / max[i];
        curlAt(x[i], y[i]);
        const c = 0.34 + age * 1.25;
        let dx = rx[i] * Math.pow(1 - age, 1.5) * 1.3 + WX * 0.25 + cur[0] * c;
        let dy = ry[i] * Math.pow(1 - age, 1.5) * 1.3 + WY * 0.25 + cur[1] * c;
        const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
        x[i] += dx * spd[i] * d; y[i] += dy * spd[i] * d;
        nx[i] = dx; ny[i] = dy;
        const env = Math.min(1, age * 9) * Math.min(1, (1 - age) * 3.4);
        const a = br[i] * env;
        if (a <= 0.15 || !lit(seed[i], 0)) continue;
        const p = paths[levelOf(a)];
        p.moveTo(x[i], y[i]); p.lineTo(x[i] + nx[i] * len[i], y[i] + ny[i] * len[i]);
      }
      // mưa tia: rơi xuyên khung, đuôi kéo ngược chiều gió
      for (let i = 0; i < RN; i++) {
        rxs[i] += WX * rv[i] * d; rys[i] += WY * rv[i] * d;
        if (rys[i] - rl[i] * WY > H || rxs[i] - rl[i] * WX > W) spawnRain(i, false);
        const p = paths[levelOf(rb[i])];
        p.moveTo(rxs[i], rys[i]); p.lineTo(rxs[i] - WX * rl[i], rys[i] - WY * rl[i]);
      }
      ctx.globalCompositeOperation = "lighter";           // tàn dày cháy thành trắng
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.lineCap = "butt";
      for (let l = 0; l < LEVELS.length; l++) { ctx.globalAlpha = LEVELS[l]; ctx.stroke(paths[l]); }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
    dispose() { /* 2D */ },
  };
}
