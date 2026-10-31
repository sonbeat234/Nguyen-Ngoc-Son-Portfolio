// Debug HUD (bật bằng ?debug): fps, quality, scene A/B, mix, draw call, số WebGL context đang sống, GPU ms của stage.
// ?perf: không vẽ HUD (visible = false), chỉ expose window.__signal cho verify.mjs --perf.
import gsap from "gsap";
import { onTick, perfHook } from "./loop";
import { state } from "./state";
import { liveContexts } from "./gl";
import type { ShaderStage } from "../stage/ShaderStage";
import { qstats } from "./quality";

export function initHud(stage: ShaderStage, visible = true) {
  let acc = 0, frames = 0, fps = 60, worst = 0, peakCtx = 0;
  // mốc đầu frame: listener ưu tiên thêm SAU Lenis → đứng đầu hàng đợi gsap.ticker (gồm cả Lenis + tween)
  perfHook.on = true;
  gsap.ticker.add(() => { perfHook.t0 = performance.now(); }, false, true);
  const el = visible ? document.createElement("pre") : null;
  if (el) {
    el.className = "hud";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  onTick((_, dt) => {
    acc += dt; frames++;
    worst = Math.max(worst, dt);
    peakCtx = Math.max(peakCtx, liveContexts());
    if (acc < 0.25) return;
    fps = frames / acc;
    if (el) {
      const l = stage.last;
      el.textContent =
        `fps      ${fps.toFixed(0).padStart(3)}  worst ${(worst * 1000).toFixed(0)}ms\n` +
        `refresh  ${qstats.refreshHz.toFixed(0)}Hz  p90 ${qstats.p90.toFixed(1)}ms\n` +
        `quality  ${state.quality.toFixed(3)}→${state.stageScale.toFixed(2)}${state.lite ? " lite" : ""}  stage ${l.w}×${l.h}\n` +
        `scene A  ${l.a || "—"}\n` +
        `scene B  ${l.b || "—"}  mix ${l.mix.toFixed(2)}\n` +
        `draws    ${l.draws}   gpu ${stage.gpuMs >= 0 ? stage.gpuMs.toFixed(2) + "ms" : "n/a"}\n` +
        `webgl    ${liveContexts()} live / ${peakCtx} peak\n` +
        `scroll   ${state.scroll.y.toFixed(0)}  v ${state.scroll.smooth.toFixed(2)}`;
    }
    acc = 0; frames = 0; worst = 0;
  }, "late");
  // cho verify.mjs đọc số liệu
  (window as unknown as { __signal: unknown }).__signal = {
    stage,
    get contexts() { return liveContexts(); },
    get peakContexts() { return peakCtx; },
    get fps() { return fps; },
    tickLog: perfHook.log,
    get quality() { return { q: state.quality, scale: state.stageScale, lite: state.lite, hz: qstats.refreshHz, p90: qstats.p90 }; },
  };
}
