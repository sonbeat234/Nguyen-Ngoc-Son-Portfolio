import { state } from "../core/state";
import { clamp, smoothstep } from "../core/math";
import { COMPOSITE_FRAG } from "./composite";

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

type Program = { prog: WebGLProgram; locs: Map<string, WebGLUniformLocation | null> };
type Runtime = {
  def: SceneDef; order: number; program?: Program;
  values: Record<string, UVal>;
  weight: number; progress: number; el?: HTMLElement; forced?: number;
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

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(`${gl.getShaderInfoLog(s)}\n----\n${src.slice(0, 400)}`);
  }
  return s;
}

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
  /** debug: scene A/B, mix và số draw call của frame gần nhất */
  last = { a: "", b: "", mix: 0, draws: 0, w: 0, h: 0 };

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
    this.targets = [this.createTarget(), this.createTarget()];
    canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
    canvas.addEventListener("webglcontextrestored", () => location.reload());
    this.resize();
  }

  add(def: SceneDef) {
    this.scenes.set(def.id, { def, order: this.scenes.size, values: { ...(def.uniforms ?? {}) }, weight: 0, progress: 0 });
  }
  /** gắn scene vào section: weight tự tính theo coverage */
  bind(el: HTMLElement, id: string) { const s = this.scenes.get(id); if (s) s.el = el; }
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
    const list = [...this.scenes.values()];
    for (let i = 0; i < list.length; i++) {
      list[i].program = this.program(list[i].def.frag);
      this.drawScene(list[i], this.targets[0], 0.1);
      this.gl.finish();
      onStep?.(i + 1, list.length, list[i].def.id);
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  /** đọc layout một lượt — gọi ở tick "early", trước mọi lệnh ghi DOM của frame (tránh ép reflow) */
  measure() {
    this.resize();
    const vh = state.h;
    for (const s of this.scenes.values()) {
      if (!s.el) continue;
      const r = s.el.getBoundingClientRect();
      s.weight = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
      s.progress = clamp(-r.top / Math.max(1, r.height - vh));
    }
  }

  render() {
    // chọn ≤ 2 scene, sắp theo thứ tự trang (giữ dissolve ổn định khi đổi bên trội)
    const all = [...this.scenes.values()];
    const forced = all.find((s) => s.forced);
    const active = forced ? [forced] : all
      .filter((s) => s.weight > 0.002)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .sort((a, b) => a.order - b.order);
    const [A, B] = active;
    let draws = 0;

    // 3) render scene
    if (A) { this.drawScene(A, this.targets[0], A.def.resScale ?? 1); draws++; }
    if (B) { this.drawScene(B, this.targets[1], B.def.resScale ?? 1); draws++; }

    // 4) composite
    const gl = this.gl, c = this.composite;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(c.prog);
    this.bindQuad();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.targets[0].tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.targets[1].tex);
    gl.uniform1i(this.loc(c, "u_a"), 0);
    gl.uniform1i(this.loc(c, "u_b"), 1);
    const sum = forced ? 1 : (A?.weight ?? 0) + (B?.weight ?? 0);
    const mix = B ? smoothstep(0.22, 0.78, B.weight / sum) : 0;
    this.setU(c, "u_res", [this.W, this.H]);
    this.setU(c, "u_scaleA", A?.def.resScale ?? 1);
    this.setU(c, "u_scaleB", B?.def.resScale ?? 1);
    this.setU(c, "u_hasB", B ? 1 : 0);
    this.setU(c, "u_mix", mix);
    this.setU(c, "u_level", A ? Math.min(1, sum * 1.15) : 0);
    this.setU(c, "u_time", state.time);
    this.setU(c, "u_vel", state.reduced ? 0 : state.scroll.smooth);
    this.setU(c, "u_glitch", state.reduced ? 0 : this.glitch);
    this.setU(c, "u_bg", this.bg);
    // viền dissolve = accent2 của scene đích (scene sau theo thứ tự trang)
    this.setU(c, "u_edge", (B ?? A)?.def.edge ?? [0.55, 0.75, 1.0]);
    const tA = A?.def.tint, tB = B?.def.tint;
    this.setU(c, "u_tintLoA", tA?.lo ?? [0, 0, 0]); this.setU(c, "u_tintHiA", tA?.hi ?? [1, 1, 1]); this.setU(c, "u_tintAmtA", tA?.amount ?? 0);
    this.setU(c, "u_tintLoB", tB?.lo ?? [0, 0, 0]); this.setU(c, "u_tintHiB", tB?.hi ?? [1, 1, 1]); this.setU(c, "u_tintAmtB", tB?.amount ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    draws++;
    // gỡ texture để frame sau render vào FBO không dính feedback loop
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
    this.last = { a: A?.def.id ?? "", b: B?.def.id ?? "", mix, draws, w: this.W, h: this.H };
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
    this.setU(p, "u_dpr", Math.min(devicePixelRatio || 1, 1.5) * state.quality * scale);
    for (const k in s.values) this.setU(p, k, s.values[k]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * state.quality;
    const W = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const H = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H;
    this.canvas.width = W; this.canvas.height = H;
    const gl = this.gl;
    for (const t of this.targets) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
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

  private program(frag: string): Program {
    const cached = this.programs.get(frag);
    if (cached) return cached;
    const gl = this.gl;
    // shader viết cho THREE.ShaderMaterial không có dòng precision → tự thêm
    const src = /precision\s+\w+\s+float/.test(frag) ? frag : `precision highp float;\n${frag}`;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, src));
    gl.bindAttribLocation(prog, 0, "a_pos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link failed");
    const p: Program = { prog, locs: new Map() };
    this.programs.set(frag, p);
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
