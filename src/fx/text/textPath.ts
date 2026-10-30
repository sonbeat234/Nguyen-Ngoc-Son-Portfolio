// Chữ chạy trên đường cong theo scroll (Text on a Path: text-path-studies/sources/text-on-a-path*.html).
import gsap from "gsap";
import { onTick } from "../../core/loop";
import { state } from "../../core/state";

/**
 * svg chứa <path> và một hoặc nhiều <textPath>. Mỗi textPath có thể khai báo
 * data-from / data-to (startOffset %, mặc định 10% → -60%) để chạy lệch pha (bản nhiều dòng của text-on-a-path-ii).
 * Path "thở" theo vận tốc cuộn nếu đúng đường cong mặc định của spec (data-breathe).
 */
export function initTextPath(svg: SVGSVGElement) {
  if (svg.dataset.fxPath) return;
  svg.dataset.fxPath = "1";
  svg.querySelectorAll<SVGTextPathElement>("textPath").forEach((tp) => {
    gsap.fromTo(tp, { attr: { startOffset: tp.dataset.from ?? "10%" } }, {
      attr: { startOffset: tp.dataset.to ?? "-60%" }, ease: "none",
      scrollTrigger: { trigger: svg, start: "top bottom", end: "bottom top", scrub: 0.8 },
    });
  });
  const path = svg.querySelector<SVGPathElement>("path[data-breathe]");
  if (!path || state.reduced) return;
  let last = 0;
  onTick(() => {
    const k = state.scroll.smooth * 140;
    if (Math.abs(k - last) < 0.5) return;
    last = k;
    path.setAttribute("d", `M-100,420 C250,${120 + k} 550,${560 - k} 820,300 S1350,${80 + k} 1700,320`);
  });
}

export function initTextPaths(root: ParentNode = document) {
  root.querySelectorAll<SVGSVGElement>("svg[data-textpath]").forEach(initTextPath);
}
