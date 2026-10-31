// Scramble decode khi vào viewport. Thuật toán gốc: vendor/articleHeadingDecode.ts (pool ký tự,
// reveal theo easeOut, cửa sổ scramble, giữ ký tự gốc theo preserveChance, đuôi nhiễu tailChance).
// Duyệt text node nên giữ được markup lồng.
// V4: mọi decode chạy trong MỘT tick chung (core/loop → gsap.ticker), không còn requestAnimationFrame riêng cho từng phần
// tử; thêm decodeGroup() = kiểu Article Headings (cả nhóm tiêu đề decode lần lượt theo stagger).
import { ARTICLE_HEADING_DECODE_POOL as POOL } from "../../vendor/articleHeadingDecode";
import { state } from "../../core/state";
import { onTick } from "../../core/loop";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);
const rnd = () => POOL[(Math.random() * POOL.length) | 0];

type Opts = { duration?: number; scramble?: number; keep?: number; tail?: number; delay?: number };
type TextRun = { node: Text; text: string };
type Job = { nodes: TextRun[]; total: number; start: number; duration: number; scramble: number; keep: number; tail: number };
const originals = new WeakMap<HTMLElement, TextRun[]>();
const jobs = new Map<HTMLElement, Job>();
let off: (() => void) | null = null;

function textNodes(el: HTMLElement) {
  let list = originals.get(el);
  if (!list) {
    const out: TextRun[] = [];
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

/** vẽ một khung của job; true khi đã xong */
function frame(j: Job, now: number) {
  if (now < j.start) return false;
  const p = Math.min(1, (now - j.start) / j.duration);
  let budget = Math.floor(easeOut(p) * j.total);
  for (const n of j.nodes) {
    const len = n.text.length;
    const shown = Math.min(Math.max(budget, 0), len);
    budget -= shown;
    if (shown >= len) { if (n.node.textContent !== n.text) n.node.textContent = n.text; continue; }
    let out = n.text.slice(0, shown);
    for (let i = shown; i < len; i++) {
      const ch = n.text[i];
      if (ch === " " || ch === "\n") { out += ch; continue; }
      const inWindow = i < shown + j.scramble;
      out += inWindow ? (Math.random() < j.keep ? ch : rnd()) : (Math.random() < j.tail ? rnd() : ch);
    }
    n.node.textContent = out;
  }
  if (p < 1) return false;
  j.nodes.forEach((n) => (n.node.textContent = n.text));
  return true;
}

function tick() {
  const now = performance.now();
  for (const [el, j] of jobs) if (frame(j, now)) jobs.delete(el);
  if (!jobs.size && off) { off(); off = null; }
}

/** chạy decode một lần trên el. Gọi lại khi đang chạy sẽ bắt đầu lại từ đầu. */
export function decodeText(el: HTMLElement, { duration = 900, scramble = 6, keep = 0.12, tail = 0.35, delay = 0 }: Opts = {}) {
  const nodes = textNodes(el);
  if (state.reduced) { jobs.delete(el); nodes.forEach((n) => (n.node.textContent = n.text)); return; }
  const total = nodes.reduce((s, n) => s + n.text.length, 0);
  jobs.set(el, { nodes, total, start: performance.now() + delay, duration, scramble, keep, tail });
  off ??= onTick(tick);
}

/**
 * Article Headings (threeui-main/src/shaders/article-headings): cả nhóm tiêu đề decode lần lượt, mặc định
 * đúng thông số gốc — duration 560, stagger 140, scrambleLength 10, preserveChance .3, tailChance .18.
 */
export function decodeGroup(els: HTMLElement[], { duration = 560, stagger = 140, scramble = 10, keep = 0.3, tail = 0.18 }: Opts & { stagger?: number } = {}) {
  els.forEach((el, i) => decodeText(el, { duration, scramble, keep, tail, delay: i * stagger }));
}

/** đổi nội dung chữ rồi decode sang chữ mới (nhãn chương trên dock…) */
export function decodeTo(el: HTMLElement, text: string, opts?: Opts) {
  jobs.delete(el);
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
    decodeText(el, { duration: Number(el.dataset.decodeDuration ?? 900), delay: Number(el.dataset.decodeDelay ?? 0) });
    if (el.dataset.decode !== "repeat") io!.unobserve(el);
  }), { threshold: 0.6 });
  root.querySelectorAll<HTMLElement>("[data-decode]:not([data-fx-decode])").forEach((el) => {
    el.dataset.fxDecode = "1";
    if (el.dataset.decode !== "manual") io!.observe(el);
  });
}
