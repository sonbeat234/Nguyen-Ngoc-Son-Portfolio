// Con trỏ: con trỏ HỆ THỐNG (OS vẽ → không trễ dù shader làm tụt fps) với hình chuẩn quen thuộc:
// mũi tên (hotspot ở đầu mũi), bàn tay trên link/nút/card bấm được (hotspot ở đầu ngón trỏ),
// I-beam trên ô nhập liệu. Ruột tô màu accent của section, viền tối 1.5px để rõ trên mọi nền.
// Đổi section: accent tween ~1.2s → SVG cập nhật theo nấc ~100 ms (onAccent), không mỗi frame.
// Máy cảm ứng: không đổi gì (con trỏ mặc định). Fallback luôn là auto / pointer / text.
import { state } from "../../core/state";
import { onAccent, chapters } from "./accent";
import { token } from "../../stage/palette";

const EDGE = "rgb(0 0 0 / .85)";
const SIZE = 24;

// hình vẽ trong hộp 24 × 24 (đơn vị = px CSS), nét gọn kiểu macOS / Windows
const ARROW = "M5.5 2.5 L5.5 19.6 L9.6 15.9 L12.4 21.9 L15.2 20.6 L12.5 14.7 L18.2 14.7 Z";
const HAND =
  "M8.2 3.5 A1.7 1.7 0 0 1 11.6 3.5 V9.6 A1.5 1.5 0 0 1 14.6 10.2 V10.6 A1.4 1.4 0 0 1 17.4 11.1 V1" +
  "1.6 A1.3 1.3 0 0 1 20 12.3 V16.8 C20 19.9 17.7 22.3 14.6 22.3 H13 C11.2 22.3 9.8 21.5 8.8 20.2 L4.9 15.2 A1.5 1.5 0 0 1 7.1 13.2 L8.2 14.5 Z";
const HAND_GAPS = "M11.6 9.8v3.6M14.6 10.6v3.2M17.4 11.4v2.6";
const IBEAM = "M8.5 3.5C10.5 3.5 12 4.2 12 5.5V18.5C12 19.8 10.5 20.5 8.5 20.5M15.5 3.5C13.5 3.5 12 4.2 12 5.5M15.5 20.5C13.5 20.5 12 19.8 12 18.5";

function svgUrl(body: string, hx: number, hy: number) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${SIZE}' height='${SIZE}' viewBox='0 0 24 24'>${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}`;
}

/** V5-perf: ghi --cur-* lên MỘT phần tử (section / overlay / html) — không đổi trên :root khi đổi chương */
function setCursorColor(color: string, target: HTMLElement = document.documentElement) {
  const root = target.style;
  const fill = `fill='${color}' stroke='${EDGE}' stroke-width='1.5' stroke-linejoin='round'`;
  root.setProperty("--cur-arrow", svgUrl(`<path d='${ARROW}' ${fill}/>`, 5, 2));
  root.setProperty("--cur-hand", svgUrl(
    `<path d='${HAND}' ${fill}/><path d='${HAND_GAPS}' fill='none' stroke='${EDGE}' stroke-width='.9' stroke-linecap='round'/>`, 10, 2));
  // I-beam: hai lớp nét (viền tối dày, lõi màu mảnh) vì không có diện tích tô
  root.setProperty("--cur-text", svgUrl(
    `<path d='${IBEAM}' fill='none' stroke='${EDGE}' stroke-width='3.2' stroke-linecap='round'/>` +
    `<path d='${IBEAM}' fill='none' stroke='${color}' stroke-width='1.4' stroke-linecap='round'/>`, 12, 12));
}

export function initCursor() {
  if (state.touch) return;
  setCursorColor(token("--primary"));
  document.documentElement.classList.add("has-cursor");
  if (state.legacyfx) { onAccent((c) => setCursorColor(c)); return; }
  // V5-perf: con trỏ mỗi section mang màu accent TĨNH của section đó (base.css: section.chapter khai báo lại cursor
  // để var(--cur-*) được giải theo section) → đổi chương không ghi gì lên :root (ghi :root = restyle cả trang)
  for (const c of chapters) setCursorColor(c.accent, c.el);
  const pj = chapters.find((c) => c.id === "projects"), pv = document.getElementById("project-view");
  if (pj && pv) setCursorColor(pj.accent, pv);
}
