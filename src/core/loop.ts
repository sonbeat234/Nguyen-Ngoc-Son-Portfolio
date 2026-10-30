import gsap from "gsap";
import { state } from "./state";
import { damp, clamp } from "./math";

type Tick = (time: number, dt: number) => void;
const early = new Set<Tick>();   // đọc layout / tính weight
const normal = new Set<Tick>();  // render các renderer
const late = new Set<Tick>();    // ShaderStage.render luôn chạy cuối

export function onTick(fn: Tick, phase: "early" | "normal" | "late" = "normal") {
  const set = phase === "early" ? early : phase === "late" ? late : normal;
  set.add(fn);
  return () => { set.delete(fn); };
}

let lastX = state.mouse.x, lastY = state.mouse.y;

gsap.ticker.add((time, deltaMs) => {
  const dt = Math.min(deltaMs / 1000, 1 / 20);
  state.time = time;
  state.dt = dt;

  const m = state.mouse;
  m.sx = damp(m.sx, m.x, 9, dt);
  m.sy = damp(m.sy, m.y, 9, dt);
  m.nx = (m.sx / state.w) * 2 - 1;
  m.ny = -((m.sy / state.h) * 2 - 1);
  const inst = Math.hypot(m.x - lastX, m.y - lastY) / Math.max(dt, 1e-3);
  m.speed = damp(m.speed, inst, 6, dt);
  lastX = m.x; lastY = m.y;

  const s = state.scroll;
  s.smooth = damp(s.smooth, clamp(s.velocity / 40, -1, 1), 6, dt);
  // Lenis chỉ phát "scroll" khi còn chuyển động: tự hạ velocity về 0 khi trang đứng yên
  s.velocity = damp(s.velocity, 0, 2, dt);

  early.forEach((f) => f(time, dt));
  normal.forEach((f) => f(time, dt));
  late.forEach((f) => f(time, dt));
});
gsap.ticker.lagSmoothing(0);
