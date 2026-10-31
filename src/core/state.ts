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
  quality: 1,                                              // 0.5..1 theo bậc 0.125, quality.ts điều khiển (canvas phụ đọc)
  /** độ phân giải render scene của stage: đuổi theo quality một cách mượt (không "pop") */
  stageScale: 1,
  /** chu kỳ làm tươi màn hình (ms) — quality.ts đo; mặc định 60 Hz tới khi đo xong */
  refreshMs: 1000 / 60,
  /** bậc hạ cấp cuối (quality đã ở 0.5 mà vẫn trễ): tắt lớp không thiết yếu (hạt dock) */
  lite: false,
  fps: 60,
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("reduced"),
  touch: window.matchMedia("(pointer: coarse)").matches,
  mobile: window.innerWidth < 768,
  debug: params.has("debug"),
  /** ?perf: như debug (expose __lenis / __signal, đo GPU) nhưng không có HUD — dùng cho verify.mjs --perf */
  perf: params.has("perf"),
  /** ?legacyfx: bật lại các hiệu ứng V4 đã thay vì hiệu năng (backdrop blur DOM, grain DOM, blur từng ký tự,
   *  tween accent trên :root, starfield canvas) — để so sánh trước/sau (DECISIONS [v5-perf]) */
  legacyfx: params.has("legacyfx"),
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
