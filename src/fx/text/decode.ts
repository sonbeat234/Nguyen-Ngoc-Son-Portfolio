// Scramble decode khi vào viewport. Thuật toán gốc: vendor/articleHeadingDecode.ts (pool ký tự,
// reveal theo easeOut, cửa sổ scramble, giữ ký tự gốc theo preserveChance, đuôi nhiễu tailChance).
// Duyệt text node nên giữ được markup lồng.
// V4: mọi decode chạy trong MỘT tick chung (core/loop → gsap.ticker), không còn requestAnimationFrame riêng cho từng phần
// tử; thêm decodeGroup() = kiểu Article Headings (cả nhóm tiêu đề decode lần lượt theo stagger).
import { ARTICLE_HEADING_DECODE_POOL as POOL } from "../../vendor/articleHeadingDecode";
import { state } from "../../core/state";
import { onTick } from "../../core/loop";
import { graphemes } from "../../core/text";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);
const rnd = () => POOL[(Math.random() * POOL.length) | 0];
/** V5-perf (j): glyph ngẫu nhiên chỉ đổi theo bước thời gian — tiến độ hiện chữ vẫn tính mỗi frame */
const SWAP_MS = 40;

// V5-vi (F): tách theo GRAPHEME (core/text: Intl.Segmenter trên chuỗi NFC) — một ô decode giữ trọn "ễ"/"ợ"…, kể cả
// khi văn bản dán vào là NFD (e + dấu tổ hợp); index UTF-16 cũ có thể tách chữ cái và dấu ra hai ô.

type Opts = { duration?: number; scramble?: number; keep?: number; tail?: number; delay?: number };
type TextRun = { node: Text; text: string; g: string[]; last: string };
type Job = {
  nodes: TextRun[]; total: number; start: number; duration: number; scramble: number; keep: number; tail: number;
  step: number; rand: string[][]; keepM: Uint8Array[]; tailM: Uint8Array[]; el: HTMLElement; locked: boolean;
};
const originals = new WeakMap<HTMLElement, TextRun[]>();
const jobs = new Map<HTMLElement, Job>();
let off: (() => void) | null = null;

function textNodes(el: HTMLElement) {
  let list = originals.get(el);
  if (!list) {
    const out: TextRun[] = [];
    const walk = (n: Node) => n.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE && c.textContent?.trim()) {
        const text = c.textContent.normalize("NFC");
        out.push({ node: c as Text, text, g: graphemes(text), last: c.textContent });
      } else if (c.nodeType === Node.ELEMENT_NODE && !(c as HTMLElement).classList.contains("sr-only")) walk(c);
    });
    walk(el);
    originals.set(el, out);
    list = out;
  }
  return list;
}

const write = (n: TextRun, s: string) => { if (n.last !== s) { n.node.textContent = s; n.last = s; } };

/** khoá kích thước khi decode: glyph nhiễu rộng/hẹp khác chữ thật → không đẩy phần tử bên cạnh (V5-perf k) */
function lock(j: Job) {
  const el = j.el;
  const d = getComputedStyle(el).display;
  if (d === "inline" || d === "contents" || d === "none") return;
  const r = el.getBoundingClientRect();
  if (r.width < 1) return;
  el.style.width = `${r.width}px`; el.style.height = `${r.height}px`;
  el.classList.add("is-decoding");
  j.locked = true;
}
function unlock(j: Job) {
  if (!j.locked) return;
  j.el.style.width = ""; j.el.style.height = "";
  j.el.classList.remove("is-decoding");
  j.locked = false;
}

/** vẽ một khung của job; true khi đã xong */
function frame(j: Job, now: number) {
  if (now < j.start) return false;
  const p = Math.min(1, (now - j.start) / j.duration);
  // bước đổi glyph: tạo lại bộ ký tự nhiễu + quyết định giữ/đuôi một lần mỗi SWAP_MS (không mỗi frame)
  const step = Math.floor((now - j.start) / SWAP_MS);
  if (step !== j.step) {
    j.step = step;
    j.nodes.forEach((n, k) => {
      const len = n.g.length, r = j.rand[k], km = j.keepM[k], tm = j.tailM[k];
      for (let i = 0; i < len; i++) { r[i] = rnd(); km[i] = Math.random() < j.keep ? 1 : 0; tm[i] = Math.random() < j.tail ? 1 : 0; }
    });
  }
  let budget = Math.floor(easeOut(p) * j.total);
  j.nodes.forEach((n, k) => {
    const g = n.g, len = g.length;
    const shown = Math.min(Math.max(budget, 0), len);
    budget -= shown;
    if (shown >= len) { write(n, n.text); return; }
    let out = "";
    for (let i = 0; i < shown; i++) out += g[i];
    const r = j.rand[k], km = j.keepM[k], tm = j.tailM[k];
    for (let i = shown; i < len; i++) {
      const ch = g[i];
      if (ch === " " || ch === "\n") { out += ch; continue; }
      const inWindow = i < shown + j.scramble;
      out += inWindow ? (km[i] ? ch : r[i]) : (tm[i] ? r[i] : ch);
    }
    write(n, out);
  });
  if (p < 1) return false;
  j.nodes.forEach((n) => write(n, n.text));
  unlock(j);
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
  const prev = jobs.get(el);
  if (prev) unlock(prev);
  if (state.reduced) { jobs.delete(el); nodes.forEach((n) => write(n, n.text)); return; }
  const total = nodes.reduce((s, n) => s + n.g.length, 0);
  const job: Job = {
    nodes, total, start: performance.now() + delay, duration, scramble, keep, tail, step: -1, el, locked: false,
    rand: nodes.map((n) => new Array<string>(n.g.length).fill("")),
    keepM: nodes.map((n) => new Uint8Array(n.g.length)), tailM: nodes.map((n) => new Uint8Array(n.g.length)),
  };
  lock(job);
  jobs.set(el, job);
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
  const prev = jobs.get(el);
  if (prev) unlock(prev);            // nhả khoá kích thước của chữ cũ trước khi đo chữ mới
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
