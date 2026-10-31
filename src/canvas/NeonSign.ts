// Port từ threeui-main/src/shaders/neuform-isolated/sources/glassblown-neon.html:
// chữ ống neon vẽ bằng path (M/L/Q/R/E theo đơn vị cap-height), bake một lần (spill, bloom, lõi 3 lớp,
// specular, đầu ống, điện cực) rồi mỗi frame chỉ ghép lại các lát đã bake.
// Mở rộng cho SIGNAL: thêm glyph I T M E H D , và khoảng trắng; nhiều dòng căn giữa; bảng màu theo dòng;
// mỗi chữ nhấp nháy độc lập (bản gốc chỉ một chữ), "bật đèn" lần lượt (ignite), giật tắt khi bị nhiễu (kick).
// Không tự RAF: gọi render(dt) từ onTick.

type Cmd = [string, ...number[]];
type Sub = { c: Cmd[]; closed?: 1 };
type Glyph = { w: number; sub: Sub[] };

const P = Math.PI;
const GLYPHS: Record<string, Glyph> = {
  // — glyph gốc (glassblown-neon.html) —
  G: { w: 0.88, sub: [{ c: [["M", 0.7946, 0.232], ["E", 0.44, 0.5, 0.42, 0.5, -0.18 * P, -1.87 * P, 1], ["Q", 0.902, 0.606, 0.86, 0.492], ["L", 0.47, 0.492]] }] },
  L: { w: 0.6, sub: [{ c: [["M", 0.09, 0.0], ["L", 0.09, 0.66], ["R", 0.09, 1.0, 0.6, 1.0, 0.2], ["L", 0.575, 1.0]] }] },
  A: { w: 0.9, sub: [{ c: [["M", 0.04, 1.0], ["R", 0.45, 0.0, 0.86, 1.0, 0.105], ["L", 0.86, 1.0]] }, { c: [["M", 0.174, 0.665], ["L", 0.726, 0.665]] }] },
  S: { w: 0.74, sub: [{ c: [["M", 0.588, 0.0478], ["E", 0.4, 0.25, 0.32, 0.25, -0.3 * P, 0.5 * P, 1], ["E", 0.4, 0.75, 0.32, 0.25, -0.5 * P, 0.86 * P, 0]] }] },
  O: { w: 0.9, sub: [{ closed: 1, c: [["M", 0.46, 0.0], ["E", 0.46, 0.5, 0.42, 0.5, -0.5 * P, 1.5 * P, 0]] }] },
  N: { w: 0.88, sub: [{ c: [["M", 0.08, 1.0], ["R", 0.08, 0.0, 0.84, 1.0, 0.075], ["R", 0.84, 1.0, 0.84, 0.0, 0.075], ["L", 0.84, 0.0]] }] },
  // — glyph mới, cùng ngôn ngữ nét —
  I: { w: 0.2, sub: [{ c: [["M", 0.1, 0.0], ["L", 0.1, 1.0]] }] },
  T: { w: 0.7, sub: [{ c: [["M", 0.03, 0.0], ["L", 0.67, 0.0]] }, { c: [["M", 0.35, 0.09], ["L", 0.35, 1.0]] }] },
  M: { w: 1.0, sub: [{ c: [["M", 0.08, 1.0], ["R", 0.08, 0.0, 0.5, 0.66, 0.075], ["R", 0.5, 0.66, 0.92, 0.0, 0.06], ["R", 0.92, 0.0, 0.92, 1.0, 0.075], ["L", 0.92, 1.0]] }] },
  E: { w: 0.66, sub: [{ c: [["M", 0.6, 0.0], ["R", 0.09, 0.0, 0.09, 1.0, 0.13], ["R", 0.09, 1.0, 0.6, 1.0, 0.13], ["L", 0.6, 1.0]] }, { c: [["M", 0.19, 0.5], ["L", 0.5, 0.5]] }] },
  H: { w: 0.82, sub: [{ c: [["M", 0.09, 0.0], ["L", 0.09, 1.0]] }, { c: [["M", 0.73, 0.0], ["L", 0.73, 1.0]] }, { c: [["M", 0.19, 0.5], ["L", 0.63, 0.5]] }] },
  D: { w: 0.84, sub: [{ closed: 1, c: [["M", 0.09, 0.0], ["L", 0.09, 1.0], ["L", 0.36, 1.0], ["E", 0.36, 0.5, 0.42, 0.5, 0.5 * P, -0.5 * P, 1], ["L", 0.09, 0.0]] }] },
  // V4 (portfolio, biển "THANKS"): K = thân dọc + hai nét chéo gặp nhau gần giữa thân
  K: { w: 0.74, sub: [{ c: [["M", 0.09, 0.0], ["L", 0.09, 1.0]] }, { c: [["M", 0.66, 0.0], ["L", 0.17, 0.58]] }, { c: [["M", 0.34, 0.4], ["L", 0.7, 1.0]] }] },
  ",": { w: 0.26, sub: [{ c: [["M", 0.14, 0.8], ["Q", 0.17, 1.02, 0.05, 1.16]] }] },
  " ": { w: 0.4, sub: [] },
};

export type NeonPalette = {
  spill: [string, string]; bloom: [string, string]; core: [string, string, string];
  glass: [string, string]; spec: string; tip: [string, string, string];
  electrode: [string, string, string]; elecEdge: string;
};

export const NEON_AMBER: NeonPalette = {
  spill: ["rgba(255,128,24,1)", "rgba(255,150,52,1)"], bloom: ["rgba(255,140,40,1)", "rgba(255,186,106,1)"],
  core: ["#ff962a", "#ffc98a", "#fff6e8"], glass: ["#3d2510", "#28180a"], spec: "rgba(255,245,228,.52)",
  tip: ["#33200f", "rgba(255,200,150,.20)", "rgba(255,225,190,.14)"],
  electrode: ["rgba(255,240,220,.95)", "rgba(255,170,80,.62)", "rgba(255,150,50,0)"], elecEdge: "rgba(214,160,110,.30)",
};
export const NEON_GREEN: NeonPalette = {
  spill: ["rgba(36,255,124,1)", "rgba(70,255,150,1)"], bloom: ["rgba(56,255,138,1)", "rgba(128,255,178,1)"],
  core: ["#2aff86", "#9dffc4", "#f2fff7"], glass: ["#123d22", "#0a2814"], spec: "rgba(230,255,240,.52)",
  tip: ["#0f3320", "rgba(150,255,200,.20)", "rgba(200,255,225,.14)"],
  electrode: ["rgba(226,255,240,.95)", "rgba(90,255,160,.62)", "rgba(50,255,140,0)"], elecEdge: "rgba(120,214,160,.30)",
};

type Item = { g: Glyph; ox: number; oy: number; s: number; pal: NeonPalette; sx0: number; sx1: number; sy0: number; sy1: number };
type Electrode = { x: number; y: number; a: number; pal: NeonPalette };

const GAP = 0.17, LINEGAP = 0.46, SPILL_S = 0.34, BLOOM_S = 0.5;

function mk(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
function emit(x: CanvasRenderingContext2D, sp: Sub, ox: number, oy: number, s: number) {
  for (const c of sp.c) {
    const k = c[0], n = c as unknown as number[];
    if (k === "M") x.moveTo(ox + n[1] * s, oy + n[2] * s);
    else if (k === "L") x.lineTo(ox + n[1] * s, oy + n[2] * s);
    else if (k === "Q") x.quadraticCurveTo(ox + n[1] * s, oy + n[2] * s, ox + n[3] * s, oy + n[4] * s);
    else if (k === "R") x.arcTo(ox + n[1] * s, oy + n[2] * s, ox + n[3] * s, oy + n[4] * s, n[5] * s);
    else if (k === "E") x.ellipse(ox + n[1] * s, oy + n[2] * s, n[3] * s, n[4] * s, 0, n[5], n[6], !!n[7]);
  }
}
function trace(x: CanvasRenderingContext2D, items: Item[]) {
  x.beginPath();
  for (const it of items) for (const sp of it.g.sub) emit(x, sp, it.ox, it.oy, it.s);
}
function endsOf(sp: Sub): [number, number][] {
  if (sp.closed) return [];
  const a = sp.c[0] as unknown as number[], last = sp.c[sp.c.length - 1] as unknown as number[];
  const k = sp.c[sp.c.length - 1][0];
  let b: [number, number] | null = null;
  if (k === "L" || k === "M") b = [last[1], last[2]];
  else if (k === "Q") b = [last[3], last[4]];
  else if (k === "E") b = [last[1] + last[3] * Math.cos(last[6]), last[2] + last[4] * Math.sin(last[6])];
  const out: [number, number][] = [[a[1], a[2]]];
  if (b) out.push(b);
  return out;
}
const scaleItems = (items: Item[], k: number): Item[] => items.map((it) => ({ ...it, ox: it.ox * k, oy: it.oy * k, s: it.s * k }));

function strokePass(x: CanvasRenderingContext2D, items: Item[], w: number, blur: number, col: string, alpha = 1, additive = true) {
  x.save();
  x.lineCap = "round"; x.lineJoin = "round";
  if (blur > 0.25) x.filter = `blur(${blur.toFixed(2)}px)`;
  if (additive) x.globalCompositeOperation = "lighter";
  x.globalAlpha = alpha;
  x.lineWidth = w; x.strokeStyle = col;
  trace(x, items); x.stroke();
  x.restore();
}
/** chạy một pass cho từng nhóm màu (bảng màu theo dòng) */
function byPalette(items: Item[], fn: (group: Item[], pal: NeonPalette) => void) {
  const groups = new Map<NeonPalette, Item[]>();
  for (const it of items) { const g = groups.get(it.pal); if (g) g.push(it); else groups.set(it.pal, [it]); }
  groups.forEach((g, pal) => fn(g, pal));
}

export type NeonConfig = {
  /** layout theo tỉ lệ khung: chọn layout đầu tiên có aspect ≥ minAspect */
  layouts: { minAspect: number; lines: string[] }[];
  palette: (line: number, lineCount: number) => NeonPalette;
  /** [dòng, chữ] của ống "lỗi" nhấp nháy thường xuyên */
  faulty?: (line: number, lineCount: number, index: number) => boolean;
  reduced?: boolean;
};

export function createNeonSign(board: HTMLElement, canvas: HTMLCanvasElement, cfg: NeonConfig) {
  const ctx = canvas.getContext("2d")!;
  let W = 0, H = 0, cap = 0, tube = 0;
  let items: Item[] = [];
  let BASE: HTMLCanvasElement | null = null, LIT: HTMLCanvasElement | null = null;
  let levels = new Float32Array(0), last = new Float32Array(0);
  let gens: { seed: number; t0: number; dur: number; segs: { d: number; v: number }[]; faulty: boolean; on: number; drop: number }[] = [];
  let clock = 0;

  function layout() {
    const aspect = W / Math.max(1, H);
    const lines = (cfg.layouts.find((l) => aspect >= l.minAspect) ?? cfg.layouts[cfg.layouts.length - 1]).lines;
    const ls = lines.map((s) => {
      const gl = [...s].map((ch) => GLYPHS[ch] ?? GLYPHS[" "]);
      return { gl, sum: gl.reduce((a, g) => a + g.w, 0) + (gl.length - 1) * GAP };
    });
    const blockW = Math.max(...ls.map((l) => l.sum));
    const blockH = ls.length + (ls.length - 1) * LINEGAP;
    cap = Math.max(10, Math.min((W * 0.94) / blockW, (H * 0.84) / blockH));
    tube = cap * 0.105;
    const y0 = (H - blockH * cap) * 0.5;
    const out: Item[] = [], elec: Electrode[] = [];
    ls.forEach((L, li) => {
      const pal = cfg.palette(li, ls.length);
      const top = y0 + li * (1 + LINEGAP) * cap;
      const sy0 = li === 0 ? 0 : top - (LINEGAP * cap) / 2;
      const sy1 = li === ls.length - 1 ? H : top + cap + (LINEGAP * cap) / 2;
      let pen = (W - L.sum * cap) / 2;
      const lineItems: Item[] = [];
      L.gl.forEach((g) => {
        lineItems.push({ g, ox: pen, oy: top, s: cap, pal, sx0: 0, sx1: 0, sy0, sy1 });
        pen += (g.w + GAP) * cap;
      });
      lineItems.forEach((it, k) => {
        const prev = lineItems[k - 1], next = lineItems[k + 1];
        it.sx0 = prev ? (prev.ox + prev.g.w * cap + it.ox) / 2 : 0;
        it.sx1 = next ? (it.ox + it.g.w * cap + next.ox) / 2 : W;
      });
      // điện cực ở đầu ống đầu tiên và cuối ống cuối cùng của dòng
      const lettered = lineItems.filter((it) => it.g.sub.length && it.g !== GLYPHS[","]);
      const first = lettered[0], lastIt = lettered[lettered.length - 1];
      if (first) {
        const e = endsOf(first.g.sub[0])[0];
        if (e) elec.push({ x: first.ox + e[0] * cap, y: first.oy + e[1] * cap, a: e[1] > 0.6 ? 2.3 : -2.2, pal });
      }
      if (lastIt) {
        const subs = lastIt.g.sub.filter((s) => !s.closed);
        const ends = subs.length ? endsOf(subs[0]) : [];
        const e = ends[ends.length - 1];
        if (e) elec.push({ x: lastIt.ox + e[0] * cap, y: lastIt.oy + e[1] * cap, a: e[1] > 0.6 ? 0.85 : -0.9, pal });
      }
      out.push(...lineItems);
    });
    return { items: out, elec, lineCount: ls.length, perLine: ls.map((l) => l.gl.length) };
  }

  function buildSpill(list: Item[]) {
    const c = mk(W * SPILL_S, H * SPILL_S), x = c.getContext("2d")!;
    const it = scaleItems(list, SPILL_S), k = cap * SPILL_S;
    byPalette(it, (g, pal) => { strokePass(x, g, k * 0.62, k * 0.3, pal.spill[0], 0.115); strokePass(x, g, k * 0.42, k * 0.11, pal.spill[1], 0.2); });
    return c;
  }
  function buildBloom(list: Item[]) {
    const c = mk(W * BLOOM_S, H * BLOOM_S), x = c.getContext("2d")!;
    const it = scaleItems(list, BLOOM_S), t = tube * BLOOM_S;
    byPalette(it, (g, pal) => { strokePass(x, g, t * 2.6, t * 1.75, pal.bloom[0], 0.3); strokePass(x, g, t * 1.34, t * 0.58, pal.bloom[1], 0.48); });
    return c;
  }
  function paintCore(x: CanvasRenderingContext2D, list: Item[]) {
    byPalette(list, (g, pal) => {
      strokePass(x, g, tube * 0.88, tube * 0.1, pal.core[0], 1);
      strokePass(x, g, tube * 0.54, tube * 0.06, pal.core[1], 1);
      strokePass(x, g, tube * 0.24, tube * 0.035, pal.core[2], 1);
    });
  }
  function buildSpec(list: Item[]) {
    const c = mk(W, H), x = c.getContext("2d")!;
    byPalette(list, (g, pal) => {
      x.save();
      x.translate(-tube * 0.02, -tube * 0.25);
      x.lineCap = "round"; x.lineJoin = "round";
      x.lineWidth = tube * 0.17; x.strokeStyle = pal.spec;
      x.filter = `blur(${(tube * 0.11).toFixed(2)}px)`;
      trace(x, g); x.stroke();
      x.restore();
    });
    x.globalCompositeOperation = "destination-in";
    x.lineCap = "round"; x.lineJoin = "round";
    x.lineWidth = tube * 0.66; x.strokeStyle = "#fff";
    trace(x, list); x.stroke();
    return c;
  }
  function tips(x: CanvasRenderingContext2D, list: Item[]) {
    x.save();
    for (const it of list) for (const sp of it.g.sub) for (const e of endsOf(sp)) {
      const px = it.ox + e[0] * it.s, py = it.oy + e[1] * it.s;
      x.beginPath(); x.arc(px, py, tube * 0.47, 0, P * 2); x.fillStyle = it.pal.tip[0]; x.fill();
      x.lineWidth = 1; x.strokeStyle = it.pal.tip[1]; x.stroke();
      x.beginPath(); x.arc(px - tube * 0.06, py - tube * 0.1, tube * 0.2, 0, P * 2); x.fillStyle = it.pal.tip[2]; x.fill();
    }
    x.restore();
  }
  function electrodes(x: CanvasRenderingContext2D, list: Electrode[]) {
    x.save();
    for (const e of list) {
      const sx = e.x + Math.cos(e.a) * tube * 1.55, sy = e.y + Math.sin(e.a) * tube * 1.55;
      x.beginPath(); x.moveTo(e.x, e.y); x.lineTo(sx, sy);
      x.lineCap = "round"; x.lineWidth = tube * 0.46; x.strokeStyle = "#120a10"; x.stroke();
      x.beginPath(); x.arc(sx, sy, tube * 0.4, 0, P * 2); x.fillStyle = "#0b0509"; x.fill();
      x.beginPath(); x.arc(e.x, e.y, tube * 0.8, 0, P * 2); x.fillStyle = "#180a12"; x.fill();
      x.lineWidth = 1.4; x.strokeStyle = e.pal.elecEdge; x.stroke();
      const g = x.createRadialGradient(e.x, e.y, 0, e.x, e.y, tube * 1.25);
      g.addColorStop(0, e.pal.electrode[0]); g.addColorStop(0.24, e.pal.electrode[1]); g.addColorStop(1, e.pal.electrode[2]);
      x.globalCompositeOperation = "lighter";
      x.beginPath(); x.arc(e.x, e.y, tube * 1.25, 0, P * 2); x.fillStyle = g; x.fill();
      x.globalCompositeOperation = "source-over";
    }
    x.restore();
  }

  /** BASE = ống thuỷ tinh tắt + đầu ống + điện cực; LIT = toàn bộ ánh sáng (ghép theo lát từng chữ) */
  function bake() {
    const L = layout();
    items = L.items;
    const base = mk(W, H), b = base.getContext("2d")!;
    byPalette(items, (g, pal) => { strokePass(b, g, tube, 0, pal.glass[0], 1, false); strokePass(b, g, tube * 0.7, 0, pal.glass[1], 1, false); });
    tips(b, items);
    electrodes(b, L.elec);
    BASE = base;

    const lit = mk(W, H), w = lit.getContext("2d")!;
    w.globalCompositeOperation = "lighter";
    w.drawImage(buildSpill(items), 0, 0, W, H);
    w.drawImage(buildBloom(items), 0, 0, W, H);
    w.globalCompositeOperation = "source-over";
    paintCore(w, items);
    w.globalCompositeOperation = "lighter";
    w.drawImage(buildSpec(items), 0, 0);
    // đầu ống tối đè lên lõi sáng giống bản gốc (destination-out ở chỗ đầu ống)
    w.globalCompositeOperation = "destination-out";
    for (const it of items) for (const sp of it.g.sub) for (const e of endsOf(sp)) {
      w.beginPath(); w.arc(it.ox + e[0] * it.s, it.oy + e[1] * it.s, tube * 0.47, 0, P * 2); w.fill();
    }
    w.globalCompositeOperation = "source-over";
    LIT = lit;

    // mỗi chữ một bộ sinh nhấp nháy (seed riêng); chữ "lỗi" nhấp nháy thường xuyên
    // (giữ trạng thái cũ khi bake lại do resize; layout đổi số dòng thì chỉ số chữ vẫn liên tục)
    let gi = 0, li = 0;
    const prev = gens;
    gens = items.map((_, i) => {
      if (gi >= L.perLine[li]) { gi = 0; li++; }
      const faulty = !!cfg.faulty?.(li, L.lineCount, gi++);
      const g = prev[i] ?? { seed: (0x1981 + i * 7919) >>> 0, t0: 0, dur: 0, segs: [], faulty, on: -1, drop: 0 };
      g.faulty = faulty;
      return g;
    });
    levels = new Float32Array(items.length);
    last = new Float32Array(items.length).fill(-1);
  }

  function rnd(g: { seed: number }) { g.seed = (g.seed * 1103515245 + 12345) >>> 0; return g.seed / 4294967296; }
  function nextEvent(g: (typeof gens)[number], after: number) {
    const segs: { d: number; v: number }[] = [];
    const n = 1 + (rnd(g) < 0.42 ? 1 : 0);
    for (let i = 0; i < n; i++) { segs.push({ d: 0.12 + rnd(g) * 0.2, v: 0.12 + rnd(g) * 0.4 }); segs.push({ d: 0.16 + rnd(g) * 0.26, v: 1 }); }
    g.segs = segs;
    g.dur = segs.reduce((s, x) => s + x.d, 0);
    g.t0 = after + (g.faulty ? 1.2 + rnd(g) * 2.4 : 5.6 + rnd(g) * 9);
  }
  function flicker(g: (typeof gens)[number], t: number) {
    if (!g.segs.length) nextEvent(g, rnd(g) * 4);
    while (t > g.t0 + g.dur) nextEvent(g, g.t0 + g.dur);
    if (t < g.t0) return 1;
    let u = t - g.t0, prev = 1;
    for (const s of g.segs) {
      if (u < s.d) { let p = u / s.d; p = p * p * (3 - 2 * p); return prev + (s.v - prev) * p; }
      u -= s.d; prev = s.v;
    }
    return 1;
  }
  /** đường bao "bật đèn": tắt → giật vài nhịp → sáng hẳn */
  const IGNITE = [0, 0.7, 0.05, 1, 0.18, 1];
  function ignition(g: (typeof gens)[number], t: number) {
    if (g.on < 0) return 1;
    const u = t - g.on;
    if (u < 0) return 0.03;
    const k = Math.floor(u / 0.07);
    return k >= IGNITE.length ? 1 : IGNITE[k];
  }

  function compose() {
    if (!BASE || !LIT) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(BASE, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < items.length; i++) {
      const f = levels[i];
      last[i] = f;
      if (f <= 0.002) continue;
      const it = items[i];
      const sw = Math.max(1, Math.round(it.sx1 - it.sx0)), sh = Math.max(1, Math.round(it.sy1 - it.sy0));
      const sx = Math.round(it.sx0), sy = Math.round(it.sy0);
      ctx.globalAlpha = f;
      ctx.drawImage(LIT, sx, sy, sw, sh, sx, sy, sw, sh);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(board.clientWidth * dpr), h = Math.round(board.clientHeight * dpr);
    if (!w || !h || (w === W && h === H)) return false;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    bake();
    update(0, true);
    return true;
  }

  function update(dt: number, force = false) {
    clock += dt;
    let changed = force;
    for (let i = 0; i < items.length; i++) {
      const g = gens[i];
      let f = cfg.reduced ? 1 : flicker(g, clock) * ignition(g, clock);
      if (g.drop > clock) f *= 0.15;
      levels[i] = f;
      if (Math.abs(f - last[i]) > 0.008) changed = true;
    }
    if (changed) compose();
  }

  resize();

  return {
    resize,
    render(dt: number) { update(Math.min(dt, 0.05)); },
    /** bật đèn lần lượt từng chữ, bắt đầu sau `delay` giây */
    ignite(delay = 0) {
      if (cfg.reduced) return;
      gens.forEach((g, i) => (g.on = clock + delay + i * 0.055 + rnd(g) * 0.12));
    },
    /** nhiễu: vài chữ tắt phụt trong chốc lát */
    kick(count = 3) {
      if (cfg.reduced || !gens.length) return;
      for (let n = 0; n < count; n++) {
        const g = gens[(Math.random() * gens.length) | 0];
        g.drop = clock + 0.05 + Math.random() * 0.18;
      }
    },
    dispose() { BASE = LIT = null; },
  };
}
