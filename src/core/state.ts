const params = new URLSearchParams(location.search);

export const state = {
  time: 0,
  dt: 1 / 60,
  w: window.innerWidth,
  h: window.innerHeight,
  mouse: {
    x: window.innerWidth / 2, y: window.innerHeight / 2,   // raw (px, y xuống)
    sx: window.innerWidth / 2, sy: window.innerHeight / 2, // smoothed
    nx: 0, ny: 0,                                          // smoothed NDC -1..1, y lên
    speed: 0,                                              // px/s smoothed
    down: false,
  },
  scroll: { y: 0, velocity: 0, smooth: 0, progress: 0, direction: 1 as 1 | -1 },
  quality: 1,                                              // 0.5..1, quality.ts điều khiển
  fps: 60,
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("reduced"),
  touch: window.matchMedia("(pointer: coarse)").matches,
  mobile: window.innerWidth < 768,
  debug: params.has("debug"),
};

window.addEventListener("pointermove", (e) => {
  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;
}, { passive: true });
window.addEventListener("pointerdown", () => (state.mouse.down = true));
window.addEventListener("pointerup", () => (state.mouse.down = false));
window.addEventListener("resize", () => {
  state.w = window.innerWidth;
  state.h = window.innerHeight;
  state.mobile = state.w < 768;
});
