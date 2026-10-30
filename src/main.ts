// Bootstrap theo spec mục 4.6:
// 1 CSS → 2 state/loop/scroll/quality → 3 ShaderStage + scenes + bind [data-scene] → 4 preloader
// → 5 lớp toàn cục → 6 từng section theo thứ tự trang → 7 ScrollTrigger.refresh → 8 mở scroll + intro.
import "./core/gl";                       // phải đứng đầu: theo dõi mọi WebGL context từ lúc tạo

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/buttons.css";
import "./styles/chapters/c00.css";
import "./styles/chapters/c01.css";
import "./styles/chapters/c02.css";
import "./styles/chapters/c03.css";
import "./styles/chapters/c04.css";
import "./styles/chapters/c05.css";
import "./styles/chapters/c06.css";
import "./styles/chapters/c07.css";
import "./styles/chapters/c08.css";
import "./styles/chapters/c09.css";
import "./styles/chapters/c10.css";
import "./styles/chapters/c11.css";
import "./styles/chapters/c12.css";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { state } from "./core/state";
import { onTick } from "./core/loop";
import { lenis } from "./core/scroll";
import "./core/quality";
import { initHud } from "./core/hud";
import { stage } from "./stage/instance";
import { initGlobalLayers, initInteractions } from "./fx/ui";
import { initTextFx } from "./fx/text";

import { initPreloader } from "./sections/preloader";
import { initHero } from "./sections/hero";
import { initWarp } from "./sections/warp";
import { initManifesto } from "./sections/manifesto";
import { initChrome } from "./sections/chrome";
import { initLasers } from "./sections/lasers";
import { initResonance } from "./sections/resonance";
import { initOrbit } from "./sections/orbit";
import { initFlow } from "./sections/flow";
import { initGlass } from "./sections/glass";
import { initSignal } from "./sections/signal";
import { initCore } from "./sections/core";
import { initFooter } from "./sections/footer";

const SECTIONS: [string, () => unknown][] = [
  ["c01 hero", initHero], ["c02 warp", initWarp], ["c03 manifesto", initManifesto],
  ["c04 chrome", initChrome], ["c05 lasers", initLasers], ["c06 resonance", initResonance],
  ["c07 orbit", initOrbit], ["c08 flow", initFlow], ["c09 glass", initGlass],
  ["c10 signal", initSignal], ["c11 core", initCore], ["c12 footer", initFooter],
];

document.documentElement.classList.add("js");
document.documentElement.classList.toggle("reduced", state.reduced);
document.documentElement.classList.toggle("touch", state.touch);
history.scrollRestoration = "manual";

onTick(() => stage.render(), "late");
if (state.debug) {
  (window as unknown as { __lenis: unknown }).__lenis = lenis;
  initHud(stage);
}

async function boot() {
  const pre = await initPreloader();
  initGlobalLayers();
  for (const [name, init] of SECTIONS) {
    try { await init(); }
    catch (err) { console.error(`[signal] init ${name} failed`, err); }
  }
  initTextFx();
  initInteractions();
  ScrollTrigger.refresh();
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  await pre.reveal();
}

boot();
