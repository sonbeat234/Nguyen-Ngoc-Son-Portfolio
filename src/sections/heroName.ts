// Tên ở hero — V5-vi (D) + V5-perf (e).
//
// Trước: SplitText tách <h1> thành span từng ký tự, KHOÁ bề rộng + text-align:center (cho sóng độ đậm) và
// will-change: transform thường trực → mất kerning hoàn toàn, glyph có dấu tràn advance (ễ, ọ, ơ) bị canh lại lệch,
// dấu mảnh mờ do raster thành layer; mỗi lần rê chuột ghi font-variation + text-shadow calc() lên MỌI ký tự (trace:
// ~2.5 s layout / 7 s).
//
// Giờ: <h1 lang="vi"> giữ dòng chữ THẬT (kerning, trình đọc màn hình, chọn chữ). Lớp phủ aria-hidden gồm từng
// grapheme đặt tuyệt đối đúng vị trí đo bằng Range.getBoundingClientRect trên dòng thật → lúc nghỉ trùng chữ thật
// (≤ 1 px/glyph), chữ thật trong suốt phía dưới. Sóng độ đậm chạy trên lớp phủ:
//  - độ đậm lượng tử bước 20 (wght), màu + quầng sáng theo k lượng tử (21 mức) → chỉ glyph đổi mức mới vẽ lại;
//  - glyph đậm lên giữ nguyên TÂM (bù nửa phần bề rộng tăng, đo trước bằng canvas) — không đẩy glyph bên cạnh;
//  - quầng sáng = ::before tĩnh (text-shadow cố định), chỉ đổi opacity;
//  - chỉ glyph đang hoạt động mới có will-change; con trỏ đứng yên + mọi glyph đã về 0 → tick không làm gì;
//  - toạ độ con trỏ so với tên đọc trong pointermove (layout đã sạch), không đọc layout trong tick.
// Hạt WebGL lấy điểm đích từ chính các vị trí này (cùng font) → hạt khớp chữ thật đã kerning.
import { onTick } from "../core/loop";
import { state } from "../core/state";
import { damp } from "../core/math";
import type { NameLine } from "../three/ParticleWordmark";
import { graphemeSpans } from "../core/text";

export type Glyph = {
  g: string; line: number; idx: number; el: HTMLSpanElement | null;
  x: number; y: number; w: number; h: number;     // hộp của grapheme trên dòng thật, px CSS so với <h1>
  wb: number; w0: number; w1: number; wmax: number; // độ đậm gốc, bề rộng ở độ đậm gốc / tối đa
  k: number; kq: number; tx: number; active: boolean;
};

const split = graphemeSpans;

const WGHT_RANGE = 380, WGHT_STEP = 20, K_LEVELS = 20;

export function createHeroName(name: HTMLElement, { overlay }: { overlay: boolean }) {
  const lines = [...name.querySelectorAll<HTMLElement>(".hero-line")];
  // chuẩn hoá NFC một lần (văn bản dán từ macOS có thể là NFD → dấu tổ hợp tách khỏi chữ)
  for (const l of lines) { const t = l.textContent ?? "", n = t.normalize("NFC"); if (n !== t) l.textContent = n; }

  const fx = overlay ? document.createElement("span") : null;
  if (fx) { fx.className = "hero-name-fx"; fx.setAttribute("aria-hidden", "true"); name.appendChild(fx); }
  const glyphs: Glyph[] = [];
  lines.forEach((ln, li) => {
    for (const { s, i } of split(ln.textContent ?? "")) {
      if (!s.trim()) continue;
      let el: HTMLSpanElement | null = null;
      if (fx) { el = document.createElement("span"); el.className = "hf"; el.textContent = s; el.dataset.g = s; fx.appendChild(el); }
      glyphs.push({ g: s, line: li, idx: i, el, x: 0, y: 0, w: 0, h: 0, wb: 300, w0: 0, w1: 0, wmax: 680, k: 0, kq: 0, tx: 0, active: false });
    }
  });

  const probe = document.createElement("canvas").getContext("2d")!;
  const range = document.createRange();
  /** đo vị trí từng grapheme trên dòng thật (gọi lúc init / resize / font đổi — không trong tick) */
  function measure() {
    const box = name.getBoundingClientRect();
    lines.forEach((ln, li) => {
      const node = ln.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const cs = getComputedStyle(ln);
      const wb = parseFloat(cs.fontWeight) || 300, wmax = Math.min(900, wb + WGHT_RANGE);
      const font = (w: number) => `${cs.fontStyle} ${w} ${cs.fontSize} ${cs.fontFamily}`;
      for (const gl of glyphs) {
        if (gl.line !== li) continue;
        range.setStart(node, gl.idx); range.setEnd(node, gl.idx + gl.g.length);
        const r = range.getBoundingClientRect();
        gl.x = r.left - box.left; gl.y = r.top - box.top; gl.w = r.width; gl.h = r.height;
        gl.wb = wb; gl.wmax = wmax;
        probe.font = font(wb); gl.w0 = probe.measureText(gl.g).width;
        probe.font = font(wmax); gl.w1 = probe.measureText(gl.g).width;
        if (gl.el) {
          const s = gl.el.style;
          s.left = `${gl.x}px`; s.top = `${gl.y}px`; s.fontWeight = String(wb);
        }
      }
    });
  }
  measure();
  if (fx) name.classList.add("has-fx");

  /** điểm đích cho hạt: từng grapheme tại đúng vị trí đã kerning, cùng font; box = hộp của canvas hạt */
  function particleLines(boxLeft: number, boxTop: number): NameLine[] {
    const nb = name.getBoundingClientRect();
    const out: NameLine[] = [];
    lines.forEach((ln, li) => {
      const cs = getComputedStyle(ln);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      probe.font = font;
      const ascent = probe.measureText("H").fontBoundingBoxAscent;
      for (const gl of glyphs) {
        if (gl.line !== li) continue;
        out.push({ text: gl.g, font, letterSpacing: "0px", x: nb.left - boxLeft + gl.x, baseline: nb.top - boxTop + gl.y + ascent });
      }
    });
    return out;
  }

  /** sóng độ đậm theo con trỏ (desktop, không reduced) */
  function wave() {
    if (!fx || state.touch || state.reduced) return;
    let mx = -1e4, my = -1e4, moving = false, visible = true;
    const radius = () => Math.max(120, (glyphs[0]?.h ?? 200) * 0.9);
    // toạ độ con trỏ so với <h1>: đọc rect trong pointermove (đầu frame, layout đã sạch) — tick không đọc layout
    addEventListener("pointermove", (e) => {
      if (!visible) return;
      const r = name.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      moving = true;
    }, { passive: true });
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(name);
    new ResizeObserver(() => measure()).observe(name);
    document.fonts.addEventListener("loadingdone", () => measure());

    onTick((_, dt) => {
      if (!visible || !moving) return;
      const R = radius();
      let busy = false;
      for (const gl of glyphs) {
        const cx = gl.x + gl.w / 2, cy = gl.y + gl.h * 0.55;
        const d = Math.hypot(mx - cx, my - cy) / R;
        const target = Math.exp(-d * d * 2.2);
        const k = damp(gl.k, target, 9, dt);
        const settled = Math.abs(k - target) < 0.002;
        if (Math.abs(k - gl.k) < 0.0015 && !(settled && target < 0.002 && gl.active)) { if (!settled) busy = true; continue; }
        gl.k = settled ? target : k;
        if (!settled) busy = true;
        const el = gl.el!, s = el.style;
        // mức lượng tử: độ đậm bước 20, màu / quầng 21 mức — chỉ đổi khi qua mức (vẽ lại glyph)
        const kq = Math.round(gl.k * K_LEVELS) / K_LEVELS;
        if (kq !== gl.kq) {
          gl.kq = kq;
          const wght = Math.min(gl.wmax, gl.wb + Math.round((kq * WGHT_RANGE) / WGHT_STEP) * WGHT_STEP);
          s.fontWeight = String(wght);
          s.setProperty("--k", kq.toFixed(2));
          const f = (wght - gl.wb) / Math.max(1, gl.wmax - gl.wb);
          gl.tx = -((gl.w1 - gl.w0) * f) / 2;      // giữ tâm glyph khi đậm lên
        }
        const on = gl.k > 0.002;
        if (on !== gl.active) { gl.active = on; s.willChange = on ? "transform" : ""; }
        s.transform = on ? `translate(${gl.tx.toFixed(2)}px, ${(-gl.k * 0.12).toFixed(3)}em) scale(${(1 + gl.k * 0.1).toFixed(3)})` : "";
      }
      if (!busy) moving = false;                    // mọi glyph đã tới đích → ngừng tới lần rê chuột sau
    });
  }

  return { glyphs, overlay: fx, measure, particleLines, wave, els: glyphs.map((g) => g.el).filter((e): e is HTMLSpanElement => !!e) };
}
