// Tile "grainient" — port các hàm lin/rad/band/glow/chrome/grainTile từ
// threeui-main/src/shaders/neuform-isolated/sources/gallery-heading.html. Vẽ một lần, xuất dataURL.
const TS = 384;                                   // độ phân giải tile (bản gốc 512; tile hiển thị ≤ 220px)

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function mkc(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

type X = CanvasRenderingContext2D;
type Stop = [number, string];

let grain: HTMLCanvasElement | null = null;
function grainTile() {
  if (grain) return grain;
  const c = mkc(160, 160), x = c.getContext("2d")!, d = x.createImageData(160, 160), r = rng(0x51f3);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 116;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return (grain = c);
}
function lin(x: X, x0: number, y0: number, x1: number, y1: number, stops: Stop[]) {
  const g = x.createLinearGradient(x0 * TS, y0 * TS, x1 * TS, y1 * TS);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function rad(x: X, cx: number, cy: number, r: number, stops: Stop[], r0 = 0) {
  const g = x.createRadialGradient(cx * TS, cy * TS, r0 * TS, cx * TS, cy * TS, r * TS);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function fill(x: X, style: string | CanvasGradient) { x.fillStyle = style; x.fillRect(0, 0, TS, TS); }
/** nét mờ mềm: vẽ ngoài canvas và chỉ giữ bóng của nó */
function band(x: X, pts: number[][], color: string, width: number, blur: number, passes = 1) {
  x.save();
  x.translate(-2 * TS, 0);
  x.shadowOffsetX = 2 * TS; x.shadowBlur = blur * TS; x.shadowColor = color;
  x.strokeStyle = color; x.lineWidth = width * TS; x.lineCap = "round"; x.lineJoin = "round";
  x.beginPath();
  x.moveTo(pts[0][0] * TS, pts[0][1] * TS);
  for (let i = 1; i < pts.length - 1; i += 2) x.quadraticCurveTo(pts[i][0] * TS, pts[i][1] * TS, pts[i + 1][0] * TS, pts[i + 1][1] * TS);
  for (let p = 0; p < passes; p++) x.stroke();
  x.restore();
}
function glow(x: X, cx: number, cy: number, r: number, color: string, mode: GlobalCompositeOperation = "lighter") {
  x.save();
  x.globalCompositeOperation = mode;
  x.fillStyle = rad(x, cx, cy, r, [[0, color], [1, "rgba(0,0,0,0)"]]);
  x.fillRect(0, 0, TS, TS);
  x.restore();
}
function spine(y0: number, amp: number, ph: number, tilt: number) {
  const p: number[][] = [];
  for (let i = 0; i < 5; i++) { const u = -0.12 + i * 0.31; p.push([u, y0 + amp * Math.sin(ph + u * 4.2) + tilt * u]); }
  return p;
}
function bandPath(x: X, y0: number, h: number, ph: number, amp: number, freq: number, tilt: number) {
  x.beginPath();
  for (let i = 0; i <= 10; i++) { const u = -0.12 + i * 0.124; x.lineTo(u * TS, (y0 + amp * Math.sin(ph + u * freq) + tilt * u) * TS); }
  for (let i = 10; i >= 0; i--) { const u = -0.12 + i * 0.124; x.lineTo(u * TS, (y0 + h + amp * 0.62 * Math.sin(ph + 1.9 + u * freq * 0.86) + tilt * u) * TS); }
  x.closePath();
}
/** tấm chrome gập: thân tối, đỉnh nóng, mép dưới óng ánh */
function chrome(x: X, y0: number, h: number, ph: number, amp: number, freq: number, tilt: number, hot: string) {
  x.save();
  bandPath(x, y0, h, ph, amp, freq, tilt); x.clip();
  const g = x.createLinearGradient(0, (y0 - 0.03) * TS, 0, (y0 + h + 0.03) * TS);
  ([[0, "rgba(8,0,2,1)"], [0.12, "rgba(58,2,6,1)"], [0.3, "rgba(146,10,8,1)"], [0.43, "rgba(220,42,16,1)"], [0.49, hot],
    [0.56, "rgba(206,28,12,1)"], [0.72, "rgba(90,4,6,1)"], [0.88, "rgba(26,0,4,1)"], [1, "rgba(5,0,2,1)"]] as Stop[]).forEach(([o, c]) => g.addColorStop(o, c));
  x.fillStyle = g; x.fillRect(0, 0, TS, TS);
  x.restore();
}
function shade(x: X, x0: number, x1: number, strength: number) {
  const g = x.createLinearGradient(x0 * TS, 0, x1 * TS, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, `rgba(0,0,0,${(strength * 0.7).toFixed(2)})`);
  g.addColorStop(1, `rgba(0,0,0,${strength.toFixed(2)})`);
  x.fillStyle = g; x.fillRect(0, 0, TS, TS);
}

/** 7 artwork chọn từ 12 của bản gốc (0, 1, 2, 4, 6, 7, 11) */
const ART: ((x: X) => void)[] = [
  (x) => { // trường tím, xuyến tối
    fill(x, rad(x, 0.5, 0.48, 0.82, [[0, "#020105"], [0.3, "#030106"], [0.37, "#1d0a48"], [0.46, "#4f2c94"], [0.54, "#38167e"], [0.66, "#22084e"], [0.86, "#0a0218"], [1, "#04010a"]]));
    glow(x, 0.3, 0.24, 0.4, "rgba(96,66,180,0.4)");
    glow(x, 0.76, 0.8, 0.3, "rgba(52,18,110,0.35)");
  },
  (x) => { // lụa trắng, magenta + cam
    fill(x, "#fbf9fb");
    band(x, spine(0.52, 0.09, 0.6, -0.18), "rgba(236,44,140,0.92)", 0.19, 0.055, 2);
    band(x, spine(0.66, 0.07, 2.2, -0.14), "rgba(255,96,26,0.9)", 0.16, 0.05, 2);
    band(x, spine(0.4, 0.06, 3.4, -0.1), "rgba(70,120,255,0.55)", 0.09, 0.05, 1);
    band(x, spine(0.58, 0.08, 1.2, -0.16), "rgba(255,255,255,0.9)", 0.05, 0.03, 2);
    glow(x, 0.22, 0.14, 0.46, "rgba(255,255,255,0.85)");
  },
  (x) => { // xanh thẳm, góc gần đen
    fill(x, lin(x, 0.98, 0, 0.06, 1, [[0, "#01020e"], [0.3, "#03082e"], [0.56, "#0820c4"], [0.76, "#1a4dff"], [0.95, "#7ea8ff"], [1, "#b6ccff"]]));
    glow(x, 0.2, 0.86, 0.3, "rgba(176,206,255,0.8)");
    glow(x, 0.06, 0.98, 0.22, "rgba(226,120,220,0.55)");
    glow(x, 0.92, 0.06, 0.44, "rgba(0,0,8,0.75)", "source-over");
  },
  (x) => { // navy dâng lên tím-xanh
    fill(x, lin(x, 0.88, 0.04, 0.14, 0.96, [[0, "#010103"], [0.34, "#030316"], [0.58, "#0d066a"], [0.78, "#2a10b8"], [0.93, "#5a38e0"], [1, "#8464f4"]]));
    glow(x, 0.14, 0.92, 0.3, "rgba(110,86,210,0.55)");
    glow(x, 0.9, 0.08, 0.42, "rgba(0,0,4,0.75)", "source-over");
  },
  (x) => { // lụa nhạt, oải hương + hổ phách
    fill(x, "#e3dcec");
    band(x, spine(0.42, 0.1, 2.6, 0.16), "rgba(132,58,220,0.9)", 0.18, 0.055, 2);
    band(x, spine(0.6, 0.09, 1.1, 0.2), "rgba(240,104,20,0.92)", 0.16, 0.05, 2);
    band(x, spine(0.5, 0.09, 2.0, 0.18), "rgba(245,40,140,0.65)", 0.1, 0.045, 1);
    band(x, spine(0.55, 0.09, 1.6, 0.18), "rgba(255,255,255,0.8)", 0.04, 0.03, 2);
    glow(x, 0.82, 0.94, 0.36, "rgba(255,255,255,0.7)");
  },
  (x) => { // góc hổ phách, nếp chrome đỏ viền cyan
    fill(x, "#12030a");
    glow(x, 0.02, 0.04, 0.42, "rgba(255,142,36,0.85)");
    glow(x, 0.5, 0.5, 0.62, "rgba(178,26,14,0.8)");
    chrome(x, 0.18, 0.58, 1.1, 0.07, 4.2, -0.1, "rgba(255,216,158,1)");
    shade(x, 0.55, 1.2, 0.45);
    glow(x, 0.94, 0.94, 0.3, "rgba(60,14,96,0.45)");
  },
  (x) => { // tấm nhạt rọi vệt sáng hồng
    fill(x, "#08050a");
    for (let i = 0; i < 9; i++) {
      const y0 = 0.06 + i * 0.045, a = 0.8 - i * 0.06;
      band(x, spine(y0, 0.02, 0.4 + i * 0.5, -0.2), `rgba(${250 - i * 3},${30 + i * 15},${80 + i * 5},${a.toFixed(2)})`, 0.032, 0.018, 2);
    }
    band(x, spine(0.28, 0.02, 1.2, -0.18), "rgba(255,120,72,0.55)", 0.05, 0.035, 1);
    x.save();
    x.beginPath(); x.moveTo(0, TS * 0.72); x.lineTo(TS, TS * 0.4); x.lineTo(TS, TS); x.lineTo(0, TS); x.closePath();
    x.clip();
    fill(x, lin(x, 0.1, 0.4, 0.6, 1, [[0, "#c6c7cd"], [0.5, "#e2e2e6"], [1, "#f2f2f4"]]));
    x.restore();
  },
];

/** vẽ 7 tile (gradient + grain overlay 15%), trả về dataURL JPEG */
export function grainientTiles(): string[] {
  const pattern = grainTile();
  return ART.map((draw) => {
    const c = mkc(TS, TS), x = c.getContext("2d")!;
    draw(x);
    x.save();
    x.globalCompositeOperation = "overlay";
    x.globalAlpha = 0.15;
    x.fillStyle = x.createPattern(pattern, "repeat")!;
    x.fillRect(0, 0, TS, TS);
    x.restore();
    return c.toDataURL("image/jpeg", 0.88);
  });
}
