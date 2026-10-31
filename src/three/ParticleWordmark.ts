// Particle Wordmark (spec mục 9): chữ "SIGNAL" ghép từ ~9–14k hạt. Lúc vào trang hạt bay từ quỹ đạo cầu
// về thành chữ (u_assemble), con trỏ đẩy hạt ra, cuộn thì hạt nổ tung lao về camera (u_disperse).
// Tạo đồng bộ: font Syncopate phải được tải trước (hero.ts await document.fonts.load).
import * as THREE from "three128";
import { state } from "../core/state";

const VERT = `
uniform float u_time, u_assemble, u_disperse, u_size, u_pr;
uniform vec2 u_mouse;
attribute vec3 a_target;
attribute vec3 a_scatter;
attribute float a_seed;
varying float v_alpha;
varying float v_seed;
void main(){
  float k = clamp(u_assemble * 1.25 - a_seed * 0.25, 0.0, 1.0);     // hạt về đích lệch nhịp
  k = 1.0 - pow(1.0 - k, 3.0);
  vec3 p = mix(a_scatter, a_target, k);
  p.xy += 0.018 * vec2(sin(u_time * 1.3 + a_seed * 40.0), cos(u_time * 1.1 + a_seed * 31.0));
  vec2 d = p.xy - u_mouse;
  float r = length(d);
  p.xy += normalize(d + 1e-4) * smoothstep(1.1, 0.0, r) * 0.55;
  p.z  += smoothstep(1.1, 0.0, r) * 0.8;
  vec3 dir = normalize(a_scatter - a_target + vec3(0.0, 0.0, 2.5));
  p += dir * u_disperse * (1.5 + a_seed * 7.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = u_size * u_pr * (0.55 + a_seed) * (10.0 / -mv.z);
  v_alpha = (1.0 - u_disperse * 0.9) * (0.35 + 0.65 * k);
  v_seed = a_seed;
}`;

const FRAG = `
uniform float u_time;
varying float v_alpha;
varying float v_seed;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(vec3(0.62, 0.60, 0.98), vec3(1.0), smoothstep(0.22, 0.0, d));
  col = mix(col, vec3(0.40, 0.85, 1.0), step(0.86, v_seed));
  float tw = 0.7 + 0.3 * sin(u_time * 3.0 + v_seed * 60.0);
  gl_FragColor = vec4(col, a * v_alpha * tw);
}`;

const FONT = (px: number) => `700 ${px}px "Syncopate", "Helvetica Neue", Arial, sans-serif`;
const MAX_POINTS = 14000;
const cache = new Map<string, Float32Array>();

/** lấy mẫu pixel của chữ trên canvas 2D → toạ độ (x, y) trong hộp 9 × 2.1 đơn vị */
function sampleText(text: string, step: number) {
  const key = `${text}:${step}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 1800, H = 420;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  let px = 300;
  x.font = FONT(px);
  const m = x.measureText(text).width;
  if (m > W * 0.94) { px = Math.floor(px * (W * 0.94) / m); x.font = FONT(px); }   // chữ rộng: co cho vừa
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, W / 2, H / 2);
  const data = x.getImageData(0, 0, W, H).data;
  const out: number[] = [];
  for (let y = 0; y < H; y += step) for (let i = 0; i < W; i += step) {
    if (data[(y * W + i) * 4 + 3] > 140) out.push(((i / W) - 0.5) * 9, -((y / H) - 0.5) * 2.1);
  }
  const arr = new Float32Array(out);
  cache.set(key, arr);
  return arr;
}

export type ParticleWordmark = ReturnType<typeof createParticleWordmark>;

export function createParticleWordmark(canvas: HTMLCanvasElement, text = "SIGNAL") {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 10;

  // spec: desktop step 4, mobile step 6; nới step nếu vượt ~14k hạt
  let step = state.mobile ? 6 : 4;
  let xy = sampleText(text, step);
  while (xy.length / 2 > MAX_POINTS && step < 9) xy = sampleText(text, ++step);
  const n = xy.length / 2;
  const target = new Float32Array(n * 3), scatter = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    target[i * 3] = xy[i * 2]; target[i * 3 + 1] = xy[i * 2 + 1]; target[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), r = 6 + Math.random() * 6;
    scatter[i * 3] = r * Math.sin(ph) * Math.cos(th);
    scatter[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    scatter[i * 3 + 2] = r * Math.cos(ph) - 4;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(target.slice(), 3));
  geo.setAttribute("a_target", new THREE.BufferAttribute(target, 3));
  geo.setAttribute("a_scatter", new THREE.BufferAttribute(scatter, 3));
  geo.setAttribute("a_seed", new THREE.BufferAttribute(seed, 1));

  const uniforms = {
    u_time: { value: 0 }, u_assemble: { value: 0 }, u_disperse: { value: 0 },
    u_size: { value: 2.4 }, u_pr: { value: 1 }, u_mouse: { value: new THREE.Vector2(99, 99) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  let quality = state.quality, lastW = 1, lastH = 1;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const resize = (w: number, h: number) => {
    lastW = Math.max(1, w); lastH = Math.max(1, h);
    quality = state.quality;
    const pr = Math.min(devicePixelRatio || 1, 1.75) * quality;
    renderer.setPixelRatio(pr);
    renderer.setSize(lastW, lastH, false);
    camera.aspect = lastW / lastH;
    // lùi camera tới khi cả chữ (rộng 9 đơn vị + lề) nằm gọn trong khung — màn dọc cần lùi xa hơn nhiều
    const fitZ = (9.9 / 2) / (tanHalf * camera.aspect);
    camera.position.z = Math.max(lastW < 768 ? 16 : 10, fitZ);
    camera.updateProjectionMatrix();
    uniforms.u_pr.value = pr;
    uniforms.u_size.value = 2.4 * Math.sqrt(camera.position.z / 10);   // giữ hạt đủ to khi camera lùi
  };

  return {
    uniforms,
    count: n,
    resize,
    /** mouseActive: false → đẩy điểm hút ra xa (chưa có con trỏ / thiết bị cảm ứng không chạm) */
    render(mouseActive: boolean) {
      if (quality !== state.quality) resize(lastW, lastH);
      uniforms.u_time.value = state.time;
      const halfH = tanHalf * camera.position.z;
      if (mouseActive) uniforms.u_mouse.value.set(state.mouse.nx * halfH * camera.aspect, state.mouse.ny * halfH);
      else uniforms.u_mouse.value.set(99, 99);
      points.rotation.y = state.mouse.nx * 0.18;
      points.rotation.x = -state.mouse.ny * 0.1;
      renderer.render(scene, camera);
    },
    dispose() { geo.dispose(); mat.dispose(); renderer.dispose(); },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// V4 · hero: hạt hội tụ ĐÚNG lên chữ DOM của tên rồi nhường lại cho chữ thật.
// Khác bản trên: camera trực giao 1 đơn vị = 1px CSS của canvas; điểm đích lấy mẫu từ một canvas 2D vẽ lại từng dòng
// tên đúng font / cỡ / letter-spacing / vị trí đo từ DOM (Range rect) → hạt khớp nét chữ thật, có dấu tiếng Việt.
// u_assemble 0 → 1: hạt bay từ đám mây về đích (lệch nhịp theo seed); con trỏ đẩy hạt; u_fade tắt dần khi chữ DOM hiện.
// ---------------------------------------------------------------------------------------------------------------
const NAME_VERT = `
uniform float u_time, u_assemble, u_size, u_pr, u_fade;
uniform vec2 u_mouse;
attribute vec3 a_target;
attribute vec3 a_scatter;
attribute float a_seed;
varying float v_alpha;
varying float v_seed;
void main(){
  float k = clamp(u_assemble * 1.35 - a_seed * 0.35, 0.0, 1.0);
  k = 1.0 - pow(1.0 - k, 3.0);
  vec3 p = mix(a_scatter, a_target, k);
  p.xy += (1.0 - k) * 6.0 * vec2(sin(u_time * 1.7 + a_seed * 40.0), cos(u_time * 1.3 + a_seed * 31.0));
  vec2 d = p.xy - u_mouse;
  float r = length(d);
  p.xy += normalize(d + 1e-4) * smoothstep(120.0, 0.0, r) * 26.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = u_size * u_pr * (0.6 + a_seed * 0.8) * mix(1.8, 1.0, k);
  v_alpha = (0.25 + 0.75 * k) * (1.0 - u_fade);
  v_seed = a_seed;
}`;
const NAME_FRAG = `
uniform vec3 u_c0, u_c1, u_c2;
varying float v_alpha;
varying float v_seed;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(u_c0, u_c2, smoothstep(0.24, 0.0, d));
  col = mix(col, u_c1, step(0.86, v_seed));
  gl_FragColor = vec4(col, a * v_alpha);
}`;

export type NameLine = { text: string; font: string; letterSpacing: string; x: number; baseline: number };

/** lấy mẫu điểm của các dòng chữ trong hộp w × h (px CSS) — toạ độ px, y xuống */
function sampleLines(lines: NameLine[], w: number, h: number, step: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.fillStyle = "#fff";
  x.textBaseline = "alphabetic";
  for (const l of lines) {
    x.font = l.font;
    (x as unknown as { letterSpacing: string }).letterSpacing = l.letterSpacing;
    x.fillText(l.text, l.x, l.baseline);
  }
  const data = x.getImageData(0, 0, c.width, c.height).data;
  const out: number[] = [];
  for (let y = 0; y < c.height; y += step) for (let i = 0; i < c.width; i += step) {
    if (data[(y * c.width + i) * 4 + 3] > 120) out.push(i + (Math.random() - 0.5) * step * 0.6, y + (Math.random() - 0.5) * step * 0.6);
  }
  return new Float32Array(out);
}

export function createParticleName(canvas: HTMLCanvasElement, lines: NameLine[], box: { w: number; h: number }, colors: [number, number, number][]) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, box.w, 0, -box.h, -2000, 2000);

  let step = state.mobile ? 3 : 2;
  let xy = sampleLines(lines, box.w, box.h, step);
  while (xy.length / 2 > MAX_POINTS && step < 8) xy = sampleLines(lines, box.w, box.h, ++step);
  const n = xy.length / 2;
  const target = new Float32Array(n * 3), scatter = new Float32Array(n * 3), seed = new Float32Array(n);
  const R = Math.max(box.w, box.h) * 0.9;
  for (let i = 0; i < n; i++) {
    target[i * 3] = xy[i * 2]; target[i * 3 + 1] = -xy[i * 2 + 1];
    const th = Math.random() * Math.PI * 2, rr = R * (0.35 + Math.random() * 0.75);
    scatter[i * 3] = box.w * 0.5 + Math.cos(th) * rr;
    scatter[i * 3 + 1] = -box.h * 0.5 + Math.sin(th) * rr * 0.6;
    scatter[i * 3 + 2] = (Math.random() - 0.5) * 400;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(target.slice(), 3));
  geo.setAttribute("a_target", new THREE.BufferAttribute(target, 3));
  geo.setAttribute("a_scatter", new THREE.BufferAttribute(scatter, 3));
  geo.setAttribute("a_seed", new THREE.BufferAttribute(seed, 1));
  const uniforms = {
    u_time: { value: 0 }, u_assemble: { value: 0 }, u_fade: { value: 0 }, u_size: { value: step * 1.15 }, u_pr: { value: 1 },
    u_mouse: { value: new THREE.Vector2(-9999, -9999) },
    u_c0: { value: new THREE.Vector3(...colors[0]) }, u_c1: { value: new THREE.Vector3(...colors[1]) }, u_c2: { value: new THREE.Vector3(...colors[2]) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: NAME_VERT, fragmentShader: NAME_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const resize = (w: number, h: number) => {
    const pr = Math.min(devicePixelRatio || 1, 1.75) * state.quality;
    renderer.setPixelRatio(pr);
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    uniforms.u_pr.value = pr;
  };
  resize(box.w, box.h);

  return {
    uniforms,
    count: n,
    resize,
    /** mx, my: con trỏ theo px của canvas (y xuống) */
    render(mx = -9999, my = -9999) {
      uniforms.u_time.value = state.time;
      uniforms.u_mouse.value.set(mx, -my);
      renderer.render(scene, camera);
    },
    dispose() { geo.dispose(); mat.dispose(); renderer.dispose(); },
  };
}
