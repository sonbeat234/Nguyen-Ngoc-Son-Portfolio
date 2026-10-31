import { ShaderStage } from "./ShaderStage";
import { state } from "../core/state";
import { WAFER_FRAG } from "../shaders/wafer";
import { CIRCUIT_FRAG } from "../shaders/circuit";
import { TOPO_FRAG } from "../shaders/topo";
import { STREAM_CONVERGENCE_FRAGMENT_SHADER } from "../vendor/streamConvergenceShaders";
import { CORE_UPLINK_FRAGMENT_SHADER } from "../vendor/dotMatrixShaders";
import { RIBBON_FIELD_FRAGMENT_SHADER } from "../vendor/ribbonFieldShaders";
import { palette, sceneAccent, mixRgb } from "./palette";

/**
 * Scene nền theo đúng thứ tự trang (order quyết định chiều dissolve):
 * hero = wafer → profile = đi dây metal → flow = dòng tín hiệu hội tụ → projects = ma trận die
 * → CV = đường đồng mức (layout) → footer = dải ribbon halftone.
 */
export function registerScenes(stage: ShaderStage) {
  // màu lấy từ data-accent / data-accent2 của section gắn scene + token palette (stage/palette.ts)
  const P = palette;
  const bg = mixRgb(P.ink, P.panel, 0.35);
  stage.bg = P.ink;
  const ac = (id: string) => sceneAccent(id);

  const hero = ac("wafer");
  stage.add({
    id: "wafer", frag: WAFER_FRAG, mouse: "unit",
    uniforms: { u_accent: hero.a, u_accent2: hero.b, u_signal: P.signal, u_base: mixRgb(P.panel, hero.a, 0.08), u_bg: bg },
    edge: hero.b,
  });

  const about = ac("circuit");
  stage.add({
    id: "circuit", frag: CIRCUIT_FRAG, mouse: "unit",
    // u_textRect do sections/about.ts cập nhật (cột chữ); mặc định rỗng (x1 < x0) = không có vùng chữ
    uniforms: {
      u_accent: about.a, u_copper: mixRgb(P.copper, about.a, 0.35), u_cool: mixRgb(P.panel, about.b, 0.55),
      u_bg: bg, u_dim: 0.6, u_textRect: [1, 1, 0, 0],
    },
    edge: about.b,
  });

  const flow = ac("stream");
  stage.add({
    id: "stream", frag: STREAM_CONVERGENCE_FRAGMENT_SHADER, timeScale: 0.3,
    uniforms: { u_interactive_fidelity: 0.5 },
    onProgress: (p, set) => set("u_interactive_fidelity", 0.3 + p * 0.7 + Math.abs(state.scroll.smooth) * 0.4),
    edge: flow.b, tint: { lo: flow.a, hi: flow.b, amount: 0.85 },
  });

  const proj = ac("dotmatrix");
  stage.add({
    id: "dotmatrix", frag: CORE_UPLINK_FRAGMENT_SHADER, mouse: "ndc",
    uniforms: { uGridScale: 60, uMouseAmount: 0.04, uPulseSpeed: 0.4, uRadius: 0.15, uOpacity: 0.5 },
    onProgress: (p, set) => { set("uGridScale", 72 - p * 28); set("uPulseSpeed", 0.4 + p * 1.2 + Math.abs(state.scroll.smooth)); },
    edge: proj.b, tint: { lo: proj.a, hi: proj.b, amount: 0.9 },
  });

  const cv = ac("topo");
  stage.add({ id: "topo", frag: TOPO_FRAG, mouse: "unit", uniforms: { u_tint: cv.a, u_tint2: cv.b, u_bg: bg }, edge: cv.b });

  const eol = ac("ribbon");
  stage.add({ id: "ribbon", frag: RIBBON_FIELD_FRAGMENT_SHADER, mouse: "unit", edge: eol.b, tint: { lo: eol.a, hi: eol.b, amount: 0.8 } });
}
