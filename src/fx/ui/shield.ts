// "Shield" cho chữ nằm thẳng trên shader nền: phần tử [data-shield] đang hiện được đo ở tick "early"
// (getBoundingClientRect, đã gồm transform) và gửi cho composite của stage (tối đa 6 vùng): nền phía sau chỉ còn
// ~28% độ sáng, viền mềm — chữ đạt tương phản WCAG mà không cần panel đặc phủ màn (rẻ: 6 phép so sánh/pixel).
// Cùng ý tưởng u_textRect của shader circuit (Profile), áp cho mọi section.
import { onTick } from "../../core/loop";
import { stage } from "../../stage/instance";

const MAX = 6;

export function initShield(root: ParentNode = document) {
  const els = [...root.querySelectorAll<HTMLElement>("[data-shield]")];
  const visible = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) visible.add(e.target as HTMLElement); else visible.delete(e.target as HTMLElement);
  }));
  els.forEach((el) => io.observe(el));
  const s = stage.shields, html = document.documentElement;
  onTick(() => {
    let n = 0;
    // V5-perf: menu / overlay project phủ trang → main ẩn, khỏi đo (đọc rect ở đây ép style recalc của overlay đang
    // lật trang: trace "book-turns" ~2.5 s getBoundingClientRect)
    if (html.classList.contains("menu-open") || html.classList.contains("pv-open")) { stage.shieldN = 0; return; }
    for (const el of visible) {
      if (n >= MAX) break;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const k = n * 4;
      s[k] = r.left; s[k + 1] = r.top; s[k + 2] = r.right; s[k + 3] = r.bottom;
      n++;
    }
    stage.shieldN = n;
  }, "early");
}
