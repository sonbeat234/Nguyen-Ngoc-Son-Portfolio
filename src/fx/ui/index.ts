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
import { initShield } from "./shield";
import { initRise } from "./rise";
import { initFrost } from "./frost";

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
  // V5-perf (i): sao nền vẽ trong composite của stage, cập nhật mỗi frame (không còn canvas toàn màn 20 fps/60 fps
  // đổi nhịp, không thêm lớp compositing). Canvas cũ chỉ còn ở ?legacyfx để so sánh.
  const canvas = $<HTMLCanvasElement>("#ambient");
  if (!state.legacyfx) { canvas.style.display = "none"; return; }
  const stars = createAmbientStarfield(canvas);
  // canvas toàn màn: đứng yên thì sao trôi rất chậm → 20fps là đủ (bớt upload texture mỗi frame); đang cuộn thì mỗi frame
  let acc = 0;
  onTick((_, dt) => {
    acc += dt;
    if (Math.abs(state.scroll.smooth) < 0.02 && acc < 0.05) return;
    stars.render(acc);
    acc = 0;
  });
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
  initShield(root);
  initMagnetic(root);
  initTilt(root);
  initRise(root);
  initFrost(root);
}
