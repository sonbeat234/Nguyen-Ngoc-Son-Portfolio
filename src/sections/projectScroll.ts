// Chế độ CUỘN của trang chi tiết dự án (mobile < 900px, reduced-motion, hoặc nút "Scroll view" trong chế độ sách).
// - Cuộn dọc bên trong overlay bằng một Lenis instance THỨ HAI (wrapper/content = vùng cuộn của overlay, autoRaf
//   tắt, raf chạy chung gsap.ticker — vẫn một RAF). ScrollTrigger bên trong dùng scroller = vùng cuộn.
// - Thanh tiến độ màu accent trên đầu (onProgress), header dính (CSS).
// - Mỗi khối reveal riêng: tiêu đề + đoạn văn tách dòng (không mask → chữ có dấu không bị cắt), ảnh wipe clip-path +
//   parallax, gallery cuộn ngang khi pin, số liệu đếm lên, thanh số liệu đầy dần.
// - Reduced-motion: Lenis không làm mượt, không pin/parallax/tách chữ — nội dung hiện đủ, chỉ fade nhẹ.
import gsap from "gsap";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { state } from "../core/state";
import { $$ } from "../core/dom";
import type { PageDef } from "./projectPages";

export type ScrollView = { el: HTMLElement; destroy: () => void };

export function createScrollView(host: HTMLElement, defs: PageDef[], onProgress: (p: number) => void): ScrollView {
  const el = document.createElement("div");
  el.className = "pv-scroll";
  el.setAttribute("data-lenis-prevent", "");          // Lenis chính (window) bỏ qua mọi sự kiện cuộn trong overlay
  el.tabIndex = 0;                                    // cuộn được bằng phím khi focus
  el.setAttribute("aria-label", "Project details");
  el.innerHTML = `<div class="pv-scroll-in">${defs.map((p, i) => `<section class="pvs-block pvs-${p.kind}" data-i="${i}">${p.html}</section>`).join("")}</div>`;
  host.appendChild(el);
  const content = el.firstElementChild as HTMLElement;
  const reduced = state.reduced;

  const lenis = new Lenis({
    wrapper: el, content, autoRaf: false,
    lerp: reduced ? 1 : 0.1, smoothWheel: !reduced, wheelMultiplier: 0.95,
  });
  const raf = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(raf);
  lenis.on("scroll", (l: Lenis) => { ScrollTrigger.update(); onProgress(l.progress || 0); });

  const splits: SplitText[] = [];
  const ctx = gsap.context(() => {
    const st = (trigger: Element, extra: ScrollTrigger.Vars = {}): ScrollTrigger.Vars => ({ trigger, scroller: el, start: "top 86%", once: true, ...extra });

    if (reduced) {
      $$(".pvs-block", el).forEach((b) => gsap.from(b, { opacity: 0, duration: 0.6, ease: "power1.out", scrollTrigger: st(b) }));
      $$(".pvs-block", el).forEach((b) => b.classList.add("is-shown"));
      return;
    }

    // tiêu đề + đoạn văn: tách dòng, trồi lên từng dòng
    $$<HTMLElement>("[data-pg-title], .pg-lead, .pg-block > p:not(.pg-h), .pg-lessons-list li", el).forEach((t) => {
      const sp = SplitText.create(t, { type: "lines", linesClass: "pvs-line" });
      splits.push(sp);
      gsap.from(sp.lines, { yPercent: 70, opacity: 0, rotateX: -18, duration: 1, ease: "expo.out", stagger: 0.07, scrollTrigger: st(t) });
    });
    $$(".pg-kicker, .pg-meta, .pg-tags, .pg-facts, .pg-tba, .pg-links, .pg-close", el).forEach((t) =>
      gsap.from(t, { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: st(t) }));

    // ảnh: wipe clip-path khi vào + parallax trong khung
    $$(".pvs-block:not(.pvs-gallery) [data-pg-img]", el).forEach((f) => {
      gsap.fromTo(f, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "expo.inOut", scrollTrigger: st(f, { start: "top 80%" }) });
      const inner = f.querySelector("img, svg, .pg-fig-empty");
      if (inner) gsap.fromTo(inner, { yPercent: -7, scale: 1.12 }, { yPercent: 7, scale: 1.12, ease: "none", scrollTrigger: { trigger: f, scroller: el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // số liệu: đếm lên + thanh đầy dần
    $$(".pvs-results", el).forEach((b) => ScrollTrigger.create({
      ...st(b, { start: "top 70%" }),
      onEnter: () => {
        b.classList.add("is-shown");
        b.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
          const to = Number(n.dataset.count), dec = Number(n.dataset.dec ?? 0), o = { v: 0 };
          gsap.to(o, { v: to, duration: 1.6, ease: "power3.out", onUpdate: () => (n.textContent = o.v.toFixed(dec)) });
        });
      },
    }));

    // gallery: pin khối, dải ảnh chạy ngang theo cuộn
    $$(".pvs-gallery", el).forEach((b) => {
      const track = b.querySelector<HTMLElement>(".pg-gal");
      if (!track) return;
      const dist = () => Math.max(0, track.scrollWidth - b.clientWidth + 48);
      gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: b, scroller: el, start: "top top", end: () => `+=${dist() + innerHeight * 0.2}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      $$("[data-pg-img]", track).forEach((f, k) => gsap.fromTo(f, { clipPath: "inset(0 0 100% 0)" }, {
        clipPath: "inset(0 0 0% 0)", duration: 1, ease: "expo.out", delay: k * 0.08, scrollTrigger: st(b, { start: "top 60%" }),
      }));
    });
  }, el);

  // V5-perf (k): chỉ refresh trigger của chính overlay (scroller = el). ScrollTrigger.refresh() toàn cục đo lại cả pin
  // của trang chính (layout toàn trang) đúng lúc overlay đang mở → long task.
  requestAnimationFrame(() => ScrollTrigger.getAll().filter((t) => t.scroller === el).forEach((t) => t.refresh()));

  return {
    el,
    destroy() {
      ctx.revert();
      splits.forEach((s) => s.revert());
      gsap.ticker.remove(raf);
      lenis.destroy();
      el.remove();
    },
  };
}
