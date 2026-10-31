// Adaptive quality theo tần số màn hình THẬT (V5-perf mục g). Bản cũ giả định 60 Hz (hạ khi < 48 fps, nâng khi > 58,
// trung bình 1 s) nên trên màn 120/144 Hz không bao giờ phản ứng với giật ở 70–90 fps.
//
// - Tần số: calibrateRefresh() đo trung vị rAF delta ~24 frame lúc preloader còn che màn hình và stage tạm dừng
//   (trang rảnh → đúng nhịp vsync); lưu sessionStorage. Đo lại (p5 của 120 frame) khi tab hiện lại / cửa sổ đổi kích
//   thước hoặc đổi màn hình (matchMedia độ phân giải).
// - Điều khiển: p90 frame time trượt trong 0.5 s, đánh giá mỗi 0.25 s.
//     hạ  1 bậc (0.125) khi p90 > 1.2 × chu kỳ liên tục 0.5 s;
//     nâng 1 bậc khi p90 ≤ 1.08 × chu kỳ liên tục 3 s (rAF khoá theo vsync nên khoảng cách frame không thể < chu kỳ —
//     "< 0.85×" chỉ đo được trên thời gian làm việc, không phải khoảng cách frame; xem DECISIONS [v5-perf]);
//     hysteresis: lần nâng bị hạ lại ngay (< 2 s) → thời gian chờ nâng tiếp nhân đôi (tối đa 30 s) → không dao động.
// - Thứ tự hạ: độ phân giải render scene của stage (quality 1 → 0.5) → bậc "lite" (tắt lớp không thiết yếu: hạt dock).
// - Không "pop": state.stageScale đuổi theo state.quality bằng damp (~0.4 s); canvas stage giữ nguyên kích thước,
//   chỉ viewport render scene đổi → không cấp phát lại texture.
import { onTick } from "./loop";
import { state } from "./state";
import { damp, clamp } from "./math";

const STEP = 0.125, MIN = 0.5;
const KEY = "nns:refresh-ms";
const N = 512;
const T = new Float64Array(N), D = new Float32Array(N), tmp = new Float32Array(N);
let head = 0, count = 0;
let started = false, lastEval = 0, badFor = 0, goodFor = 0, lastDown = -1e9, lastUp = -1e9, upHold = 3;

/** số liệu cho HUD / verify */
export const qstats = { p90: 0, refreshHz: 60 };

function setRefresh(ms: number) {
  state.refreshMs = clamp(ms, 4, 50);
  qstats.refreshHz = 1000 / state.refreshMs;
  try { sessionStorage.setItem(KEY, state.refreshMs.toFixed(3)); } catch { /* storage bị chặn */ }
}

function sample(n: number) {
  return new Promise<number[]>((res) => {
    const d: number[] = [];
    let last = 0;
    const f = (t: number) => { if (last) d.push(t - last); last = t; if (d.length < n) requestAnimationFrame(f); else res(d); };
    requestAnimationFrame(f);
  });
}
const pick = (d: number[], p: number) => [...d].sort((a, b) => a - b)[Math.floor((d.length - 1) * p)];

/** đo chu kỳ làm tươi khi trang rảnh (gọi lúc preloader còn che; pause: tạm dừng stage để không tốn GPU) */
export async function calibrateRefresh(pause: (on: boolean) => void) {
  let saved = 0;
  try { saved = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* storage bị chặn */ }
  if (saved) { setRefresh(saved); return; }
  pause(true);
  const d = await sample(24);
  pause(false);
  setRefresh(pick(d, 0.5));
}

/** đo lại không dừng gì (p5 của 120 frame: các frame nhanh nhất ≈ nhịp vsync) */
async function redetect() {
  const d = await sample(120);
  const p5 = pick(d, 0.05);
  if (Math.abs(p5 - state.refreshMs) / state.refreshMs > 0.2) setRefresh(p5);
}
addEventListener("visibilitychange", () => { if (!document.hidden && started) redetect(); });
addEventListener("resize", () => { if (started) redetect(); });
try { matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener("change", () => started && redetect()); } catch { /* cũ */ }

/** bắt đầu điều khiển sau preloader (pha tải có long task biên dịch shader → không tính) */
export function startQuality() { started = true; lastEval = state.time; }

function setQuality(q: number) {
  state.quality = q;
  const v = q.toFixed(2);
  if (document.documentElement.dataset.quality !== v) document.documentElement.dataset.quality = v;
}

onTick((time, dt) => {
  // độ phân giải stage đổi mượt về mức quality (không pop)
  state.stageScale = Math.abs(state.stageScale - state.quality) < 0.002 ? state.quality : damp(state.stageScale, state.quality, 6, dt);
  if (!started || document.hidden) return;
  T[head] = time; D[head] = dt * 1000; head = (head + 1) % N; count = Math.min(N, count + 1);
  if (time - lastEval < 0.25) return;
  lastEval = time;

  // p90 trong 0.5 s gần nhất
  let n = 0;
  for (let i = 0, k = head; i < count; i++) {
    k = (k - 1 + N) % N;
    if (time - T[k] > 0.5) break;
    tmp[n++] = D[k];
  }
  if (n < 4) return;
  const w = tmp.subarray(0, n).sort();
  const p90 = w[Math.min(n - 1, Math.floor(n * 0.9))];
  qstats.p90 = p90;
  state.fps = 1000 / w[Math.floor(n / 2)];
  const r = state.refreshMs;

  if (p90 > r * 1.2) { badFor += 0.25; goodFor = 0; }
  else if (p90 <= r * 1.08) { goodFor += 0.25; badFor = 0; }
  else { badFor = 0; goodFor = 0; }

  if (badFor >= 0.5 && time - lastDown >= 0.5) {
    if (time - lastUp < 2) upHold = Math.min(30, upHold * 2);        // vừa nâng đã trễ → chờ lâu hơn trước lần nâng sau
    if (state.quality > MIN) setQuality(Math.max(MIN, state.quality - STEP));
    else if (!state.lite && badFor >= 2) state.lite = true;          // đã ở đáy 2 s mà vẫn trễ → tắt lớp không thiết yếu
    lastDown = time; badFor = badFor >= 2 ? 0 : badFor;
  } else if (goodFor >= upHold && time - lastDown >= upHold) {
    if (state.lite) state.lite = false;
    else if (state.quality < 1) setQuality(Math.min(1, state.quality + STEP));
    lastUp = time; goodFor = 0;
  }
}, "early");
setQuality(state.quality);
