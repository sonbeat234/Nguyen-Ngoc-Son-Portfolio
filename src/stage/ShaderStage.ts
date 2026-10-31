import { state } from "../core/state";
import { clamp, smoothstep } from "../core/math";
import { COMPOSITE_FRAG, FROST_MIX_FRAG, FROST_BLUR_FRAG } from "./composite";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type UVal = number | number[];
export type MouseMode = "unit" | "ndc" | "pxDown";

export type SceneDef = {
  id: string;
  frag: string;
  uniforms?: Record<string, UVal>;
  /** quy ước chuột của shader gốc: unit 0..1 (y lên), ndc -1..1, pxDown = pixel y xuống */
  mouse?: MouseMode;
  timeScale?: number;
  /** <1 = render ở độ phân giải thấp hơn (raymarch nặng) */
  resScale?: number;
  /** map tiến độ scroll của section → uniform riêng của shader */
  onProgress?: (p: number, set: (name: string, v: UVal) => void) => void;
  edge?: [number, number, number];
  /** recolor trong composite cho shader không có uniform màu (vendor): lo/hi theo accent, amount 0..1 */
  tint?: { lo: [number, number, number]; hi: [number, number, number]; amount: number };
};

type Program = {
  prog: WebGLProgram; locs: Map<string, WebGLUniformLocation | null>;
  /** còn chờ kiểm tra trạng thái link (biên dịch song song) */
  pending?: { vs: WebGLShader; fs: WebGLShader; src: string };
};
// EXT_disjoint_timer_query (WebGL1) — khai báo tối thiểu, chỉ dùng khi ?debug / ?perf
type WebGLQueryEXT = object;
type TimerExt = {
  TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number; QUERY_RESULT_EXT: number; QUERY_RESULT_AVAILABLE_EXT: number;
  createQueryEXT(): WebGLQueryEXT | null;
  beginQueryEXT(target: number, q: WebGLQueryEXT): void;
  endQueryEXT(target: number): void;
  getQueryObjectEXT(q: WebGLQueryEXT, pname: number): number | boolean;
};
type Runtime = {
  def: SceneDef; order: number; program?: Program;
  values: Record<string, UVal>;
  weight: number; progress: number; el?: HTMLElement; forced?: number;
  /** toạ độ tài liệu của section (px) — đo lại khi đổi kích thước / ScrollTrigger refresh, KHÔNG đọc mỗi frame */
  top: number; height: number;
};
type Target = { fb: WebGLFramebuffer; tex: WebGLTexture };

const VERT = `attribute vec2 a_pos;
varying vec2 vUv;
void main(){ vUv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const ALIAS = {
  time: ["u_time", "uTime", "time", "uT"],
  res: ["u_resolution", "uResolution", "resolution", "u_res", "uRes", "uR"],
  mouse: ["u_mouse", "uMouse", "pointer", "u_pointer"],
};


export class ShaderStage {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private quad: WebGLBuffer;
  private programs = new Map<string, Program>();
  private scenes = new Map<string, Runtime>();
  private targets: Target[];
  private composite: Program;
  private W = 0;
  private H = 0;
  bg: [number, number, number] = [0.02, 0.02, 0.026];
  /** 0..1: nhiễu dải ngang + RGB split mạnh hơn (chương Signal Lost) */
  glitch = 0;
  /** vùng chữ cần làm tối nền (px CSS, y xuống: left top right bottom) — fx/ui/shield.ts ghi ở tick "early" */
  readonly shields = new Float32Array(24);
  shieldN = 0;
  private shieldPx = new Float32Array(24);
  /**
   * khung kính (fx/ui/frost.ts ghi ở tick "early"): rect px CSS (left top right bottom, y xuống) + tham số
   * (bán kính góc px CSS, độ mạnh 0..1, bão hoà). Thay cho CSS backdrop-filter trên canvas sống (V5-perf mục b).
   */
  readonly frost = new Float32Array(32);
  readonly frostP = new Float32Array(32);
  frostN = 0;
  private frostPx = new Float32Array(32);
  private frostPpx = new Float32Array(32);
  private small: Target[] = [];
  private sw = 1;
  private sh = 1;
  private frostMix!: Program;
  private frostBlur!: Program;
  /** biên độ grain (nền, theo độ sáng) — composite; lớp .grain DOM đã bỏ */
  grain: [number, number] = [0.03, 0.05];
  /** sao nền trong composite (thay canvas #ambient): độ dịch tích luỹ px CSS */
  private starShift = 0;
  /** debug: scene A/B, mix và số draw call của frame gần nhất */
  last = { a: "", b: "", mix: 0, draws: 0, w: 0, h: 0 };
  /** ?debug / ?perf: thời gian GPU của một lần render() (ms, EXT_disjoint_timer_query); -1 = không đo được */
  gpuMs = -1;
  /** ?perf: [performance.now(), gpu ms] của các frame gần đây (verify.mjs --perf đọc theo đoạn) */
  readonly gpuLog: [number, number][] = [];
  private timer: { ext: TimerExt; free: WebGLQueryEXT[]; busy: [WebGLQueryEXT, number][] } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.composite = this.program(COMPOSITE_FRAG);
    this.frostMix = this.program(FROST_MIX_FRAG);
    this.frostBlur = this.program(FROST_BLUR_FRAG);
    this.targets = [this.createTarget(), this.createTarget()];
    this.small = [this.createTarget(), this.createTarget()];
    canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
    canvas.addEventListener("webglcontextrestored", () => location.reload());
    this.readCssSize();
    addEventListener("resize", () => { this.readCssSize(); this.geometry(); });
    ScrollTrigger.addEventListener("refresh", () => this.geometry());
    this.resize();
    if (state.debug || state.perf) {
      const ext = gl.getExtension("EXT_disjoint_timer_query") as unknown as TimerExt | null;
      if (ext) this.timer = { ext, free: [], busy: [] };
    }
  }

  /** thu kết quả query của các frame trước (không chặn), rồi mở query cho frame này */
  private beginTimer(): WebGLQueryEXT | null {
    const t = this.timer;
    if (!t) return null;
    const e = t.ext;
    const disjoint = this.gl.getParameter(e.GPU_DISJOINT_EXT);
    while (t.busy.length) {
      const [q, at] = t.busy[0];
      if (!e.getQueryObjectEXT(q, e.QUERY_RESULT_AVAILABLE_EXT)) break;
      t.busy.shift();
      if (!disjoint) {
        this.gpuMs = (e.getQueryObjectEXT(q, e.QUERY_RESULT_EXT) as number) / 1e6;
        this.gpuLog.push([at, this.gpuMs]);
        if (this.gpuLog.length > 20000) this.gpuLog.splice(0, 10000);
      }
      t.free.push(q);
    }
    if (t.busy.length > 8) return null;
    const q = t.free.pop() ?? e.createQueryEXT();
    if (q) e.beginQueryEXT(e.TIME_ELAPSED_EXT, q);
    return q;
  }
  private endTimer(q: WebGLQueryEXT | null) {
    if (!q || !this.timer) return;
    this.timer.ext.endQueryEXT(this.timer.ext.TIME_ELAPSED_EXT);
    this.timer.busy.push([q, performance.now()]);
  }

  add(def: SceneDef) {
    this.scenes.set(def.id, { def, order: this.scenes.size, values: { ...(def.uniforms ?? {}) }, weight: 0, progress: 0, top: 0, height: 0 });
  }
  /** gắn scene vào section: weight tự tính theo coverage (toạ độ section cache lại, đo lại khi nó đổi kích thước) */
  bind(el: HTMLElement, id: string) {
    const s = this.scenes.get(id);
    if (!s) return;
    s.el = el;
    this.ro.observe(el);
    this.geometry();
  }
  /** V5-perf: đọc layout CHỈ khi hình học đổi (ResizeObserver chạy sau layout, refresh của ScrollTrigger, resize) */
  private ro = new ResizeObserver(() => this.geometry());
  geometry() {
    const y = window.scrollY;
    for (const s of this.scenes.values()) {
      if (!s.el) continue;
      const r = s.el.getBoundingClientRect();
      s.top = r.top + y; s.height = r.height;
    }
  }
  /** scene không gắn element (vd 4 panel laser): section tự set weight/progress */
  setWeight(id: string, w: number, progress?: number) {
    const s = this.scenes.get(id);
    if (!s) return;
    s.weight = w;
    if (progress !== undefined) s.progress = progress;
  }
  /** menu preview: ép 1 scene lên toàn màn (null = trả lại bình thường) */
  force(id: string | null) { this.scenes.forEach((s) => (s.forced = s.def.id === id ? 1 : undefined)); }
  set(id: string, name: string, v: UVal) { const s = this.scenes.get(id); if (s) s.values[name] = v; }
  get ids() { return [...this.scenes.keys()]; }

  /** compile + vẽ thử mọi scene trong preloader để không giật khi scene xuất hiện lần đầu */
  async prewarm(onStep?: (done: number, total: number, id: string) => void) {
    // V5-perf (f): KHR_parallel_shader_compile — phát lệnh compile + link cho MỌI scene trước (không hỏi trạng thái →
    // không chặn main thread), rồi qua từng frame chờ COMPLETION_STATUS_KHR; xong thì vẽ thử một lần ở 10% (đẩy
    // phần biên dịch phía driver vào pha tải). Không có extension: trình tự cũ, mỗi program một frame.
    const gl = this.gl;
    const ext = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
    const list = [...this.scenes.values()].map((s) => ({ s, p: this.startProgram(s.def.frag), ready: false }));
    let done = 0;
    while (done < list.length) {
      for (const it of list) {
        if (it.ready) continue;
        if (ext && !gl.getProgramParameter(it.p.prog, ext.COMPLETION_STATUS_KHR)) continue;
        this.checkProgram(it.p);
        it.s.program = it.p; it.ready = true; done++;
        this.drawScene(it.s, this.targets[0], 0.1);
        onStep?.(done, list.length, it.s.def.id);
        if (!ext) break;                         // không song song: mỗi frame một program như cũ
      }
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  /**
   * tick "early": weight/progress của từng scene từ toạ độ section đã cache + vị trí cuộn của Lenis — KHÔNG đọc
   * layout mỗi frame (V5-perf: tween/ScrollTrigger đã ghi DOM trước tick này nên getBoundingClientRect / clientWidth
   * ở đây ép style + layout đồng bộ; trace đo ra 0.65–2.3 s/đoạn trong ShaderStage.resize).
   */
  measure() {
    this.resize();
    const vh = state.h, y = state.scroll.y;
    for (const s of this.scenes.values()) {
      if (!s.el) continue;
      const top = s.top - y, bottom = top + s.height;
      s.weight = Math.max(0, Math.min(bottom, vh) - Math.max(top, 0)) / vh;
      s.progress = clamp(-top / Math.max(1, s.height - vh));
    }
  }

  /** quality.calibrateRefresh(): dừng vẽ vài frame lúc preloader còn che để đo đúng nhịp vsync */
  paused = false;

  render() {
    if (this.paused) return;
    // chọn ≤ 2 scene nặng nhất, sắp theo thứ tự trang (giữ dissolve ổn định khi đổi bên trội) — không cấp phát
    let forced: Runtime | undefined, s1: Runtime | undefined, s2: Runtime | undefined;
    for (const s of this.scenes.values()) {
      if (s.forced) { forced = s; break; }
      if (s.weight <= 0.002) continue;
      if (!s1 || s.weight > s1.weight) { s2 = s1; s1 = s; } else if (!s2 || s.weight > s2.weight) s2 = s;
    }
    let A = forced ?? s1, B = forced ? undefined : s2;
    if (A && B && B.order < A.order) { const t = A; A = B; B = t; }
    const sum = forced ? 1 : (A?.weight ?? 0) + (B?.weight ?? 0);
    let mix = B ? smoothstep(0.22, 0.78, B.weight / sum) : 0;
    // V5-perf (h): scene không đóng góp (mix ≈ 0 / ≈ 1) thì không vẽ; đang dissolve thật thì vẽ A và B ở độ phân giải
    // giảm dần tới 0.7 ở giữa quãng (đổi mượt theo mix, không nhảy) rồi composite phóng lên — dissolve không còn là
    // frame nặng nhất trang.
    if (B && mix <= 0.001) { B = undefined; mix = 0; }
    else if (B && mix >= 0.999) { A = B; B = undefined; mix = 0; }
    const ds = B ? 1 - 0.3 * smoothstep(0, 0.3, Math.min(mix, 1 - mix)) : 1;
    // độ phân giải scene: resScale của scene × dissolve × stageScale (adaptive quality, đổi mượt — core/quality.ts)
    const q = state.stageScale;
    const sA = (A?.def.resScale ?? 1) * ds * q, sB = (B?.def.resScale ?? 1) * ds * q;
    let draws = 0;
    const query = this.beginTimer();

    // 3) render scene
    if (A) { this.drawScene(A, this.targets[0], sA); draws++; }
    if (B) { this.drawScene(B, this.targets[1], sB); draws++; }
    // 3b) kính: trộn A/B xuống 1/4 + blur 2 lượt (chỉ khi có khung kính đang hiện)
    const frost = this.frostN > 0 && !!A && !state.legacyfx;
    if (frost) { this.frostPasses(A!, B, sA, sB, mix); draws += 3; }

    // 4) composite
    const gl = this.gl, c = this.composite;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(c.prog);
    this.bindQuad();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.targets[0].tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.targets[1].tex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.small[0].tex);
    gl.uniform1i(this.loc(c, "u_a"), 0);
    gl.uniform1i(this.loc(c, "u_b"), 1);
    gl.uniform1i(this.loc(c, "u_blur"), 2);
    this.sceneUniforms(c, A, B, sA, sB, mix);
    this.setU(c, "u_level", A ? Math.min(1, sum * 1.15) : 0);
    this.setU(c, "u_vel", state.reduced ? 0 : state.scroll.smooth);
    this.setU(c, "u_glitch", state.reduced ? 0 : this.glitch);
    this.setU(c, "u_bg", this.bg);
    this.setU(c, "u_grain", state.legacyfx ? [0.032, 0] : this.grain);
    // sao nền: độ dịch tích luỹ như canvas cũ (0.01–0.03 px/frame@60 × (1 + |v|·60), theo hướng cuộn), mỗi frame
    if (!state.legacyfx) {
      this.starShift += 60 * state.dt * (1 + Math.abs(state.scroll.smooth) * 60) * (state.reduced ? 0.25 : 1) * state.scroll.direction;
    }
    this.setU(c, "u_starShift", this.starShift);
    this.setU(c, "u_starA", state.legacyfx ? 0 : 0.55);
    this.setU(c, "u_css", this.W / Math.max(1, this.cssW));
    // viền dissolve = accent2 của scene đích (scene sau theo thứ tự trang)
    this.setU(c, "u_edge", (B ?? A)?.def.edge ?? [0.55, 0.75, 1.0]);
    // shield + kính: đổi px CSS (y xuống) → px stage (y lên)
    const sx = this.W / Math.max(1, this.cssW), sy = this.H / Math.max(1, this.cssH);
    for (let i = 0; i < this.shieldN; i++) {
      const k = i * 4, s = this.shields, o = this.shieldPx;
      o[k] = s[k] * sx; o[k + 1] = this.H - s[k + 3] * sy; o[k + 2] = s[k + 2] * sx; o[k + 3] = this.H - s[k + 1] * sy;
    }
    const shLoc = this.loc(c, "u_shield[0]");
    if (shLoc) gl.uniform4fv(shLoc, this.shieldPx);
    this.setU(c, "u_shieldN", this.shieldN);
    const fN = frost ? this.frostN : 0;
    for (let i = 0; i < fN; i++) {
      const k = i * 4, s = this.frost, o = this.frostPx, p = this.frostP, q = this.frostPpx;
      o[k] = s[k] * sx; o[k + 1] = this.H - s[k + 3] * sy; o[k + 2] = s[k + 2] * sx; o[k + 3] = this.H - s[k + 1] * sy;
      q[k] = p[k] * sx; q[k + 1] = p[k + 1]; q[k + 2] = p[k + 2]; q[k + 3] = 0;
    }
    const frLoc = this.loc(c, "u_frost[0]"), fpLoc = this.loc(c, "u_frostP[0]");
    if (frLoc) gl.uniform4fv(frLoc, this.frostPx);
    if (fpLoc) gl.uniform4fv(fpLoc, this.frostPpx);
    this.setU(c, "u_frostN", fN);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    draws++;
    // gỡ texture để frame sau render vào FBO không dính feedback loop
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
    this.endTimer(query);
    const l = this.last;
    l.a = A?.def.id ?? ""; l.b = B?.def.id ?? ""; l.mix = mix; l.draws = draws; l.w = this.W; l.h = this.H;
  }

  /** uniform chung của composite + pass trộn kính (cùng scene, cùng mask dissolve) */
  private sceneUniforms(p: Program, A: Runtime | undefined, B: Runtime | undefined, sA: number, sB: number, mix: number) {
    this.setU(p, "u_res", [this.W, this.H]);
    this.setU(p, "u_scaleA", sA);
    this.setU(p, "u_scaleB", sB);
    this.setU(p, "u_hasB", B ? 1 : 0);
    this.setU(p, "u_mix", mix);
    this.setU(p, "u_time", state.time);
    const tA = A?.def.tint, tB = B?.def.tint;
    this.setU(p, "u_tintLoA", tA?.lo ?? [0, 0, 0]); this.setU(p, "u_tintHiA", tA?.hi ?? [1, 1, 1]); this.setU(p, "u_tintAmtA", tA?.amount ?? 0);
    this.setU(p, "u_tintLoB", tB?.lo ?? [0, 0, 0]); this.setU(p, "u_tintHiB", tB?.hi ?? [1, 1, 1]); this.setU(p, "u_tintAmtB", tB?.amount ?? 0);
  }

  /** kính: trộn A/B → target 1/4 (small[0]) → blur ngang (small[1]) → blur dọc (small[0]) */
  private frostPasses(A: Runtime, B: Runtime | undefined, sA: number, sB: number, mix: number) {
    const gl = this.gl, m = this.frostMix, b = this.frostBlur;
    gl.viewport(0, 0, this.sw, this.sh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.small[0].fb);
    gl.useProgram(m.prog);
    this.bindQuad();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.targets[0].tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.targets[1].tex);
    gl.uniform1i(this.loc(m, "u_a"), 0);
    gl.uniform1i(this.loc(m, "u_b"), 1);
    this.sceneUniforms(m, A, B, sA, sB, mix);
    this.setU(m, "u_small", [this.sw, this.sh]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.useProgram(b.prog);
    this.bindQuad();
    gl.uniform1i(this.loc(b, "u_src"), 0);
    this.setU(b, "u_small", [this.sw, this.sh]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.small[1].fb);
    gl.bindTexture(gl.TEXTURE_2D, this.small[0].tex);
    this.setU(b, "u_dir", [1, 0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.small[0].fb);
    gl.bindTexture(gl.TEXTURE_2D, this.small[1].tex);
    this.setU(b, "u_dir", [0, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private drawScene(s: Runtime, t: Target, scale: number) {
    const gl = this.gl;
    const p = (s.program ??= this.program(s.def.frag));
    const w = Math.max(1, Math.round(this.W * scale));
    const h = Math.max(1, Math.round(this.H * scale));
    s.def.onProgress?.(s.progress, (n, v) => (s.values[n] = v));

    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);                                // shader trả alpha (orb, dot matrix) phủ lên nền
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(p.prog);
    this.bindQuad();

    const m = state.mouse, d = s.def;
    const mouse =
      d.mouse === "ndc" ? [m.nx, m.ny]
      : d.mouse === "pxDown" ? [(m.sx / state.w) * w, (m.sy / state.h) * h]
      : [m.sx / state.w, 1 - m.sy / state.h];
    const time = state.time * (d.timeScale ?? 1) * (state.reduced ? 0.25 : 1);
    for (const n of ALIAS.time) this.setU(p, n, time);
    for (const n of ALIAS.res) this.setU(p, n, [w, h]);
    for (const n of ALIAS.mouse) this.setU(p, n, mouse);
    this.setU(p, "u_progress", s.progress);
    this.setU(p, "u_velocity", state.scroll.smooth);
    this.setU(p, "u_dpr", Math.min(devicePixelRatio || 1, 1.5) * scale);   // scale đã gồm stageScale
    for (const k in s.values) this.setU(p, k, s.values[k]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
  }

  /** kích thước CSS của canvas (100vw × 100lvh) — chỉ đọc khi cửa sổ đổi kích thước */
  private cssW = 1;
  private cssH = 1;
  private readCssSize() { this.cssW = this.canvas.clientWidth || window.innerWidth; this.cssH = this.canvas.clientHeight || window.innerHeight; }

  private resize() {
    // canvas giữ kích thước theo DPR (không theo quality) → đổi quality không cấp phát lại texture, không pop
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = Math.max(1, Math.round(this.cssW * dpr));
    const H = Math.max(1, Math.round(this.cssH * dpr));
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H;
    this.canvas.width = W; this.canvas.height = H;
    const gl = this.gl;
    for (const t of this.targets) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    // target 1/4 cho kính (blur trên ảnh nhỏ: 3 pass ~ 1/16 số pixel màn hình)
    this.sw = Math.max(1, Math.ceil(W / 4)); this.sh = Math.max(1, Math.ceil(H / 4));
    for (const t of this.small) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.sw, this.sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private createTarget(): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { fb, tex };
  }

  /** compile + link nhưng KHÔNG hỏi trạng thái (với KHR_parallel_shader_compile, driver biên dịch nền) */
  private startProgram(frag: string): Program {
    const cached = this.programs.get(frag);
    if (cached) return cached;
    const gl = this.gl;
    // shader viết cho THREE.ShaderMaterial không có dòng precision → tự thêm
    const src = /precision\s+\w+\s+float/.test(frag) ? frag : `precision highp float;\n${frag}`;
    const prog = gl.createProgram()!;
    const vs = gl.createShader(gl.VERTEX_SHADER)!, fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(vs, VERT); gl.compileShader(vs);
    gl.shaderSource(fs, src); gl.compileShader(fs);
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a_pos");
    gl.linkProgram(prog);
    const p: Program = { prog, locs: new Map(), pending: { vs, fs, src } };
    this.programs.set(frag, p);
    return p;
  }
  /** hỏi trạng thái link (chặn nếu driver chưa xong) — lỗi thì ném kèm log shader như trước */
  private checkProgram(p: Program) {
    if (!p.pending) return;
    const gl = this.gl, { vs, fs, src } = p.pending;
    p.pending = undefined;
    if (!gl.getProgramParameter(p.prog, gl.LINK_STATUS)) {
      const log = gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(p.prog) || "link failed";
      throw new Error(`${log}\n----\n${src.slice(0, 400)}`);
    }
  }
  private program(frag: string): Program {
    const p = this.startProgram(frag);
    this.checkProgram(p);
    return p;
  }
  private bindQuad() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  private loc(p: Program, name: string) {
    if (!p.locs.has(name)) p.locs.set(name, this.gl.getUniformLocation(p.prog, name));
    return p.locs.get(name)!;
  }
  private setU(p: Program, name: string, v: UVal) {
    const l = this.loc(p, name);
    if (!l) return;
    const gl = this.gl;
    if (typeof v === "number") gl.uniform1f(l, v);
    else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
    else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
    else gl.uniform4f(l, v[0], v[1], v[2], v[3]);
  }
}
