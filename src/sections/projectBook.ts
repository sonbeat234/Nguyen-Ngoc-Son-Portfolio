// Chế độ SÁCH của trang chi tiết dự án: một cuốn sách mở 2 trang (spread), lật trang có cong giấy.
// Kỹ thuật chuyển thể từ ThreeUI Sketchbook (threeui-main/src/shaders/sketchbook/sketchbookDocument.js:
// .curl / .strip lồng nhau, biến --tt (góc lật) và --td (góc cong mỗi dải), ánh sáng --a1/--a2 theo dải):
//   - trang đang lật = N dải dọc lồng nhau; mỗi dải xoay rotateY thêm --td so với dải trước → cộng dồn thành mặt cong;
//     tt = πt + β·sin(πt), td = 2β·sin(πt)/N (phẳng ở hai đầu, cong nhất giữa chừng);
//   - mặt trước = trang đang lật, mặt sau = trang kế tiếp; trang bên dưới có bóng đậm/nhạt theo góc lật;
//   - nội dung trong dải là BẢN SAO DOM của trang (aria-hidden, inert), chỉ tồn tại trong lúc lật. Trang thật luôn
//     là chữ DOM thật (chọn được, trình đọc màn hình đọc được).
// N = 16 (quality cao) · 8 (core/quality hạ cấp) · 1 = lật phẳng có bóng (reduced-motion).
// Điều khiển: kéo mép/góc trang (pointer events, thả tay dựa vào vận tốc để lật hết hoặc bật về), bấm nửa trái/phải,
// phím ← →, cuộn chuột/trackpad (một cử chỉ = một trang, khoá tới khi cử chỉ dừng), chấm tiến độ, "Page 3–4 / 8".
// Mỗi lần trang mở ra: tiêu đề reveal theo ký tự, số liệu đếm lên, ảnh wipe vào bằng clip-path.
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { state } from "../core/state";
import { $, $$ } from "../core/dom";
import { END_PAGE, type PageDef } from "./projectPages";

export type BookView = { el: HTMLElement; step: (dir: 1 | -1) => void; destroy: () => void };

const BETA = 0.6;                 // độ cong lớn nhất (radian) giữa chừng lật — như bản gốc
type Turn = { dir: 1 | -1; t: number; curl: HTMLElement; strips: HTMLElement[]; n: number; tween?: gsap.core.Tween };

export function createBook(host: HTMLElement, defs: PageDef[], onSpread?: (from: number, total: number) => void): BookView {
  const pagesDef = defs.length % 2 ? [...defs, END_PAGE] : defs;
  const total = pagesDef.length;
  const spreads = total / 2;

  const el = document.createElement("div");
  el.className = "pv-book";
  el.innerHTML = `
    <div class="pv-book-stage">
      <div class="pv-spread">
        <i class="pv-stack pv-stack-l" aria-hidden="true"></i><i class="pv-stack pv-stack-r" aria-hidden="true"></i>
        ${pagesDef.map((p, i) => `<section class="pv-page is-off" data-i="${i}" aria-label="Page ${i + 1} of ${total}">${p.html}<span class="pv-folio" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span></section>`).join("")}
        <i class="pv-shade pv-shade-l" aria-hidden="true"></i><i class="pv-shade pv-shade-r" aria-hidden="true"></i>
        <i class="pv-spine" aria-hidden="true"></i>
        <button class="pv-corner pv-corner-prev" type="button" aria-label="Previous pages (drag the corner to turn)"><i aria-hidden="true"></i></button>
        <button class="pv-corner pv-corner-next" type="button" aria-label="Next pages (drag the corner to turn)"><i aria-hidden="true"></i></button>
      </div>
      <i class="pv-book-shadow" aria-hidden="true"></i>
    </div>
    <div class="pv-book-ui">
      <button class="pv-arrow" type="button" data-book-prev aria-label="Previous pages">&larr;</button>
      <ol class="pv-dots">${Array.from({ length: spreads }, (_, s) => `<li><button type="button" data-spread="${s}" aria-label="Pages ${s * 2 + 1}–${s * 2 + 2}: ${pagesDef[s * 2].label} · ${pagesDef[s * 2 + 1].label}"></button></li>`).join("")}</ol>
      <p class="pv-pageno mono" aria-live="polite"></p>
      <button class="pv-arrow" type="button" data-book-next aria-label="Next pages">&rarr;</button>
    </div>
    <p class="pv-book-hint mono" aria-hidden="true">Drag a corner · click a page · ← → · scroll</p>`;
  host.appendChild(el);

  const spreadEl = $(".pv-spread", el);
  const pages = $$(".pv-page", el);
  const dots = $$<HTMLButtonElement>(".pv-dots button", el);
  const pageno = $(".pv-pageno", el);
  const prevBtn = $<HTMLButtonElement>("[data-book-prev]", el);
  const nextBtn = $<HTMLButtonElement>("[data-book-next]", el);
  const shadeL = $(".pv-shade-l", el), shadeR = $(".pv-shade-r", el);
  const splits = new Map<HTMLElement, SplitText>();

  let s = 0;                       // spread hiện tại
  let turn: Turn | null = null;
  let alive = true;

  // ---- trang hiện: is-left / is-right; trang khác ẩn hẳn (content-visibility, inert) ----
  function place(left: number, right: number) {
    pages.forEach((p, i) => {
      const on = i === left || i === right;
      p.classList.toggle("is-left", i === left);
      p.classList.toggle("is-right", i === right);
      p.classList.toggle("is-off", !on);
      p.inert = !on;
      if (on) p.removeAttribute("aria-hidden"); else p.setAttribute("aria-hidden", "true");
    });
  }

  function ui() {
    pageno.textContent = `Page ${s * 2 + 1}–${s * 2 + 2} / ${total}`;
    dots.forEach((d, k) => { d.classList.toggle("is-on", k === s); if (k === s) d.setAttribute("aria-current", "page"); else d.removeAttribute("aria-current"); });
    prevBtn.disabled = s === 0;
    nextBtn.disabled = s === spreads - 1;
    el.classList.toggle("is-first", s === 0);
    el.classList.toggle("is-last", s === spreads - 1);
    onSpread?.(s * 2, total);
  }

  // ---- trang mở ra: tiêu đề theo ký tự (không mask: chữ có dấu không bị cắt), số đếm lên, ảnh wipe ----
  function reveal(page: HTMLElement) {
    if (state.reduced) { page.classList.add("is-shown"); return; }
    const title = page.querySelector<HTMLElement>("[data-pg-title]");
    if (title) {
      let sp = splits.get(title);
      if (!sp) { sp = SplitText.create(title, { type: "words,chars", charsClass: "pg-ch" }); splits.set(title, sp); }
      gsap.fromTo(sp.chars, { yPercent: 60, rotateX: -70, opacity: 0 }, {
        yPercent: 0, rotateX: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: { each: 0.018, from: "start" }, overwrite: true,
      });
    }
    page.querySelectorAll<HTMLElement>("[data-count]").forEach((b) => {
      const to = Number(b.dataset.count), dec = Number(b.dataset.dec ?? 0), o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.4, ease: "power3.out", onUpdate: () => (b.textContent = o.v.toFixed(dec)), overwrite: true });
    });
    gsap.fromTo(page.querySelectorAll("[data-pg-img]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1, ease: "expo.inOut", stagger: 0.08, delay: 0.1 });
    page.classList.remove("is-shown");
    void page.offsetWidth;                  // khởi động lại transition thanh số liệu
    page.classList.add("is-shown");
  }

  function show(spread: number, animate = true) {
    s = spread;
    place(s * 2, s * 2 + 1);
    ui();
    if (animate) { reveal(pages[s * 2]); reveal(pages[s * 2 + 1]); }
    else { pages[s * 2].classList.add("is-shown"); pages[s * 2 + 1].classList.add("is-shown"); }
  }

  // ---- dựng dải cong cho một lần lật ----
  function buildCurl(dir: 1 | -1, front: HTMLElement, back: HTMLElement) {
    const n = state.reduced ? 1 : state.quality >= 0.75 ? 16 : 8;
    const r = spreadEl.getBoundingClientRect();             // đọc layout một lần lúc bắt đầu lật
    const pw = r.width / 2, ph = r.height, sw = pw / n;
    const curl = document.createElement("div");
    curl.className = `pv-curl ${dir > 0 ? "is-next" : "is-prev"}`;
    curl.setAttribute("aria-hidden", "true");
    curl.inert = true;
    curl.style.setProperty("--pw", `${pw}px`);
    curl.style.setProperty("--ph", `${ph}px`);
    curl.style.setProperty("--n", String(n));
    const frontPg = front.querySelector(".pg")!, backPg = back.querySelector(".pg")!;
    const strips: HTMLElement[] = [];
    let parent: HTMLElement = curl;
    for (let i = 0; i < n; i++) {
      const strip = document.createElement("div");
      strip.className = "pv-strip" + (i === n - 1 ? " is-edge" : "");
      // offset nội dung: dải thứ i của trang trước (từ gáy ra) và vị trí soi gương tương ứng của trang sau
      const nearGutter = -(i * sw), mirrored = -(pw - (i + 1) * sw);
      const fOff = dir > 0 ? nearGutter : mirrored;
      const bOff = dir > 0 ? mirrored : nearGutter;
      strip.innerHTML =
        `<div class="pv-face is-front"><div class="pv-clone" style="left:${fOff.toFixed(2)}px"></div><i class="pv-sh"></i><i class="pv-gl"></i>${i === n - 1 ? `<i class="pv-rim"></i>` : ""}</div>` +
        `<div class="pv-face is-back"><div class="pv-clone" style="left:${bOff.toFixed(2)}px"></div><i class="pv-sh"></i><i class="pv-gl"></i>${i === n - 1 ? `<i class="pv-rim"></i>` : ""}</div>`;
      const [cf, cb] = strip.querySelectorAll<HTMLElement>(".pv-clone");
      cf.appendChild(frontPg.cloneNode(true));
      cb.appendChild(backPg.cloneNode(true));
      parent.appendChild(strip);
      parent = strip;
      strips.push(strip);
    }
    spreadEl.appendChild(curl);
    return { curl, strips, n };
  }

  function apply(tn: Turn) {
    const t = tn.t, D = 180 / Math.PI;
    const beta = BETA * Math.sin(Math.PI * t) * (tn.n > 1 ? 1 : 0);
    const tt = Math.PI * t + beta, td = (2 * beta) / tn.n;
    const st = tn.curl.style;
    st.setProperty("--tt", `${(tt * D).toFixed(2)}deg`);
    st.setProperty("--td", `${(td * D).toFixed(3)}deg`);
    const shade = Math.sin(Math.PI * t);
    st.setProperty("--shade", shade.toFixed(3));
    // bóng lên trang bên dưới: phía trang lộ ra đậm khi tờ giấy còn đứng gần, nhạt dần khi đã lật qua
    const under = tn.dir > 0 ? shadeR : shadeL, over = tn.dir > 0 ? shadeL : shadeR;
    under.style.opacity = (shade * (1 - t * 0.6)).toFixed(3);
    over.style.opacity = (shade * t * 0.8).toFixed(3);
    for (let i = 0; i < tn.n; i++) {
      const l1 = Math.abs(Math.cos(tt - i * td)), l2 = Math.abs(Math.cos(tt - (i + 1) * td));
      const ss = tn.strips[i].style;
      ss.setProperty("--lit", l1.toFixed(3));
      ss.setProperty("--a1", ((1 - l1) * 0.62).toFixed(3));
      ss.setProperty("--a2", ((1 - l2) * 0.62).toFixed(3));
    }
  }

  function startTurn(dir: 1 | -1) {
    if (turn) settle();
    const to = s + dir;
    if (to < 0 || to >= spreads) return null;
    const L = s * 2, R = s * 2 + 1;
    // next: trái giữ trang hiện tại, phải lộ trang phải kế tiếp; lá lật = trang phải (trước) / trang trái kế (sau)
    // prev: trái lộ trang trái trước đó, phải giữ trang hiện tại; lá lật = trang trái (trước) / trang phải trước đó (sau)
    if (dir > 0) place(L, R + 2); else place(L - 2, R);
    const front = pages[dir > 0 ? R : L], back = pages[dir > 0 ? R + 1 : L - 1];
    const t0 = performance.now();
    const b = buildCurl(dir, front, back);
    if (state.debug) (window as unknown as { __bookBuildMs: number }).__bookBuildMs = performance.now() - t0;
    turn = { dir, t: 0, ...b };
    el.classList.add("is-turning");
    apply(turn);
    return turn;
  }

  function end(commitIt: boolean) {
    const tn = turn;
    if (!tn) return;
    turn = null;
    tn.curl.remove();
    shadeL.style.opacity = shadeR.style.opacity = "0";
    el.classList.remove("is-turning");
    if (commitIt) show(s + tn.dir, true);
    else show(s, false);
  }
  /** lật đang dở → kết thúc ngay về phía gần hơn (khi người dùng bấm tiếp) */
  function settle() {
    if (!turn) return;
    turn.tween?.kill();
    end(turn.t > 0.5);
  }

  function commit(tn: Turn) {
    tn.tween?.kill();
    if (state.reduced) { tn.tween = gsap.to(tn, { t: 1, duration: 0.35, ease: "power1.inOut", onUpdate: () => apply(tn), onComplete: () => end(true) }); return; }
    tn.tween = gsap.to(tn, { t: 1, duration: 0.25 + 0.75 * (1 - tn.t), ease: "power2.out", onUpdate: () => apply(tn), onComplete: () => end(true) });
  }
  function cancel(tn: Turn) {
    tn.tween?.kill();
    tn.tween = gsap.to(tn, { t: 0, duration: 0.2 + 0.5 * tn.t, ease: "power2.out", onUpdate: () => apply(tn), onComplete: () => end(false) });
  }

  function step(dir: 1 | -1) {
    if (!alive) return;
    const tn = startTurn(dir);
    if (tn) commit(tn);
  }
  function go(target: number) {
    if (target === s || target < 0 || target >= spreads) return;
    if (Math.abs(target - s) === 1) { step(target > s ? 1 : -1); return; }
    settle();
    gsap.fromTo(spreadEl, { opacity: 0.2 }, { opacity: 1, duration: 0.45, ease: "power2.out" });
    show(target, true);
  }

  // ---- kéo góc trang ----
  let drag: { dir: 1 | -1; x0: number; w: number; moved: number; vel: number; tPrev: number; last: number } | null = null;
  $$<HTMLButtonElement>(".pv-corner", el).forEach((c) => {
    const dir: 1 | -1 = c.classList.contains("pv-corner-next") ? 1 : -1;
    c.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const tn = startTurn(dir);
      if (!tn) return;
      c.setPointerCapture(e.pointerId);
      drag = { dir, x0: e.clientX, w: spreadEl.clientWidth / 2, moved: 0, vel: 0, tPrev: performance.now(), last: 0 };
    });
    c.addEventListener("pointermove", (e) => {
      if (!drag || !turn) return;
      const dx = e.clientX - drag.x0;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      const t = Math.max(0, Math.min(1, (drag.dir > 0 ? -dx : dx) / (drag.w * 1.15)));
      const now = performance.now();
      drag.vel = (t - drag.last) / Math.max(0.001, (now - drag.tPrev) / 1000);
      drag.tPrev = now; drag.last = t;
      turn.t = t;
      apply(turn);
    });
    const up = () => {
      if (!drag || !turn) { drag = null; return; }
      const d = drag;
      drag = null;
      if (d.moved < 6 || turn.t > 0.42 || d.vel > 1.1) commit(turn);       // chạm nhẹ = lật; thả: theo vị trí + vận tốc
      else cancel(turn);
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("click", (e) => e.preventDefault());              // đã xử lý ở pointerup
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); step(dir); } });
  });

  // ---- bấm nửa trái / phải (không phải link/nút, không đang bôi chọn chữ) ----
  pages.forEach((p) => p.addEventListener("click", (e) => {
    if ((e.target as Element).closest("a, button, input, textarea, select, label")) return;
    const sel = getSelection();
    if (sel && !sel.isCollapsed) return;
    if (p.classList.contains("is-right")) step(1);
    else if (p.classList.contains("is-left")) step(-1);
  }));

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.spread))));

  // ---- cuộn chuột / trackpad: một cử chỉ = một trang; khoá tới khi ngừng nhận wheel 220 ms (quán tính trackpad) ----
  let wheelLock = false, wheelIdle = 0;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    clearTimeout(wheelIdle);
    wheelIdle = window.setTimeout(() => (wheelLock = false), 220);
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (wheelLock || Math.abs(d) < 6) return;
    wheelLock = true;
    step(d > 0 ? 1 : -1);
  };
  el.addEventListener("wheel", onWheel, { passive: false });

  show(0, false);

  return {
    el,
    step,
    destroy() {
      alive = false;
      clearTimeout(wheelIdle);
      turn?.tween?.kill();
      splits.forEach((sp) => sp.revert());
      el.remove();
    },
  };
}
