// Viewer dạng sóng (kiểu GTKWave) cho Stage 04: mô phỏng bộ đếm 4 bit ở Stage 03.
// clk, rst_n, en, q[3:0] tính trước cho 64 chu kỳ (lặp liền mạch vì có reset ở chu kỳ 0–1),
// cuộn sang trái liên tục; con trỏ thời gian bám chuột khi rê trên canvas, đọc giá trị q tại con trỏ.
import { state } from "../core/state";

const CYCLES = 64;
const HEX = "0123456789ABCDEF";
const CURSOR = [...HEX].map((c) => `q=${c}`);
const NAMES = ["clk", "rst_n", "en", "q[3:0]"];
const DASH = [3, 3], SOLID: number[] = [];

export function createWaveform(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const rst = new Uint8Array(CYCLES), en = new Uint8Array(CYCLES), q = new Uint8Array(CYCLES);
  let count = 0;
  for (let n = 0; n < CYCLES; n++) {
    rst[n] = n < 2 ? 0 : 1;
    en[n] = n >= 3 && (n * 7) % 11 < 8 ? 1 : 0;
    // q đổi ở sườn lên: giá trị trong chu kỳ n là kết quả của sườn đầu chu kỳ
    if (!rst[n]) count = 0; else if (n > 0 && en[n - 1]) count = (count + 1) & 15;
    q[n] = count;
  }

  let w = 1, h = 1, dpr = 1, offset = 0;
  let hover = false, hx = 0;
  const label = 64;                         // cột tên tín hiệu
  canvas.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); hx = e.clientX - r.left; hover = true; });
  canvas.addEventListener("pointerleave", () => (hover = false));

  const css = getComputedStyle(canvas);
  const ink = css.getPropertyValue("--wave-ink").trim() || "#e9edf2";
  const mute = css.getPropertyValue("--wave-mute").trim() || "rgba(233,237,242,.4)";
  const cA = css.getPropertyValue("--wave-a").trim() || "#a08cff";
  const cB = css.getPropertyValue("--wave-b").trim() || "#6ef0b4";
  const cC = css.getPropertyValue("--wave-c").trim() || "#f2c86b";

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2) * state.quality;
    w = Math.max(1, canvas.clientWidth);
    h = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  resize();

  const cycleAt = (x: number, cw: number) => (((Math.floor((x - label + offset) / cw)) % CYCLES) + CYCLES) % CYCLES;

  function digital(y0: number, y1: number, cw: number, bits: Uint8Array | null) {
    ctx.beginPath();
    let prev = -1;
    for (let x = label - (offset % cw); x < w + cw; x += cw) {
      if (!bits) {
        ctx.moveTo(x, y1); ctx.lineTo(x, y0); ctx.lineTo(x + cw / 2, y0); ctx.lineTo(x + cw / 2, y1); ctx.lineTo(x + cw, y1);
        continue;
      }
      const v = bits[cycleAt(x + 1, cw)];
      const y = v ? y0 : y1;
      if (prev < 0) ctx.moveTo(x, y); else if (v !== prev) ctx.lineTo(x, y);
      ctx.lineTo(x + cw, y);
      prev = v;
    }
    ctx.stroke();
  }

  function render(dt: number) {
    const lanes = NAMES.length;
    const laneH = h / lanes;
    const cw = Math.max(26, w / 14);
    offset += dt * cw * (state.reduced ? 0.4 : 1.6) * (1 + Math.abs(state.scroll.smooth) * 3);
    if (offset > cw * CYCLES) offset -= cw * CYCLES;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // lưới chu kỳ + cột tên
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = label - (offset % cw); x < w; x += cw) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
    ctx.stroke();
    ctx.font = "500 11px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.fillStyle = mute;
    for (let i = 0; i < lanes; i++) ctx.fillText(NAMES[i], 8, laneH * (i + 0.5));

    ctx.save();
    ctx.beginPath(); ctx.rect(label, 0, w - label, h); ctx.clip();
    ctx.lineWidth = 1.5;
    const pad = laneH * 0.28;
    ctx.strokeStyle = cA; digital(pad, laneH - pad, cw, null);
    ctx.strokeStyle = cC; digital(laneH + pad, laneH * 2 - pad, cw, rst);
    ctx.strokeStyle = cB; digital(laneH * 2 + pad, laneH * 3 - pad, cw, en);

    // bus q: hình lục giác ở mỗi lần đổi giá trị, ghi hex khi đủ rộng
    const y0 = laneH * 3 + pad, y1 = laneH * 4 - pad, ym = (y0 + y1) / 2, s = 4;
    ctx.strokeStyle = ink; ctx.fillStyle = ink;
    ctx.beginPath();
    let segStart = label - (offset % cw) - cw, segVal = -1;
    for (let x = segStart; x < w + cw * 2; x += cw) {
      const v = q[cycleAt(x + 1, cw)];
      if (v === segVal) continue;
      if (segVal >= 0) {
        ctx.moveTo(segStart + s, y0); ctx.lineTo(x - s, y0); ctx.lineTo(x, ym); ctx.lineTo(x - s, y1); ctx.lineTo(segStart + s, y1); ctx.lineTo(segStart, ym); ctx.closePath();
        if (x - segStart > 22) ctx.fillText(HEX[segVal], (segStart + x) / 2 - 3, ym + 0.5);
      }
      segStart = x; segVal = v;
    }
    ctx.stroke();
    ctx.restore();

    // con trỏ thời gian + giá trị q tại con trỏ
    const cx = hover && hx > label ? hx : label + (w - label) * 0.68;
    ctx.strokeStyle = cC; ctx.lineWidth = 1;
    ctx.setLineDash(DASH);
    ctx.beginPath(); ctx.moveTo(Math.round(cx) + 0.5, 0); ctx.lineTo(Math.round(cx) + 0.5, h); ctx.stroke();
    ctx.setLineDash(SOLID);
    ctx.fillStyle = cC;
    ctx.fillText(CURSOR[q[cycleAt(cx, cw)]], Math.min(cx + 6, w - 34), laneH * 3.12);
  }

  return { render, resize };
}
