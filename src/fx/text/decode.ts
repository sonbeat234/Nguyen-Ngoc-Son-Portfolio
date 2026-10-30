// Scramble decode khi vào viewport. Thuật toán gốc: vendor/articleHeadingDecode.ts (pool ký tự,
// reveal theo easeOut, cửa sổ scramble, đuôi nhiễu tailChance). Duyệt text node nên giữ được markup lồng.
import { ARTICLE_HEADING_DECODE_POOL as POOL } from "../../vendor/articleHeadingDecode";
import { state } from "../../core/state";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);
const rnd = () => POOL[(Math.random() * POOL.length) | 0];

type Opts = { duration?: number; scramble?: number; keep?: number; tail?: number };
const originals = new WeakMap<HTMLElement, { node: Text; text: string }[]>();
const running = new WeakMap<HTMLElement, number>();

function textNodes(el: HTMLElement) {
  let list = originals.get(el);
  if (!list) {
    const out: { node: Text; text: string }[] = [];
    const walk = (n: Node) => n.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE && c.textContent?.trim()) out.push({ node: c as Text, text: c.textContent });
      else if (c.nodeType === Node.ELEMENT_NODE) walk(c);
    });
    walk(el);
    originals.set(el, out);
    list = out;
  }
  return list;
}

/** chạy decode một lần trên el. Gọi lại khi đang chạy sẽ bắt đầu lại từ đầu. */
export function decodeText(el: HTMLElement, { duration = 900, scramble = 6, keep = 0.12, tail = 0.35 }: Opts = {}) {
  const nodes = textNodes(el);
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (state.reduced) { nodes.forEach((n) => (n.node.textContent = n.text)); return; }
  const total = nodes.reduce((s, n) => s + n.text.length, 0);
  const start = performance.now();
  const frame = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    let budget = Math.floor(easeOut(p) * total);
    for (const n of nodes) {
      const len = n.text.length;
      const shown = Math.min(Math.max(budget, 0), len);
      budget -= shown;
      if (shown >= len) { n.node.textContent = n.text; continue; }
      let out = n.text.slice(0, shown);
      for (let i = shown; i < len; i++) {
        const ch = n.text[i];
        if (ch === " " || ch === "\n") { out += ch; continue; }
        const inWindow = i < shown + scramble;
        out += inWindow ? (Math.random() < keep ? ch : rnd()) : (Math.random() < tail ? rnd() : ch);
      }
      n.node.textContent = out;
    }
    if (p < 1) running.set(el, requestAnimationFrame(frame));
    else { running.delete(el); nodes.forEach((n) => (n.node.textContent = n.text)); }
  };
  running.set(el, requestAnimationFrame(frame));
}

/** đổi nội dung chữ rồi decode sang chữ mới (giá, nhãn chương trên dock…) */
export function decodeTo(el: HTMLElement, text: string, opts?: Opts) {
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  running.delete(el);
  el.textContent = text;
  originals.delete(el);
  decodeText(el, opts);
}

let io: IntersectionObserver | null = null;
/** mọi [data-decode] trong root: decode khi vào viewport; data-decode="repeat" chạy lại mỗi lần vào, "manual" để tự gọi */
export function initDecode(root: ParentNode = document) {
  io ??= new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target as HTMLElement;
    setTimeout(() => decodeText(el, { duration: Number(el.dataset.decodeDuration ?? 900) }), Number(el.dataset.decodeDelay ?? 0));
    if (el.dataset.decode !== "repeat") io!.unobserve(el);
  }), { threshold: 0.6 });
  root.querySelectorAll<HTMLElement>("[data-decode]:not([data-fx-decode])").forEach((el) => {
    el.dataset.fxDecode = "1";
    if (el.dataset.decode !== "manual") io!.observe(el);
  });
}
