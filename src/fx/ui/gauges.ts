// Performance Gauges — port từ threeui-main/src/shaders/neuform-isolated/sources/performance-gauges.html:
// giữ SPECS (góc quét, thang đo, vùng màu, giá trị nghỉ/chạy, readout) và chuỗi self-test
// (quét hết thang → về nghỉ → dừng ở giá trị chạy). Vẽ lại bằng SVG: vùng màu và cung tiến độ dùng
// stroke-dasharray, vạch chia + số sinh bằng JS, kim xoay. kick() = kim giật vọt lên rồi hồi về (elastic).
import gsap from "gsap";
import { state } from "../../core/state";

export type GaugeKind = "speedometer" | "tachometer" | "power" | "boost";
type Zone = { from: number; to: number; color: string };
type Spec = {
  label: string; unit: string;
  start: number; sweep: number; min: number; max: number; majorStep: number; minorPerMajor: number;
  numeral: (v: number) => string; numeralColor: string; tickColor: (v: number) => string;
  zones: Zone[]; progress?: string; progressFrom?: number;
  idle: number; value: number; readout: (v: number) => string;
  face: string; needle: string; glow: string; ink: string;
};

const SPECS: Record<GaugeKind, Spec> = {
  tachometer: {
    label: "r/min ×1000", unit: "RPM",
    start: -135, sweep: 270, min: 0, max: 7, majorStep: 1, minorPerMajor: 5,
    numeral: (v) => String(v), numeralColor: "rgba(0,0,0,.78)",
    tickColor: (v) => (v >= 5.5 ? "#7F1D1D" : "rgba(0,0,0,.7)"),
    zones: [{ from: 0, to: 5.5, color: "rgba(0,0,0,.22)" }, { from: 5.5, to: 7, color: "rgba(185,28,28,.95)" }],
    idle: 0, value: 5.2, readout: (v) => v.toFixed(1),
    face: "radial-gradient(closest-side at 50% 32%, #F58135 0%, #E76A2A 44%, #D0541B 74%, #B94512 100%)",
    needle: "linear-gradient(#F87171,#DC2626 50%,#991B1B)", glow: "rgba(0,0,0,0)", ink: "rgba(0,0,0,.82)",
  },
  speedometer: {
    label: "km/h", unit: "SPEED",
    start: -135, sweep: 270, min: 0, max: 160, majorStep: 20, minorPerMajor: 4,
    numeral: (v) => String(v), numeralColor: "rgba(255,255,255,.72)",
    tickColor: (v) => (v >= 140 ? "rgba(248,113,113,.95)" : "rgba(255,255,255,.6)"),
    zones: [{ from: 0, to: 140, color: "rgba(255,255,255,.09)" }, { from: 140, to: 160, color: "rgba(220,38,38,.6)" }],
    progress: "#E26226",
    idle: 0, value: 118, readout: (v) => String(Math.round(v)),
    face: "radial-gradient(closest-side at 50% 28%, #1d1d21 0%, #141416 50%, #0a0a0b 100%)",
    needle: "linear-gradient(#fff,#F59E5B 40%,#E26226)", glow: "rgba(226,98,38,.45)", ink: "rgba(255,255,255,.9)",
  },
  power: {
    label: "kW", unit: "EV POWER",
    start: -135, sweep: 270, min: -30, max: 120, majorStep: 30, minorPerMajor: 3,
    numeral: (v) => (v === -30 ? "CHG" : String(v)), numeralColor: "rgba(255,255,255,.68)",
    tickColor: (v) => (v < 0 ? "rgba(52,211,153,.85)" : "rgba(216,180,254,.75)"),
    zones: [{ from: -30, to: 0, color: "rgba(16,185,129,.7)" }, { from: 0, to: 120, color: "rgba(168,85,247,.3)" }],
    progress: "#C084FC", progressFrom: 0,
    idle: -22, value: 78, readout: (v) => String(Math.round(v)),
    face: "radial-gradient(closest-side at 50% 28%, #191624 0%, #111016 50%, #08070B 100%)",
    needle: "linear-gradient(#fff,#D8B4FE 40%,#A855F7)", glow: "rgba(192,132,252,.45)", ink: "rgba(255,255,255,.9)",
  },
  boost: {
    label: "bar", unit: "TURBO BOOST",
    start: -135, sweep: 270, min: -1, max: 1.5, majorStep: 0.5, minorPerMajor: 5,
    numeral: (v) => v.toFixed(1), numeralColor: "rgba(255,255,255,.7)",
    tickColor: (v) => (v >= 1.2 ? "rgba(248,113,113,.95)" : v < 0 ? "rgba(148,163,184,.65)" : "rgba(103,232,249,.85)"),
    zones: [{ from: -1, to: 0, color: "rgba(148,163,184,.55)" }, { from: 0, to: 1.2, color: "rgba(34,211,238,.6)" }, { from: 1.2, to: 1.5, color: "rgba(220,38,38,.9)" }],
    progress: "#22D3EE", progressFrom: 0,
    idle: -0.85, value: 0.92, readout: (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2),
    face: "radial-gradient(closest-side at 50% 26%, #17324F 0%, #0F172A 48%, #030816 100%)",
    needle: "linear-gradient(#fff,#67E8F9 40%,#06B6D4)", glow: "rgba(34,211,238,.5)", ink: "rgba(255,255,255,.9)",
  },
};

const NS = "http://www.w3.org/2000/svg";
const C = 100, R_ZONE = 86, R_TICK = 80;
const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
};

export function createGauge(host: HTMLElement, kind: GaugeKind) {
  const spec = SPECS[kind];
  const angleFor = (v: number) => spec.start + ((v - spec.min) / (spec.max - spec.min)) * spec.sweep;
  const polar = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [C + Math.sin(a) * r, C - Math.cos(a) * r];
  };
  const circ = 2 * Math.PI * R_ZONE;
  const arcLen = (from: number, to: number) => (((to - from) / (spec.max - spec.min)) * spec.sweep / 360) * circ;

  const el = document.createElement("figure");
  el.className = `gauge gauge--${kind}`;
  el.innerHTML = `
    <div class="gauge__plate"></div>
    <div class="gauge__shell"><div class="gauge__bezel"><div class="gauge__face" style="background:${spec.face}">
      <div class="gauge__sunburst"></div>
      <div class="gauge__stack" style="color:${spec.ink}">
        <span class="gauge__cap">${spec.unit}</span>
        <span class="gauge__readout" style="text-shadow:0 0 12px ${spec.glow}">0</span>
        <span class="gauge__unit">${spec.label}</span>
      </div>
      <div class="gauge__needle"><i class="gauge__blade" style="background:${spec.needle}"></i><i class="gauge__tail"></i></div>
      <div class="gauge__hub"></div>
      <div class="gauge__glass"></div>
    </div></div></div>
    <figcaption class="sr-only">${spec.unit}, ${spec.readout(spec.value)} ${spec.label}</figcaption>`;
  const face = el.querySelector<HTMLElement>(".gauge__face")!;
  const needle = el.querySelector<HTMLElement>(".gauge__needle")!;
  const readout = el.querySelector<HTMLElement>(".gauge__readout")!;

  // ---- SVG: vùng màu, cung tiến độ, vạch chia, số ----
  const svg = svgEl("svg", { viewBox: "0 0 200 200", class: "gauge__svg", "aria-hidden": "true" });
  for (const z of spec.zones) {
    svg.appendChild(svgEl("circle", {
      cx: C, cy: C, r: R_ZONE, fill: "none", stroke: z.color, "stroke-width": 5,
      "stroke-dasharray": `${arcLen(z.from, z.to)} ${circ}`, transform: `rotate(${angleFor(z.from) - 90} ${C} ${C})`,
    }));
  }
  const prog = spec.progress
    ? svg.appendChild(svgEl("circle", {
      cx: C, cy: C, r: R_ZONE, fill: "none", stroke: spec.progress, "stroke-width": 5, "stroke-linecap": "round",
      "stroke-dasharray": `0 ${circ}`, class: "gauge__progress", style: `filter: drop-shadow(0 0 4px ${spec.progress})`,
    }))
    : null;
  const step = spec.majorStep / spec.minorPerMajor;
  const count = Math.round((spec.max - spec.min) / step);
  for (let i = 0; i <= count; i++) {
    const v = spec.min + i * step, major = i % spec.minorPerMajor === 0;
    const [x1, y1] = polar(angleFor(v), R_TICK);
    const [x2, y2] = polar(angleFor(v), R_TICK - (major ? 10 : 5));
    svg.appendChild(svgEl("line", { x1, y1, x2, y2, stroke: spec.tickColor(v), "stroke-width": major ? 2 : 1, opacity: major ? 1 : 0.55 }));
    if (major) {
      const [tx, ty] = polar(angleFor(v), R_TICK - 21);
      const t = svgEl("text", { x: tx, y: ty, fill: spec.numeralColor, class: "gauge__numeral", "text-anchor": "middle", "dominant-baseline": "central" });
      t.textContent = spec.numeral(Math.round(v * 1000) / 1000);
      svg.appendChild(t);
    }
  }
  face.prepend(svg);
  host.appendChild(el);

  // ---- trạng thái ----
  const o = { v: spec.idle };
  const apply = () => {
    needle.style.transform = `rotate(${angleFor(o.v)}deg)`;
    readout.textContent = spec.readout(o.v);
    if (prog) {
      const from = spec.progressFrom ?? spec.min;
      const a = Math.min(from, o.v), b = Math.max(from, o.v);
      prog.setAttribute("stroke-dasharray", `${arcLen(a, b)} ${circ}`);
      prog.setAttribute("transform", `rotate(${angleFor(a) - 90} ${C} ${C})`);
    }
  };
  apply();

  let live: gsap.core.Tween | null = null;
  const settle = () => {
    // rung nhẹ quanh giá trị chạy (flutter của bản gốc)
    live?.kill();
    if (state.reduced) return;
    const amp = (spec.max - spec.min) * 0.012;
    live = gsap.to(o, { v: spec.value + amp, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: apply });
  };

  return {
    el,
    /** self-test khi vào viewport: quét hết thang → về nghỉ → dừng ở giá trị chạy */
    activate() {
      live?.kill();
      if (state.reduced) { o.v = spec.value; apply(); return; }
      gsap.timeline({ onUpdate: apply, onComplete: settle })
        .to(o, { v: spec.max, duration: 1.1, ease: "power2.inOut" })
        .to(o, { v: spec.idle, duration: 0.9, ease: "power2.inOut" }, "+=0.25")
        .to(o, { v: spec.value, duration: 1.2, ease: "back.out(1.6)" }, "+=0.2");
    },
    /** chuông đánh: kim giật vọt gần đỉnh rồi hồi về (elastic) */
    kick() {
      live?.kill();
      if (state.reduced) return;
      const peak = spec.value + (spec.max - spec.value) * 0.85;
      gsap.timeline({ onUpdate: apply, onComplete: settle })
        .to(o, { v: peak, duration: 0.22, ease: "power4.out" })
        .to(o, { v: spec.value, duration: 1.8, ease: "elastic.out(1, 0.28)" });
    },
  };
}
