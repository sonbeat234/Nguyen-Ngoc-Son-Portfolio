// Tiêu đề "trượt" (V4, section Projects) — chuyển thể Sliding Text CTA
// (threeui-main/src/shaders/neuform-isolated/sources/sliding-text-cta.html: chữ cũ trượt xuống + mờ, bản sao trượt
// vào từ trên) áp cho từng từ của tiêu đề lớn, kết hợp bố cục Gallery Heading (gallery-heading.html: ghi chú nhỏ hai
// bên tiêu đề — phần đó là markup/CSS của section).
// - Vào màn: từng từ rơi vào từ trên xuống, lệch nhịp, có blur.
// - Hover tiêu đề: mọi từ "lăn" một vòng (bản sao trên trượt vào, bản gốc trượt xuống mờ đi).
// Giữ markup lồng (em) — chỉ bọc text node. Tiêu đề giữ aria-label = chữ gốc, các lớp tách aria-hidden.
// Reduced-motion: không tách, chữ tĩnh.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { state } from "../../core/state";

export function slideHeading(el: HTMLElement) {
  if (el.dataset.fxSlide) return;
  el.dataset.fxSlide = "1";
  el.classList.add("is-split");                 // [data-reveal] chờ tách xong mới hiện (base.css)
  if (state.reduced) return;
  el.setAttribute("aria-label", el.textContent?.replace(/\s+/g, " ").trim() ?? "");

  const inners: HTMLElement[] = [];
  const wrapText = (node: Node) => {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === Node.ELEMENT_NODE) { wrapText(c); return; }
      if (c.nodeType !== Node.TEXT_NODE || !c.textContent) return;
      const frag = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement("span");
        w.className = "sl-w";
        w.setAttribute("aria-hidden", "true");
        w.innerHTML = `<span class="sl-in"><span class="sl-a"></span><span class="sl-b"></span></span>`;
        (w.querySelector(".sl-a") as HTMLElement).textContent = part;
        (w.querySelector(".sl-b") as HTMLElement).textContent = part;
        inners.push(w.firstElementChild as HTMLElement);
        frag.appendChild(w);
      });
      c.replaceWith(frag);
    });
  };
  wrapText(el);

  // vào màn: từ rơi từ trên xuống (yPercent -100 → 0)
  gsap.set(inners, { yPercent: -100 });
  ScrollTrigger.create({
    trigger: el, start: "top 85%", once: true,
    onEnter: () => gsap.to(inners, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.07 }),
  });

  // hover: lăn một vòng — bản sao (.sl-b, nằm trên) trượt vào, bản gốc trượt xuống; xong đặt lại 0 (hai bản giống hệt)
  let rolling = false;
  el.addEventListener("pointerenter", () => {
    if (rolling) return;
    rolling = true;
    gsap.fromTo(inners, { yPercent: 0 }, {
      yPercent: 100, duration: 0.6, ease: "power3.inOut", stagger: 0.04,
      onComplete: () => { gsap.set(inners, { yPercent: 0 }); rolling = false; },
    });
  });
}
