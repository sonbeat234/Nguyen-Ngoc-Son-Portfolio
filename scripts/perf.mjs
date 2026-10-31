// verify.mjs --perf: đo hiệu năng theo từng đoạn chuyển cảnh trên GPU THẬT (ANGLE D3D11, Chromium headless mới).
//
//   node scripts/verify.mjs --perf [--port 4191] [--out verify-perf] [--segments a,b] [--passes vsync,uncapped]
//                                  [--trace 3] [--dpr 1.25] [--size 1536x864]
//
// Hai lượt: (a) vsync — thứ người dùng thấy (headless mới bám tần số màn hình: 144 Hz trên laptop này);
//           (b) uncapped — --disable-gpu-vsync --disable-frame-rate-limit, đo khoảng dư (headroom).
// Trong trang (addInitScript): rAF được bọc để ghi thời điểm mỗi frame + tổng thời gian JS trong rAF của frame đó,
// PerformanceObserver longtask + long-animation-frame (LoAF, có script attribution). GPU ms của stage lấy từ
// window.__signal.stage.gpuLog (?perf bật EXT_disjoint_timer_query). Sau 2 lượt: chạy lại (vsync) và ghi Chrome trace
// quanh N đoạn tệ nhất, phân tích self-time trên CrRendererMain (Style / Layout / Paint / Composite / Script),
// raster và GPU process. Kết quả: <out>/perf.json, <out>/perf.md, <out>/trace-*.json.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const GPU_ARGS = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"];
const UNCAP_ARGS = ["--disable-gpu-vsync", "--disable-frame-rate-limit"];
const TRACE_CATS = [
  "devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame",
  "toplevel", "blink.user_timing", "gpu", "viz", "cc", "benchmark", "v8.execute", "disabled-by-default-v8.cpu_profiler",
];

// ---------------------------------------------------------------- trong trang
function INIT() {
  // vòng rAF riêng chỉ ghi thời điểm frame (KHÔNG bọc rAF của trang — bọc sẽ khiến LoAF quy mọi script về hàm bọc)
  const P = (window.__perf = { frames: [], lt: [], loaf: [] });
  const loop = (t) => { P.frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) P.lt.push([e.startTime, e.duration]); })
      .observe({ type: "longtask", buffered: true });
  } catch { /* không hỗ trợ */ }
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) P.loaf.push({
        t: e.startTime, d: e.duration, b: e.blockingDuration,
        s: e.scripts.map((x) => ({ d: Math.round(x.duration), inv: x.invoker, fn: x.sourceFunctionName, src: `${(x.sourceURL || "").split("/").pop()}:${x.sourceCharPosition}` })),
      });
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch { /* không hỗ trợ */ }
}

// ---------------------------------------------------------------- thống kê
const q = (arr, p) => { if (!arr.length) return NaN; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * (a.length - 1) + 0.5))]; };
const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);

function stats(perf, gpuLog, tickLog, s, e, interval) {
  const idx = [];
  perf.frames.forEach((t, i) => { if (t >= s && t <= e) idx.push(i); });
  const deltas = [];
  for (let k = 1; k < idx.length; k++) {
    if (idx[k] !== idx[k - 1] + 1) continue;
    deltas.push(perf.frames[idx[k]] - perf.frames[idx[k - 1]]);
  }
  // JS mỗi frame của site (Lenis + tween + mọi onTick) — core/loop.ts perfHook
  const work = tickLog.filter(([t]) => t >= s && t <= e).map(([, v]) => v);
  const lts = perf.lt.filter(([t, d]) => t + d >= s && t <= e && d > 50);
  const loafs = perf.loaf.filter((l) => l.t + l.d >= s && l.t <= e).sort((a, b) => b.d - a.d);
  const worst = loafs[0];
  const top = worst?.s?.sort((a, b) => b.d - a.d)[0];
  const gpu = gpuLog.filter(([t]) => t >= s && t <= e).map(([, v]) => v);
  const med = q(deltas, 0.5);
  return {
    frames: deltas.length,
    medianFps: r1(1000 / med),
    medianMs: r1(med), p95Ms: r1(q(deltas, 0.95)), p99Ms: r1(q(deltas, 0.99)), maxMs: r1(Math.max(0, ...deltas)),
    dropped: interval ? deltas.filter((d) => d > interval * 1.5).length : null,
    rafJsP95Ms: r1(q(work, 0.95)), rafJsMaxMs: r1(Math.max(0, ...work)),
    longTasks: lts.length, longTaskMaxMs: r1(Math.max(0, ...lts.map(([, d]) => d))),
    worstLoafMs: r1(worst?.d ?? 0), worstLoafScript: top ? `${top.inv || top.fn} @ ${top.src} (${top.d}ms)` : "",
    gpuMedMs: r1(q(gpu, 0.5)), gpuP95Ms: r1(q(gpu, 0.95)),
  };
}

// ---------------------------------------------------------------- kịch bản
const wait = (page, ms) => page.waitForTimeout(ms);
const ready = (page) => page.waitForFunction(() => { const p = document.querySelector(".preloader"); return !p || getComputedStyle(p).display === "none"; }, null, { timeout: 120000 });
/** cuộn có thời lượng qua Lenis (giống cuộn thật: easing, mọi ScrollTrigger + dissolve chạy) */
async function scrollTo(page, expr, duration) {
  await page.evaluate(([expr, duration]) => {
    const y = new Function(`return (${expr})`)();
    window.__lenis.scrollTo(y, { duration, force: true, easing: (t) => 1 - Math.pow(1 - t, 3) });
  }, [expr, duration]);
  await wait(page, duration * 1000 + 350);
}
const top = (id, off = 0) => `scrollY + document.getElementById("${id}").getBoundingClientRect().top + innerHeight * ${off}`;

const SEGMENTS = [
  ["preloader-hero-intro", null],   // đặc biệt: cửa sổ = preloader:loaded → preloader:done + 3.2 s (đo trong lúc tải trang)
  ["hero-idle-mouse", async (page) => {
    const r = await page.$eval(".hero-name", (e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    for (let i = 0; i < 200; i++) {
      const a = i / 200 * Math.PI * 4;
      await page.mouse.move(r.x + r.w * (0.5 + 0.45 * Math.sin(a)), r.y + r.h * (0.5 + 0.4 * Math.sin(a * 1.7)));
      await wait(page, 14);
    }
  }],
  ["hero-to-about", (page) => scrollTo(page, top("about", 0), 1.8)],
  ["about-to-flow-hpin", (page) => scrollTo(page, `${top("flow", 0)} + document.getElementById("flow").offsetHeight - innerHeight`, 4.0)],
  ["flow-to-projects", (page) => scrollTo(page, top("projects", 0.25), 1.8)],
  ["card-open-flip", async (page) => { await page.click(".pcard .pc-hit"); await wait(page, 1900); }],
  ["book-turns-drag", async (page) => {
    const mode = await page.evaluate(() => document.getElementById("project-view").dataset.mode);
    for (const k of ["ArrowRight", "ArrowRight", "ArrowLeft"]) { await page.keyboard.press(k); await wait(page, 1100); }
    if (mode !== "book") return;
    const c = await page.$eval(".pv-corner-next", (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.86 }; });
    const pw = await page.$eval(".pv-spread", (e) => e.getBoundingClientRect().width / 2);
    await page.mouse.move(c.x, c.y); await page.mouse.down();
    for (let k = 1; k <= 40; k++) { await page.mouse.move(c.x - (pw * 0.9 * k) / 40, c.y - k * 1.5); await wait(page, 16); }
    await page.mouse.up(); await wait(page, 1300);
  }],
  ["overlay-close", async (page) => { await page.keyboard.press("Escape"); await wait(page, 1700); }],
  ["projects-to-cv-decode", async (page) => { await scrollTo(page, top("cv", 0.05), 1.8); await wait(page, 1500); }],
  ["cv-to-eol-neon", async (page) => { await scrollTo(page, "document.documentElement.scrollHeight - innerHeight", 2.0); await wait(page, 1800); }],
  ["menu-open-close", async (page) => {
    // ở cuối trang dock tự ẩn (ngoài viewport) → bấm bằng JS, cùng handler click
    await page.evaluate(() => document.querySelector("[data-menu-open]").click()); await wait(page, 1100);
    const links = await page.$$(".menu__link");
    for (const l of links.slice(0, 5)) { await l.hover(); await wait(page, 450); }
    await page.keyboard.press("Escape"); await wait(page, 1100);
  }],
  ["long-fast-scroll", async (page) => {
    await scrollTo(page, "0", 2.4);
    await scrollTo(page, "document.documentElement.scrollHeight - innerHeight", 2.4);
  }],
  ["idle-about", async (page) => {
    await page.evaluate((expr) => window.__lenis.scrollTo(new Function(`return (${expr})`)(), { immediate: true, force: true }), top("about", 0.3));
    await page.mouse.move(5, 5);
    await wait(page, 2500);
  }],
];

// ---------------------------------------------------------------- chạy một lượt
async function pass({ origin, label, args, viewport, dpr, only, trace, outDir }) {
  let browser;
  try { browser = await chromium.launch({ channel: "chromium", args }); }
  catch { browser = await chromium.launch({ args }); console.warn("[perf] channel chromium unavailable → headless shell (60 Hz cap)"); }
  const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(INIT);

  // tần số làm tươi thật: trung vị rAF trên trang trống (đo trong trang site sẽ sai nếu chính trang đang giật)
  const vsyncMs = await page.evaluate(() => new Promise((res) => {
    const d = []; let last = 0;
    const f = (t) => { if (last) d.push(t - last); last = t; if (d.length < 150) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res(d[75]); } };
    requestAnimationFrame(f);
  }));
  const windows = {};
  const traced = {};
  await page.goto(`${origin}/?perf`, { waitUntil: "domcontentloaded" });
  await ready(page);
  await wait(page, 3400);
  windows["preloader-hero-intro"] = await page.evaluate(() => {
    const t = (n) => performance.getEntriesByName(n)[0]?.startTime ?? 0;
    return [t("preloader:loaded") - 100, t("preloader:done") + 3200];
  });

  for (const [name, fn] of SEGMENTS) {
    if (!fn) continue;
    const run = !only.length || only.includes(name);
    const doTrace = trace.includes(name);
    if (doTrace) await browser.startTracing(page, { path: path.join(outDir, `trace-${name}.json`), categories: TRACE_CATS });
    const s = await page.evaluate((n) => { performance.mark(`seg:${n}:start`); return performance.now(); }, name);
    await fn(page);
    const e = await page.evaluate((n) => { performance.mark(`seg:${n}:end`); return performance.now(); }, name);
    if (doTrace) { await browser.stopTracing(); traced[name] = path.join(outDir, `trace-${name}.json`); }
    if (run) windows[name] = [s, e];
  }
  const data = await page.evaluate(() => ({ perf: window.__perf, gpu: window.__signal?.stage?.gpuLog ?? [], tick: window.__signal?.tickLog ?? [], quality: document.documentElement.dataset.quality }));
  await browser.close();

  const interval = label === "uncapped" ? null : vsyncMs;
  const result = { label, refreshHz: interval ? r1(1000 / interval) : null, quality: data.quality, segments: {}, errors };
  for (const [name, [s, e]] of Object.entries(windows)) {
    if (only.length && !only.includes(name)) continue;
    result.segments[name] = stats(data.perf, data.gpu, data.tick, s, e, interval);
  }
  return { result, traced };
}

// ---------------------------------------------------------------- phân tích trace
const GROUP = [
  ["style", /^(UpdateLayoutTree|RecalculateStyles|ScheduleStyleRecalculation|ParseAuthorStyleSheet)$/],
  ["layout", /^(Layout|UpdateLayout|IntersectionObserverController::computeIntersections|ComputeIntersections)$/],
  ["paint", /^(PrePaint|Paint|PaintImage|Layerize|UpdateLayer|PaintSetup|Decode Image|ImageDecodeTask)$/],
  ["composite", /^(Commit|CompositeLayers|UpdateLayerTree|ProxyMain::BeginMainFrame::commit)$/],
  ["script", /^(FunctionCall|FireAnimationFrame|TimerFire|EventDispatch|EvaluateScript|RunMicrotasks|MajorGC|MinorGC|V8\.|v8\.|BlinkGC|FireIdleCallback|HandlePostMessage|ParseHTML|Compile|ScriptEvaluate|CpuProfiler)/],
];
const groupOf = (n) => (GROUP.find(([, re]) => re.test(n)) ?? ["other"])[0];

export function analyzeTrace(file, segName) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const ev = Array.isArray(raw) ? raw : raw.traceEvents;
  const tname = new Map();
  for (const e of ev) if (e.ph === "M" && e.name === "thread_name") tname.set(`${e.pid}:${e.tid}`, e.args.name);
  const marks = ev.filter((e) => e.cat?.includes("blink.user_timing") && (e.name === `seg:${segName}:start` || e.name === `seg:${segName}:end`));
  const sM = marks.find((e) => e.name.endsWith(":start")), eM = marks.find((e) => e.name.endsWith(":end"));
  if (!sM || !eM) return { error: "segment marks not found in trace" };
  const pid = sM.pid, t0 = sM.ts, t1 = eM.ts, ms = (t1 - t0) / 1000;
  const main = [...tname].find(([k, v]) => v === "CrRendererMain" && k.startsWith(`${pid}:`))?.[0];
  const byThread = new Map();
  for (const e of ev) {
    if (e.ts < t0 || e.ts > t1) continue;
    const k = `${e.pid}:${e.tid}`;
    if (!byThread.has(k)) byThread.set(k, []);
    byThread.get(k).push(e);
  }
  // self-time theo tên (X + cặp B/E) — con trừ khỏi cha; busyTop = tổng thời gian các lát cấp cao nhất
  const selfTime = (list) => {
    const xs = [], open = [];
    for (const e of list.sort((a, b) => a.ts - b.ts || (b.dur ?? 0) - (a.dur ?? 0))) {
      if (e.ph === "X" && e.dur != null) xs.push({ name: e.name, ts: e.ts, end: e.ts + e.dur, args: e.args });
      else if (e.ph === "B") open.push(e);
      else if (e.ph === "E") { const b = open.pop(); if (b) xs.push({ name: b.name, ts: b.ts, end: e.ts, args: b.args }); }
    }
    xs.sort((a, b) => a.ts - b.ts || b.end - a.end);
    const self = new Map(), stack = [], fns = new Map();
    let busyTop = 0;
    for (const x of xs) {
      while (stack.length && stack[stack.length - 1].end <= x.ts) stack.pop();
      const parent = stack[stack.length - 1];
      const d = x.end - x.ts;
      if (parent) self.set(parent.name, (self.get(parent.name) ?? 0) - d); else busyTop += d;
      self.set(x.name, (self.get(x.name) ?? 0) + d);
      if (x.name === "FunctionCall" && x.args?.data) {
        const f = `${x.args.data.functionName || "(anon)"} ${(x.args.data.url || "").split("/").pop()}:${x.args.data.lineNumber ?? ""}`;
        fns.set(f, (fns.get(f) ?? 0) + d);
      }
      stack.push(x);
    }
    return { self, busyTop, fns };
  };
  const out = { windowMs: Math.round(ms), mainThread: {}, topEvents: [], topFunctions: [], rasterMs: 0, gpuMainMs: 0, vizMs: 0 };
  if (main && byThread.has(main)) {
    const { self, busyTop, fns } = selfTime(byThread.get(main));
    const groups = {};
    for (const [n, v] of self) groups[groupOf(n)] = (groups[groupOf(n)] ?? 0) + v / 1000;
    out.mainThread = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, r1(v)]));
    out.mainThread.busy = r1(busyTop / 1000);
    out.topEvents = [...self].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, v]) => `${n} ${r1(v / 1000)}ms`);
    out.topFunctions = [...fns].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => `${n} ${r1(v / 1000)}ms (incl.)`);
  }
  for (const [k, list] of byThread) {
    const n = tname.get(k) ?? "";
    if (/CompositorTileWorker|RasterWorker/.test(n)) out.rasterMs += list.filter((e) => e.name === "RasterTask" && e.dur).reduce((a, e) => a + e.dur, 0) / 1000;
    if (n === "CrGpuMain") out.gpuMainMs += selfTime(list).busyTop / 1000;
    if (n === "VizCompositorThread") out.vizMs += selfTime(list).busyTop / 1000;
  }
  out.rasterMs = r1(out.rasterMs); out.gpuMainMs = r1(out.gpuMainMs); out.vizMs = r1(out.vizMs);

  // CPU profiler (ProfileChunk): self-time theo hàm JS thật trong cửa sổ đoạn
  const nodes = new Map(), clock = new Map(), selfF = new Map();
  for (const e of ev.filter((x) => x.pid === pid && (x.name === "Profile" || x.name === "ProfileChunk")).sort((a, b) => a.ts - b.ts)) {
    const d = e.args?.data ?? {};
    if (e.name === "Profile") { clock.set(e.id, d.startTime ?? e.ts); continue; }
    const cp = d.cpuProfile ?? {};
    for (const n of cp.nodes ?? []) nodes.set(`${e.id}:${n.id}`, n);
    const samples = cp.samples ?? [], deltas = d.timeDeltas ?? [];
    let t = clock.get(e.id) ?? e.ts;
    for (let i = 0; i < samples.length; i++) {
      t += deltas[i] ?? 0;
      if (t < t0 || t > t1) continue;
      const cf = nodes.get(`${e.id}:${samples[i]}`)?.callFrame;
      const key = cf ? `${cf.functionName || "(anon)"} ${(cf.url || "").split("/").pop()}:${(cf.lineNumber ?? -1) + 1}` : "?";
      if (/^\(idle\)/.test(key)) continue;
      selfF.set(key, (selfF.get(key) ?? 0) + Math.max(0, deltas[i + 1] ?? deltas[i] ?? 0));
    }
    clock.set(e.id, t);
  }
  out.topSelfFunctions = [...selfF].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, v]) => `${n} ${r1(v / 1000)}ms`);
  return out;
}

// ---------------------------------------------------------------- báo cáo
function table(res, unc) {
  const head = "| segment | median fps | p95 ms | p99 ms | max ms | dropped | rAF JS p95 | long tasks (max) | worst LoAF | GPU med/p95 ms | uncapped fps | uncapped p95 ms |\n|---|---|---|---|---|---|---|---|---|---|---|---|";
  const rows = Object.entries(res.segments).map(([n, s]) => {
    const u = unc?.segments?.[n];
    return `| ${n} | ${s.medianFps} | ${s.p95Ms} | ${s.p99Ms} | ${s.maxMs} | ${s.dropped} | ${s.rafJsP95Ms} | ${s.longTasks} (${s.longTaskMaxMs}) | ${s.worstLoafMs}ms ${s.worstLoafScript ? "— " + s.worstLoafScript.replace(/\|/g, "/") : ""} | ${s.gpuMedMs}/${s.gpuP95Ms} | ${u?.medianFps ?? "–"} | ${u?.p95Ms ?? "–"} |`;
  });
  return [head, ...rows].join("\n");
}

export async function runPerf({ origin, out, only = [], passes = ["vsync", "uncapped"], traceN = 3, viewport = { width: 1536, height: 864 }, dpr = 1.25 }) {
  fs.mkdirSync(out, { recursive: true });
  const res = {};
  for (const label of passes) {
    console.log(`[perf] pass ${label}…`);
    res[label] = (await pass({ origin, label, args: label === "uncapped" ? [...GPU_ARGS, ...UNCAP_ARGS] : GPU_ARGS, viewport, dpr, only, trace: [], outDir: out })).result;
  }
  // đoạn tệ nhất (lượt vsync): nhiều frame rớt nhất, rồi p99 — preloader không trace được (đo lúc tải trang)
  const v = res.vsync;
  const worst = v ? Object.entries(v.segments).filter(([n]) => n !== "preloader-hero-intro")
    .sort((a, b) => (b[1].dropped - a[1].dropped) || (b[1].p99Ms - a[1].p99Ms)).slice(0, traceN).map(([n]) => n) : [];
  const traces = {};
  if (traceN && worst.length) {
    console.log(`[perf] tracing ${worst.join(", ")}…`);
    const tr = await pass({ origin, label: "trace", args: GPU_ARGS, viewport, dpr, only, trace: worst, outDir: out });
    for (const [n, f] of Object.entries(tr.traced)) traces[n] = analyzeTrace(f, n);
  }
  const report = { viewport, dpr, ...res, traces, worst };
  fs.writeFileSync(path.join(out, "perf.json"), JSON.stringify(report, null, 2));
  let md = `# Perf — ${new Date().toISOString()}\n\nViewport ${viewport.width}×${viewport.height} @${dpr}x, ANGLE D3D11 (real GPU), Chromium new headless. Refresh (vsync pass): ${v?.refreshHz ?? "?"} Hz, quality at end: ${v?.quality}.\n\n`;
  if (v) md += `## Segments (vsync pass; uncapped columns from the uncapped pass)\n\n${table(v, res.uncapped)}\n\n`;
  for (const [n, t] of Object.entries(traces)) {
    md += `## Trace: ${n}\n\nwindow ${t.windowMs} ms · main thread (self, ms): ${JSON.stringify(t.mainThread)} · raster ${t.rasterMs} ms · GPU main ${t.gpuMainMs} ms · viz ${t.vizMs} ms\n\n- top events: ${t.topEvents?.join(", ")}\n- top JS self-time (CPU profiler): ${t.topSelfFunctions?.join(", ")}\n\n`;
  }
  const errs = Object.values(res).flatMap((r) => r.errors);
  if (errs.length) md += `## Errors\n\n${errs.map((e) => `- ${e}`).join("\n")}\n`;
  fs.writeFileSync(path.join(out, "perf.md"), md);
  console.log(md);
  return errs.length ? 1 : 0;
}
