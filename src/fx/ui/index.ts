// Lớp toàn cục (spec mục 13) + quét vi tương tác sau khi section init.
import { onTick } from "../../core/loop";
import { state } from "../../core/state";
import { $ } from "../../core/dom";
import { createAmbientStarfield } from "../../canvas/Starfield";
import { initAccent } from "./accent";
import { initDock } from "./dock";
import { initRail } from "./rail";
import { initMenu } from "./menu";
import { initCursor } from "./cursor";
import { initMagnetic } from "./magnetic";
import { initTilt } from "./tilt";
import { initTrace } from "./trace";

function initProgress() {
  const bar = $(".progress");
  let last = -1;
  onTick(() => {
    const p = Math.round(state.scroll.progress * 1000) / 1000;
    if (p === last) return;
    last = p;
    bar.style.transform = `scaleX(${p})`;
  });
}

function initAmbient() {
  const stars = createAmbientStarfield($<HTMLCanvasElement>("#ambient"));
  onTick((_, dt) => stars.render(dt));
}

export function initGlobalLayers() {
  initProgress();
  initAmbient();
  initTrace();
  initRail();
  initDock();
  initMenu();
  initCursor();
  initAccent();          // cuối cùng: listener của dock/rail đã sẵn sàng khi chương đầu tiên được báo
}

export function initInteractions(root: ParentNode = document) {
  initMagnetic(root);
  initTilt(root);
}
