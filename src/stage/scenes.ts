import { ShaderStage } from "./ShaderStage";
import { state } from "../core/state";
import { WAFER_FRAG } from "../shaders/wafer";
import { CIRCUIT_FRAG } from "../shaders/circuit";
import { TOPO_FRAG } from "../shaders/topo";
import { STREAM_CONVERGENCE_FRAGMENT_SHADER } from "../vendor/streamConvergenceShaders";
import { CORE_UPLINK_FRAGMENT_SHADER } from "../vendor/dotMatrixShaders";
import { RIBBON_FIELD_FRAGMENT_SHADER } from "../vendor/ribbonFieldShaders";

/**
 * Scene nền theo đúng thứ tự trang (order quyết định chiều dissolve):
 * hero = wafer → profile = đi dây metal → flow = dòng tín hiệu hội tụ → projects = ma trận die
 * → CV = đường đồng mức (layout) → footer = dải ribbon halftone.
 */
export function registerScenes(stage: ShaderStage) {
  stage.add({
    id: "wafer", frag: WAFER_FRAG, mouse: "unit",
    uniforms: { u_accent: [0.36, 0.88, 1.0] },
    edge: [0.45, 0.9, 1.0],
  });

  stage.add({
    id: "circuit", frag: CIRCUIT_FRAG, mouse: "unit",
    uniforms: { u_accent: [1.0, 0.68, 0.4] },
    edge: [1.0, 0.66, 0.36],
  });

  stage.add({
    id: "stream", frag: STREAM_CONVERGENCE_FRAGMENT_SHADER, timeScale: 0.3,
    uniforms: { u_interactive_fidelity: 0.5 },
    onProgress: (p, set) => set("u_interactive_fidelity", 0.3 + p * 0.7 + Math.abs(state.scroll.smooth) * 0.4),
    edge: [0.68, 0.6, 1.0],
  });

  stage.add({
    id: "dotmatrix", frag: CORE_UPLINK_FRAGMENT_SHADER, mouse: "ndc",
    uniforms: { uGridScale: 60, uMouseAmount: 0.04, uPulseSpeed: 0.4, uRadius: 0.15, uOpacity: 0.5 },
    onProgress: (p, set) => { set("uGridScale", 72 - p * 28); set("uPulseSpeed", 0.4 + p * 1.2 + Math.abs(state.scroll.smooth)); },
    edge: [0.4, 1.0, 0.75],
  });

  stage.add({ id: "topo", frag: TOPO_FRAG, mouse: "unit", edge: [1.0, 0.88, 0.55] });

  stage.add({ id: "ribbon", frag: RIBBON_FIELD_FRAGMENT_SHADER, mouse: "unit", edge: [0.4, 0.8, 1.0] });
}
