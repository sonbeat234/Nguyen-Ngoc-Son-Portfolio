// Đường mạch toàn trang (mép trái): chạy dọc qua mọi section, mỗi ranh giới là một nấc 45° kiểu PCB + via.
// "Vẽ" theo tiến độ cuộn: đoạn sáng = từ đầu trang tới 62% chiều cao viewport, đầu tín hiệu phát sáng chạy theo,
// via sáng lên khi tín hiệu đi qua. SVG fixed, hẹp (không phủ chữ); <g> dịch theo scrollY nên mỗi frame chỉ
// raster một dải hẹp. Hình học dựng lại sau mỗi ScrollTrigger.refresh (pin-spacer đổi chiều cao trang).
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onTick } from "../../core/loop";
import { state } from "../../core/state";
import { $ } from "../../core/dom";
import { chapters } from "./accent";

const NS = "http://www.w3.org/2000/svg";
const MAX_PTS = 64;
const HEAD = 0.62;                       // đầu tín hiệu ở 62% chiều cao viewport

export function initTrace() {
  const svg = $<SVGSVGElement>("svg.trace");
  const g = $<SVGGElement>(".trace__g", svg);
  const base = $<SVGPathElement>(".trace__base", svg);
  const glow = $<SVGPathElement>(".trace__glow", svg);
  const lit = $<SVGPathElement>(".trace__lit", svg);
  const viaG = $<SVGGElement>(".trace__vias", svg);
  const head = $<SVGCircleElement>(".trace__head", svg);

  const xs = new Float32Array(MAX_PTS), ys = new Float32Array(MAX_PTS), acc = new Float32Array(MAX_PTS);
  let n = 0, total = 0, lastY = -1, lastH = -1;
  let vias: { el: SVGCircleElement; at: number; on: boolean }[] = [];

  function build() {
    const [a, b] = state.mobile ? [6, 11] : [20, 32];
    const H = document.documentElement.scrollHeight;
    n = 0;
    const push = (x: number, y: number) => { if (n < MAX_PTS) { xs[n] = x; ys[n] = y; n++; } };
    let x = a;
    push(x, 0);
    const jogs: number[] = [];
    chapters.forEach((c, i) => {
      if (i === 0) return;
      const top = c.el.getBoundingClientRect().top + window.scrollY - 48;
      const nx = x === a ? b : a, d = Math.abs(nx - x);
      push(x, top - d);
      push(nx, top);
      jogs.push(n - 1);
      x = nx;
    });
    push(x, H);

    let d = "";
    total = 0;
    for (let i = 0; i < n; i++) {
      if (i) total += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
      acc[i] = total;
      d += `${i ? "L" : "M"}${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`;
    }
    for (const p of [base, glow, lit]) p.setAttribute("d", d);
    lit.style.strokeDasharray = glow.style.strokeDasharray = `${total} ${total}`;

    viaG.replaceChildren();
    vias = jogs.map((k) => {
      const el = document.createElementNS(NS, "circle");
      el.setAttribute("cx", xs[k].toFixed(1));
      el.setAttribute("cy", ys[k].toFixed(1));
      el.setAttribute("r", "4");
      el.setAttribute("class", "trace__via");
      viaG.appendChild(el);
      return { el, at: acc[k], on: false };
    });
    lastY = -1;
  }

  // vị trí theo toạ độ tài liệu y: path đơn điệu theo y (đoạn 45° nội suy tuyến tính) → độ dài + x của đầu tín hiệu
  let headX = 0;
  function lengthAt(y: number) {
    headX = xs[0];
    if (y <= ys[0]) return 0;
    for (let i = 1; i < n; i++) {
      if (y > ys[i]) continue;
      const t = (y - ys[i - 1]) / Math.max(1e-3, ys[i] - ys[i - 1]);
      headX = xs[i - 1] + (xs[i] - xs[i - 1]) * t;
      return acc[i - 1] + (acc[i] - acc[i - 1]) * t;
    }
    headX = xs[n - 1];
    return total;
  }

  ScrollTrigger.addEventListener("refresh", build);

  onTick(() => {
    if (!n) return;
    const y = state.scroll.y, vh = state.h;
    if (y === lastY && vh === lastH) return;
    lastY = y; lastH = vh;
    const L = lengthAt(y + vh * HEAD);
    g.setAttribute("transform", `translate(0 ${(-y).toFixed(1)})`);
    const off = (total - L).toFixed(1);
    lit.style.strokeDashoffset = off;
    glow.style.strokeDashoffset = off;
    head.setAttribute("cx", headX.toFixed(1));
    head.setAttribute("cy", (vh * HEAD).toFixed(1));
    for (const v of vias) {
      const on = v.at <= L;
      if (on !== v.on) { v.on = on; v.el.classList.toggle("is-on", on); }
    }
  });
}
