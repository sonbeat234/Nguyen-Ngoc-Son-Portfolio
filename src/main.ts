// Bootstrap: 1 CSS → 2 state/loop/scroll/quality → 3 ShaderStage + scenes + bind [data-scene] → 4 preloader
// → 5 lớp toàn cục → 6 từng section theo thứ tự trang → 7 ScrollTrigger.refresh → 8 mở scroll + intro.
// Nội dung cá nhân: src/content/profile.ts.
import "./core/gl";                       // phải đứng đầu: theo dõi mọi WebGL context từ lúc tạo

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/buttons.css";
import "./styles/sections/preloader.css";
import "./styles/sections/hero.css";
import "./styles/sections/about.css";
import "./styles/sections/flow.css";
import "./styles/sections/projects.css";
import "./styles/sections/project-view.css";
import "./styles/sections/cv.css";
import "./styles/sections/eol.css";
import "./styles/print.css";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { state } from "./core/state";
import { onTick } from "./core/loop";
import { lenis, scrollTo } from "./core/scroll";
import "./core/quality";
import { initHud } from "./core/hud";
import { stage } from "./stage/instance";
import { initGlobalLayers, initInteractions } from "./fx/ui";
import { initTextFx } from "./fx/text";

import { initPreloader } from "./sections/preloader";
import { initHero } from "./sections/hero";
import { initAbout } from "./sections/about";
import { initDesignFlow } from "./sections/designFlow";
import { initProjects } from "./sections/projects";
import { initCv } from "./sections/cv";
import { initEol } from "./sections/eol";

const SECTIONS: [string, () => unknown][] = [
  ["hero", initHero], ["about", initAbout], ["flow", initDesignFlow],
  ["projects", initProjects], ["cv", initCv], ["eol", initEol],
];

document.documentElement.classList.add("js");
document.documentElement.classList.toggle("reduced", state.reduced);
document.documentElement.classList.toggle("touch", state.touch);
history.scrollRestoration = "manual";

onTick(() => stage.measure(), "early");
onTick(() => stage.render(), "late");
if (state.debug) {
  (window as unknown as { __lenis: unknown }).__lenis = lenis;
  initHud(stage);
}

// link trong trang (#id): cuộn mượt qua Lenis (đi qua mọi dissolve) rồi chuyển focus tới đích cho bàn phím
document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a || a.closest("#menu") || a.hash.startsWith("#project/")) return;   // #project/<slug>: projectView xử lý
  const target = document.getElementById(a.hash.slice(1));
  if (!target) return;
  e.preventDefault();
  scrollTo(target, state.reduced ? 0.01 : 1.8);
  target.focus({ preventScroll: true });
});

async function boot() {
  const pre = await initPreloader();
  initGlobalLayers();
  for (const [name, init] of SECTIONS) {
    try { await init(); }
    catch (err) { console.error(`[portfolio] init ${name} failed`, err); }
  }
  initTextFx();
  initInteractions();
  ScrollTrigger.refresh();
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  await pre.reveal();
}

boot();
