import { onTick } from "./loop";
import { state } from "./state";

let acc = 0, frames = 0, goodFor = 0;
onTick((_, dt) => {
  acc += dt; frames++;
  if (acc < 1) return;
  const fps = frames / acc;
  state.fps = fps;
  acc = 0; frames = 0;
  if (fps < 48 && state.quality > 0.5) {
    state.quality = Math.max(0.5, state.quality - 0.125);
    goodFor = 0;
  } else if (fps > 58) {
    goodFor++;
    if (goodFor >= 3 && state.quality < 1) { state.quality = Math.min(1, state.quality + 0.125); goodFor = 0; }
  }
  document.documentElement.dataset.quality = state.quality.toFixed(2);
}, "early");
document.documentElement.dataset.quality = state.quality.toFixed(2);
