// Debug HUD (bật bằng ?debug): fps, quality, scene A/B, mix, draw call, số WebGL context đang sống.
import { onTick } from "./loop";
import { state } from "./state";
import { liveContexts } from "./gl";
import type { ShaderStage } from "../stage/ShaderStage";

export function initHud(stage: ShaderStage) {
  const el = document.createElement("pre");
  el.className = "hud";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  let acc = 0, frames = 0, fps = 60, worst = 0, peakCtx = 0;
  onTick((_, dt) => {
    acc += dt; frames++;
    worst = Math.max(worst, dt);
    peakCtx = Math.max(peakCtx, liveContexts());
    if (acc < 0.25) return;
    fps = frames / acc;
    const l = stage.last;
    el.textContent =
      `fps      ${fps.toFixed(0).padStart(3)}  worst ${(worst * 1000).toFixed(0)}ms\n` +
      `quality  ${state.quality.toFixed(2)}  stage ${l.w}×${l.h}\n` +
      `scene A  ${l.a || "—"}\n` +
      `scene B  ${l.b || "—"}  mix ${l.mix.toFixed(2)}\n` +
      `draws    ${l.draws}\n` +
      `webgl    ${liveContexts()} live / ${peakCtx} peak\n` +
      `scroll   ${state.scroll.y.toFixed(0)}  v ${state.scroll.smooth.toFixed(2)}`;
    acc = 0; frames = 0; worst = 0;
  }, "late");
  // cho verify.mjs đọc số liệu
  (window as unknown as { __signal: unknown }).__signal = {
    stage,
    get contexts() { return liveContexts(); },
    get peakContexts() { return peakCtx; },
    get fps() { return fps; },
  };
}
