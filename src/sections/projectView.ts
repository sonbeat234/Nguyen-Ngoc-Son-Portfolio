// Overlay trang chi tiết dự án (mở từ card ở #projects).
// - Mở: GSAP Flip — card phóng thành khung toàn màn (cùng data-flip-id), các card khác lùi xa và mờ, stage nhận một
//   nhịp glitch ngắn. Đóng: Flip ngược về đúng card cũ, trả focus cho card.
// - Dialog: role="dialog" aria-modal, aria-labelledby → tiêu đề project; focus bị khoá trong overlay; Esc để đóng.
//   Khi mở: main + dock + rail nhận inert, Lenis chính dừng (lockScroll "project"); khi đóng thì mở lại.
// - URL: pushState #project/<slug>; Back của trình duyệt đóng overlay; mở thẳng link #project/<slug> → chờ preloader
//   xong (sự kiện signal:intro) rồi mở đúng project.
// - Trong overlay: "← DIE 01 · DIE 03 →" sang project trước/sau (trượt ngang); nút chuyển SÁCH ⇄ CUỘN, lựa chọn nhớ
//   bằng localStorage. Mặc định: sách khi màn ≥ 900px và không reduced-motion, còn lại cuộn.
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { lockScroll } from "../core/scroll";
import { stage } from "../stage/instance";
import { esc, isFilled, projectSlug, type Project } from "../content/profile";
import { buildPages } from "./projectPages";
import { createBook, type BookView } from "./projectBook";
import { createScrollView, type ScrollView } from "./projectScroll";

type Mode = "book" | "scroll";
const MODE_KEY = "nns:pv-mode";
const pad2 = (n: number) => String(n).padStart(2, "0");

function storedMode(): Mode | null {
  try { const v = localStorage.getItem(MODE_KEY); return v === "book" || v === "scroll" ? v : null; } catch { return null; }
}
function storeMode(m: Mode) {
  try { localStorage.setItem(MODE_KEY, m); } catch { /* storage bị chặn: chỉ nhớ trong phiên */ }
}
const bookAllowed = () => innerWidth >= 900;

export function initProjectView(projects: Project[], cards: HTMLElement[]) {
  const root = $("#project-view");
  const frame = $(".pv-frame", root);
  const body = $("[data-pv-body]", root);
  const titleEl = $("[data-pv-title]", root);
  const dieEl = $("[data-pv-die]", root);
  const modeBtn = $<HTMLButtonElement>("[data-pv-mode]", root);
  const prevBtn = $<HTMLButtonElement>("[data-pv-prev]", root);
  const nextBtn = $<HTMLButtonElement>("[data-pv-next]", root);
  const bar = $(".pv-progress b", root);
  const outside = [$("main"), $(".dock"), $(".rail"), $(".skip-link")];
  const slugs = projects.map(projectSlug);

  let current = -1;
  let mode: Mode = "book";
  let view: BookView | ScrollView | null = null;
  let book: BookView | null = null;
  let pushed = false;
  let busy = false;
  let returnFocus: HTMLElement | null = null;

  const preferMode = (): Mode => {
    if (!bookAllowed()) return "scroll";
    return storedMode() ?? (state.reduced ? "scroll" : "book");
  };

  function header(i: number) {
    const p = projects[i];
    dieEl.textContent = `DIE ${pad2(i + 1)}`;
    titleEl.textContent = isFilled(p.title) ? p.title : `Project ${pad2(i + 1)} — to be added`;
    const n = projects.length;
    const pi = (i - 1 + n) % n, ni = (i + 1) % n;
    prevBtn.innerHTML = `<span aria-hidden="true">&larr;</span> DIE ${pad2(pi + 1)}`;
    nextBtn.innerHTML = `DIE ${pad2(ni + 1)} <span aria-hidden="true">&rarr;</span>`;
    prevBtn.setAttribute("aria-label", `Previous project: DIE ${pad2(pi + 1)}${isFilled(projects[pi].title) ? ` — ${esc(projects[pi].title)}` : ""}`);
    nextBtn.setAttribute("aria-label", `Next project: DIE ${pad2(ni + 1)}${isFilled(projects[ni].title) ? ` — ${esc(projects[ni].title)}` : ""}`);
    root.classList.toggle("has-nav", n > 1);
  }

  function mount(i: number, m: Mode) {
    view?.destroy();
    book = null;
    mode = m;
    root.dataset.mode = m;
    const pages = buildPages(projects[i], i);
    bar.style.transform = "scaleX(0)";
    if (m === "book") {
      book = createBook(body, pages, (from, total) => (bar.style.transform = `scaleX(${((from + 2) / total).toFixed(3)})`));
      view = book;
    } else {
      view = createScrollView(body, pages, (p) => (bar.style.transform = `scaleX(${p.toFixed(4)})`));
    }
    modeBtn.hidden = !bookAllowed();
    modeBtn.textContent = m === "book" ? "Scroll view" : "Book view";
    modeBtn.setAttribute("aria-label", m === "book" ? "Switch to scroll view" : "Switch to book view");
  }

  // ---- mở ----
  function open(i: number, opts: { fromCard?: boolean; push?: boolean } = {}) {
    if (busy || i < 0 || i >= projects.length) return;
    if (current >= 0) { switchTo(i, 1); return; }
    busy = true;
    current = i;
    const card = cards[i];
    returnFocus = card.querySelector<HTMLElement>(".pc-hit") ?? card;
    header(i);
    if (opts.push !== false) { history.pushState({ pv: slugs[i] }, "", `#project/${slugs[i]}`); pushed = true; }

    // trạng thái card trước khi ẩn khỏi luồng: bỏ tilt để Flip đọc khung phẳng
    gsap.set(card, { rotationX: 0, rotationY: 0 });
    card.dataset.flipId = "pv";
    frame.dataset.flipId = "pv";
    const flipState = opts.fromCard !== false && !state.reduced ? Flip.getState(card, { props: "borderRadius" }) : null;

    root.hidden = false;
    document.documentElement.classList.add("pv-open");
    outside.forEach((el) => el && (el.inert = true));
    lockScroll(true, "project");
    mount(i, preferMode());

    const others = cards.filter((c) => c !== card);
    const content = $$(".pv-head, .pv-body, .pv-nav", root);
    const tl = gsap.timeline({ onComplete: () => { busy = false; focusFirst(); } });
    tl.fromTo(".pv-backdrop", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0);
    if (flipState) {
      gsap.set(content, { opacity: 0 });
      tl.add(Flip.from(flipState, { targets: frame, duration: 0.85, ease: "expo.inOut", scale: true, absolute: false }), 0)
        .to(content, { opacity: 1, duration: 0.45, ease: "power2.out", stagger: 0.06 }, 0.55)
        .to(card, { opacity: 0, duration: 0.2 }, 0)
        .to(others, { scale: 0.86, opacity: 0.25, filter: "blur(3px)", duration: 0.8, ease: "expo.out", stagger: 0.05 }, 0)
        .add(() => glitchPulse(), 0.05);
    } else {
      tl.fromTo(frame, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: state.reduced ? 0.3 : 0.6, ease: "expo.out" }, 0);
    }
  }

  function glitchPulse() {
    if (state.reduced) return;
    gsap.fromTo(stage, { glitch: 0.75 }, { glitch: 0, duration: 0.55, ease: "power2.out", overwrite: true });
  }

  // ---- đóng ----
  function close(opts: { fromHistory?: boolean } = {}) {
    if (current < 0 || busy) return;
    busy = true;
    const i = current;
    const card = cards[i];
    const others = cards.filter((c) => c !== card);
    const content = $$(".pv-head, .pv-body, .pv-nav", root);
    const finish = () => {
      view?.destroy(); view = null; book = null;
      root.hidden = true;
      gsap.set([frame, ...content], { clearProps: "all" });
      gsap.set(".pv-backdrop", { clearProps: "opacity" });
      document.documentElement.classList.remove("pv-open");
      outside.forEach((el) => el && (el.inert = false));
      lockScroll(false, "project");
      gsap.set(card, { opacity: 1 });
      gsap.to(others, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "expo.out", clearProps: "scale,opacity,filter" });
      current = -1;
      busy = false;
      returnFocus?.focus({ preventScroll: true });
    };
    if (!opts.fromHistory && pushed) { pushed = false; history.back(); }       // popstate sẽ thấy current < 0 → bỏ qua
    else if (!opts.fromHistory && location.hash.startsWith("#project/")) history.replaceState(null, "", location.pathname + location.search);
    pushed = false;
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(content, { opacity: 0, duration: 0.25, ease: "power2.in" }, 0)
      .to(".pv-backdrop", { opacity: 0, duration: 0.6, ease: "power2.inOut" }, 0.15);
    if (!state.reduced && card.offsetParent) {
      gsap.set(card, { opacity: 0 });
      tl.add(Flip.fit(frame, card, { duration: 0.75, ease: "expo.inOut", scale: true }) as gsap.core.Tween, 0.1)
        .to(card, { opacity: 1, duration: 0.2 }, 0.8);
    } else {
      tl.to(frame, { opacity: 0, scale: 0.97, duration: 0.3 }, 0);
    }
  }

  // ---- sang project trước / sau: trượt ngang ----
  function switchTo(i: number, dir: 1 | -1) {
    if (busy || i === current) return;
    busy = true;
    const n = projects.length;
    i = (i + n) % n;
    const x = dir * 80;
    history.replaceState({ pv: slugs[i] }, "", `#project/${slugs[i]}`);
    gsap.timeline({ onComplete: () => { busy = false; } })
      .to(body, { x: -x, opacity: 0, duration: state.reduced ? 0.15 : 0.35, ease: "power2.in" })
      .add(() => {
        current = i;
        returnFocus = cards[i].querySelector<HTMLElement>(".pc-hit") ?? cards[i];
        header(i);
        mount(i, mode === "book" && bookAllowed() ? "book" : "scroll");
        glitchPulse();
      })
      .fromTo(body, { x }, { x: 0, opacity: 1, duration: state.reduced ? 0.15 : 0.55, ease: "expo.out" });
  }

  function focusFirst() {
    $<HTMLButtonElement>(".pv-close", root).focus({ preventScroll: true });
  }

  // ---- focus trap + phím ----
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") {
      const f = $$<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])", root)
        .filter((x) => !x.hidden && !x.closest("[inert], [hidden]") && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (book && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      e.preventDefault();
      book.step(e.key === "ArrowRight" ? 1 : -1);
    }
  });
  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-pv-close]")) close();
  });
  $(".pv-backdrop", root).addEventListener("click", () => close());
  modeBtn.addEventListener("click", () => {
    const m: Mode = mode === "book" ? "scroll" : "book";
    storeMode(m);
    gsap.fromTo(body, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
    mount(current, m);
    modeBtn.focus({ preventScroll: true });
  });
  prevBtn.addEventListener("click", () => switchTo(current - 1, -1));
  nextBtn.addEventListener("click", () => switchTo(current + 1, 1));

  // đổi kích thước qua ngưỡng 900px khi đang ở chế độ sách → chuyển sang cuộn
  addEventListener("resize", () => { if (current >= 0 && mode === "book" && !bookAllowed()) mount(current, "scroll"); modeBtn.hidden = !bookAllowed(); });

  // ---- lịch sử trình duyệt ----
  const fromHash = () => {
    const m = location.hash.match(/^#project\/([\w-]+)/);
    return m ? slugs.indexOf(m[1].toLowerCase()) : -1;
  };
  addEventListener("popstate", () => {
    const i = fromHash();
    if (i < 0 && current >= 0) { pushed = false; close({ fromHistory: true }); }
    else if (i >= 0 && current < 0) open(i, { push: false });
    else if (i >= 0 && i !== current) switchTo(i, i > current ? 1 : -1);
  });
  // mở thẳng link #project/<slug>: chờ preloader xong
  addEventListener("signal:intro", () => {
    const i = fromHash();
    if (i >= 0) setTimeout(() => open(i, { push: false, fromCard: false }), state.reduced ? 0 : 450);
  }, { once: true });

  return { open, close };
}
