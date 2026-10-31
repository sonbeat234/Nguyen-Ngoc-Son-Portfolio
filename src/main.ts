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

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { state } from "./core/state";
import { onTick } from "./core/loop";
import { lenis, scrollTo } from "./core/scroll";
import { calibrateRefresh, startQuality } from "./core/quality";
import { initHud } from "./core/hud";
import { stage } from "./stage/instance";
import { initGlobalLayers, initInteractions } from "./fx/ui";
import { initTextFx } from "./fx/text";

import { initPreloader } from "./sections/preloader";
import { initHero, prewarmHeroParticles } from "./sections/hero";
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
document.documentElement.classList.toggle("legacyfx", state.legacyfx);   // ?legacyfx: hiệu ứng V4 trước tối ưu (so sánh)
history.scrollRestoration = "manual";

onTick(() => stage.measure(), "early");
onTick(() => stage.render(), "late");
if (state.debug || state.perf) {
  (window as unknown as { __lenis: unknown }).__lenis = lenis;
  initHud(stage, state.debug);   // ?perf: chỉ expose số liệu, không vẽ HUD (HUD tự tốn thời gian mỗi frame)
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
  // ?debug: thời gian khởi tạo từng phần (verify.mjs đọc window.__bootTimes)
  const times: Record<string, number> = {};
  const timed = async (label: string, fn: () => unknown) => { const t = performance.now(); await fn(); times[label] = Math.round(performance.now() - t); };
  const preloading = initPreloader();
  // lớp toàn cục (dock có WebGL riêng: biên dịch shader) khởi tạo TRONG pha tải, song song với font/shader stage —
  // coi như prewarm, để phần đuôi sau khi tải xong chỉ còn khởi tạo section + intro
  await timed("global", initGlobalLayers);
  prewarmHeroParticles();                   // renderer hạt hero: tạo + biên dịch shader trong pha tải
  const pre = await preloading;
  performance.mark("boot:preloader-ready");
  for (const [name, init] of SECTIONS) {
    try { await timed(name, init); }
    catch (err) { console.error(`[portfolio] init ${name} failed`, err); }
  }
  await timed("textfx", () => initTextFx());
  await timed("interactions", () => initInteractions());
  await timed("refresh", () => ScrollTrigger.refresh());
  if (state.debug) (window as unknown as { __bootTimes: unknown }).__bootTimes = times;
  // V5-perf (k): font tải xong muộn (sau preloader) → refresh khi người dùng KHÔNG cuộn (refresh = đo lại mọi pin,
  // layout toàn trang; giữa lúc cuộn là một frame rớt rõ)
  const refreshWhenIdle = () => (lenis.isScrolling ? setTimeout(refreshWhenIdle, 250) : ScrollTrigger.refresh());
  document.fonts.ready.then(refreshWhenIdle);
  performance.mark("boot:sections-ready");
  // chờ một nhịp ticker: sau một tác vụ dài, timeline tạo ngay sẽ "nhảy cóc" (lagSmoothing 0) và bỏ qua intro
  await new Promise<void>((r) => gsap.delayedCall(0.001, r));
  // đo nhịp vsync khi trang rảnh, preloader vẫn che (stage tạm dừng ~24 frame; lần mở lại trong phiên bỏ qua)
  await calibrateRefresh((on) => (stage.paused = on));
  await pre.reveal();
  startQuality();
}

boot();
