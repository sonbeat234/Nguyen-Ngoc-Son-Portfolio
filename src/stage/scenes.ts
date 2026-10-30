import { ShaderStage } from "./ShaderStage";
import { state } from "../core/state";
import { NEBULA_FRAG } from "../shaders/nebula";
import { TOPO_FRAG } from "../shaders/topo";
import { STREAM_CONVERGENCE_FRAGMENT_SHADER } from "../vendor/streamConvergenceShaders";
import { VELOX_FRAGMENT_SHADER } from "../vendor/liquidFormShaders";
import { LASER_FRAGMENT_SHADER } from "../vendor/laserShaders";
import { BELL_FIELD_FRAGMENT_SHADER } from "../vendor/bellFieldShaders";
import { CORE_UPLINK_FRAGMENT_SHADER } from "../vendor/dotMatrixShaders";
import { LUMINA_FRAGMENT_SHADER } from "../vendor/emeraldHorizonShaders";
import { NXA_ENERGY_ORB_CONFIGURABLE_FRAGMENT_SHADER } from "../vendor/energyOrbShaders";
import { RIBBON_FIELD_FRAGMENT_SHADER } from "../vendor/ribbonFieldShaders";

/** id scene theo đúng thứ tự trang (menu preview và debug dùng) */
export const SCENE_ORDER = ["nebula", "stream", "topo", "liquid", "laser0", "laser1", "laser2", "laser3", "bell", "dotmatrix", "emerald", "orb", "ribbon"];

export function registerScenes(stage: ShaderStage) {
  stage.add({ id: "nebula", frag: NEBULA_FRAG, mouse: "unit", edge: [0.7, 0.6, 1.0] });

  stage.add({
    id: "stream", frag: STREAM_CONVERGENCE_FRAGMENT_SHADER, timeScale: 0.3,
    uniforms: { u_interactive_fidelity: 0.5 },
    onProgress: (p, set) => set("u_interactive_fidelity", 0.3 + p * 0.7 + Math.abs(state.scroll.smooth) * 0.4),
    edge: [0.65, 1.0, 0.85],
  });

  stage.add({ id: "topo", frag: TOPO_FRAG, mouse: "unit", edge: [1, 1, 1] });

  stage.add({
    id: "liquid", frag: VELOX_FRAGMENT_SHADER, mouse: "ndc", resScale: 0.6,
    uniforms: { u_morph: 1, u_noise_scale: 1, u_mouse_amount: 0.15, u_metal: 1, u_camera: 5.5 },
    onProgress: (p, set) => {
      // cuộn nhanh → blob sôi; cuối chương blob "nổ" (morph ~3) trong lúc dissolve sang laser
      set("u_morph", 0.6 + p * 2.0 + Math.abs(state.scroll.smooth) * 0.8 + Math.max(0, p - 0.85) * 4);
      set("u_camera", 6.4 - p * 1.8);                                      // camera tiến vào
      set("u_noise_scale", 1 + Math.sin(p * Math.PI) * 0.6);
    },
    edge: [0.9, 0.92, 1.0],
  });

  // 4 biến thể laser = 4 scene dùng chung 1 program (cache theo source), weight do lasers.ts set
  ["laser0", "laser1", "laser2", "laser3"].forEach((id, i) =>
    stage.add({
      id, frag: LASER_FRAGMENT_SHADER, mouse: "ndc",
      uniforms: { u_variant: i, u_size: 1, u_length: 1, u_density: 1, u_hue: 0, u_saturation: 1, u_brightness: 1 },
      onProgress: (p, set) => { set("u_density", 0.8 + p * 1.4); set("u_length", 0.8 + p * 0.5); },
      edge: [0.4, 1.0, 0.8],
    }),
  );

  stage.add({
    id: "bell", frag: BELL_FIELD_FRAGMENT_SHADER, mouse: "pxDown",
    uniforms: { u_strike: 1 },          // 1 = nghỉ; tween 0 → 1 khi "đánh chuông"
    edge: [0.85, 0.6, 0.25],
  });

  stage.add({
    id: "dotmatrix", frag: CORE_UPLINK_FRAGMENT_SHADER, mouse: "ndc",
    uniforms: { uGridScale: 60, uMouseAmount: 0.04, uPulseSpeed: 0.4, uRadius: 0.15, uOpacity: 0.55 },
    onProgress: (p, set) => { set("uGridScale", 70 - p * 30); set("uPulseSpeed", 0.4 + p * 1.2); },
    edge: [0, 0.9, 1],
  });

  stage.add({
    id: "emerald", frag: LUMINA_FRAGMENT_SHADER,
    uniforms: { u_wave_scale: 1, u_variation: 1, u_glow: 1, u_vignette: 1 },
    onProgress: (p, set) => { set("u_wave_scale", 0.7 + p * 1.0); set("u_glow", 0.8 + p * 0.7); },
    edge: [0.2, 1.0, 0.5],
  });

  stage.add({
    id: "orb", frag: NXA_ENERGY_ORB_CONFIGURABLE_FRAGMENT_SHADER,
    uniforms: { uSmokeScale: 1, uSmokeStrength: 1, uSmokeSpeed: 1, uHue: 0, uSaturation: 1, uGlow: 1 },
    onProgress: (p, set) => {
      set("uGlow", 0.7 + p * 1.0 + Math.max(0, p - 0.8) * 6);  // gần cuối chương orb trắng dần lên
      set("uSmokeSpeed", 1 + Math.abs(state.scroll.smooth) * 4);
      set("uHue", p * 0.6);             // tím → hơi ấm khi gần CTA
    },
    edge: [0.6, 0.55, 1.0],
  });

  stage.add({ id: "ribbon", frag: RIBBON_FIELD_FRAGMENT_SHADER, mouse: "unit", edge: [0.3, 0.85, 1.0] });
}
