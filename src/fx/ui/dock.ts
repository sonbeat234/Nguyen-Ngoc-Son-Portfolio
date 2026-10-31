// Top dock: Animated Top Dock (vendor/topDockController: phóng item theo khoảng cách con trỏ)
// + nền Glass Particle Field (vendor/glassParticleField, WebGL). Ẩn khi cuộn xuống, hiện khi cuộn lên.
import gsap from "gsap";
import { createTopDockController, type TopDockOptions } from "../../vendor/topDockController";
import { createGlassParticleField, GLASS_PARTICLE_DEFAULTS } from "../../vendor/glassParticleField";
import { onTick } from "../../core/loop";
import { state } from "../../core/state";
import { $ } from "../../core/dom";
import { onChapter } from "./accent";
import { decodeTo } from "../text/decode";

export function initDock() {
  const dock = $(".dock");
  const nav = $(".dock__nav", dock);
  const canvas = $<HTMLCanvasElement>(".dock__field", dock);
  const label = $(".dock__label", dock);
  const num = $(".dock__num", dock);

  const dockOpts: TopDockOptions = {
    proximity: 122, spring: 0.19, damping: 0.7,
    widthGrowth: 17, heightGrowth: 0, drop: 0,          // pill cắt tràn: chỉ giãn ngang
    axis: "x", lockTrack: true,
  };
  createTopDockController(nav, () => dockOpts);

  // nền kính: bead khúc xạ trôi sau các item
  const glassOpts = { ...GLASS_PARTICLE_DEFAULTS, count: 18, drift: 1.2 };
  const field = createGlassParticleField(canvas, () => glassOpts);
  const fit = () => field.resize(dock.clientWidth, dock.clientHeight);
  new ResizeObserver(fit).observe(dock);
  fit();
  field.render(performance.now());   // vẽ ngay một lần: biên dịch shader rơi vào pha tải của preloader, không vào intro
  let hover = false;
  dock.addEventListener("pointerenter", () => (hover = true));
  dock.addEventListener("pointerleave", () => (hover = false));
  dock.addEventListener("pointermove", (e) => {
    const r = dock.getBoundingClientRect();
    field.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  }, { passive: true });

  // ẩn khi cuộn xuống, hiện khi cuộn lên (menu mở thì luôn hiện)
  let hidden = false, frame = 0;
  const show = (on: boolean) => {
    if (hidden === !on) return;
    hidden = !on;
    gsap.to(dock, { yPercent: on ? 0 : -150, duration: 0.6, ease: on ? "expo.out" : "power3.in", overwrite: "auto" });
  };
  onTick(() => {
    const s = state.scroll;
    if (document.documentElement.classList.contains("menu-open") || s.y < 120) show(true);
    else if (Math.abs(s.velocity) > 0.6) show(s.direction < 0);
    // đang hover thì đủ 60fps; bình thường 30fps là đủ cho bead trôi chậm
    if (hidden || (!hover && (frame++ & 1))) return;
    field.render(performance.now());
  });

  onChapter((c) => {
    num.textContent = String(c.index + 1).padStart(2, "0");
    decodeTo(label, c.title, { duration: 600 });
  });
}
