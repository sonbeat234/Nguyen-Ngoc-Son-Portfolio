// Woven Cloth (iridescent) — port threeui-main/src/shaders/woven-cloth/woven-cloth-iridescent.html sang three128.
// Bản gốc dùng three r160 (MeshPhysicalMaterial.iridescence, có từ r142) + height map 1600×1000 dựng bằng JS
// + Verlet. Ở đây là một DẢI vải mảnh nằm ngang, nên:
// - vân satin 5 go (weaveHeight gốc) + sợi slub tính trong fragment shader → normal nhiễu theo sợi;
// - chữ dệt nổi (warp float) lấy từ mask canvas nhỏ;
// - màng mỏng giao thoa (thin-film) xấp xỉ bằng cosine palette theo độ dày × cosθ, đèn key ấm / rim lạnh /
//   bounce magenta như studio gốc;
// - chuyển động: sóng gió chạy dọc (công thức wind()/railZ() gốc) tính trong vertex shader thay cho Verlet CPU.
import * as THREE from "three128";
import { state } from "../core/state";

const VERT = `
uniform float uTime;
uniform float uAmp;
varying vec3 vN;
varying vec3 vPos;
varying vec2 vUv;
float disp(vec2 p){
  float t = uTime;
  float cy = p.y * 0.5 + 0.5;
  float travel = t * 1.15 - p.x * 0.85;
  float gust = 0.52 + 0.34 * sin(t * 0.44) + 0.16 * sin(t * 1.31 + 1.1);
  float wind = (sin(travel + cy * 2.6) + 0.46 * sin(travel * 1.55 + cy * 5.1)) * 0.22 * gust;
  float rail = sin(p.x * 0.55 + t * 0.22) * 0.32 + sin(p.x * 1.05 - t * 0.15) * 0.10;
  return (wind + rail) * uAmp;
}
void main(){
  vec3 p = position;
  float z = disp(p.xy);
  float e = 0.04;
  float zx = disp(p.xy + vec2(e, 0.0));
  float zy = disp(p.xy + vec2(0.0, e));
  vec3 n = normalize(vec3(-(zx - z) / e, -(zy - z) / e, 1.0));
  p.z += z;
  p.y += sin(p.x * 0.42 + uTime * 0.6) * 0.18 * uAmp;
  vN = normalize(normalMatrix * n);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vPos = mv.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
precision highp float;
uniform float uTime;
uniform float uOpacity;
uniform float uShift;
uniform vec2 uRepeat;
uniform sampler2D uMark;
varying vec3 vN;
varying vec3 vPos;
varying vec2 vUv;

// satin 5 go: float dài bị bẻ bởi điểm liên kết rải rác (weaveHeight của bản gốc)
float weave(vec2 g){
  vec2 c = floor(g), f = fract(g);
  float binding = step(mod(c.x * 2.0 + c.y, 5.0), 0.5);
  float h = mix(sin(f.x * 3.14159), sin(f.y * 3.14159) * 0.9, binding);
  h += sin(c.x * 12.9898) * sin(c.x * 4.1414 + 2.3) * 0.16;   // slub
  h += sin(c.y * 7.233 + 1.7) * 0.06;
  return h;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
vec3 thinFilm(float d){ return 0.5 + 0.5 * cos(6.28318 * (d + vec3(0.0, 0.33, 0.67))); }

void main(){
  vec2 g = vUv * uRepeat;
  float m = texture2D(uMark, vUv).r;                       // chữ dệt nổi
  float h0 = weave(g) * (1.0 - m * 0.3) + m * 1.15;
  float hx = weave(g + vec2(0.35, 0.0)) * (1.0 - m * 0.3) + m * 1.15;
  float hy = weave(g + vec2(0.0, 0.35)) * (1.0 - m * 0.3) + m * 1.15;
  vec3 N = normalize(vN + vec3(h0 - hx, h0 - hy, 0.0) * 0.28);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vPos);
  float cosT = clamp(abs(dot(N, V)), 0.0, 1.0);

  // độ dày màng: dải quét rộng + nhiễu thấp tần (makeThicknessTexture gốc)
  float sweep = 0.5 + 0.42 * sin(vUv.x * 6.28318 * 1.6 - vUv.y * 1.15 + uTime * 0.12 + uShift * 3.0);
  float thick = clamp(sweep + (vnoise(vUv * vec2(9.0, 2.4)) - 0.5) * 0.26, 0.0, 1.0);
  vec3 irid = thinFilm(thick * 1.7 + cosT * 1.25 + uShift);

  vec3 albedo = mix(vec3(0.086, 0.063, 0.2), vec3(0.05, 0.063, 0.19), vUv.x) * (0.88 + h0 * 0.1) + m * vec3(0.38, 0.31, 0.46);
  vec3 col = albedo * 0.35;
  // đèn studio: key ấm, rim lạnh, bounce magenta, fill tím
  vec3 Ls[4]; vec3 Cs[4];
  Ls[0] = normalize(vec3(-3.1, 3.2, 3.4)); Cs[0] = vec3(1.0, 0.93, 0.87) * 1.1;
  Ls[1] = normalize(vec3(3.6, 0.6, 2.2));  Cs[1] = vec3(0.25, 0.74, 1.0) * 1.3;
  Ls[2] = normalize(vec3(0.4, -2.6, 1.6)); Cs[2] = vec3(1.0, 0.24, 0.56) * 1.1;
  Ls[3] = normalize(vec3(-3.2, -1.0, 2.6)); Cs[3] = vec3(0.62, 0.48, 1.0) * 0.7;
  float rough = 0.30 - h0 * 0.07 - m * 0.16;
  float shin = mix(18.0, 90.0, 1.0 - clamp(rough, 0.04, 0.8));
  for (int i = 0; i < 4; i++){
    float dif = max(dot(N, Ls[i]), 0.0);
    vec3 H = normalize(Ls[i] + V);
    float sp = pow(max(dot(N, H), 0.0), shin);
    col += albedo * Cs[i] * dif * 0.55 + irid * Cs[i] * sp * (1.4 + m * 1.2);
  }
  float fres = pow(1.0 - cosT, 3.0);
  col += irid * fres * 0.9 + vec3(0.66, 0.85, 1.0) * fres * 0.18;   // sheen
  col = col / (col + 0.75) * 1.35;                                     // tone map mềm

  // mép dải mờ dần để nằm êm trên flow field
  float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  gl_FragColor = vec4(col, edge * uOpacity);
}`;

function markTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 2048; c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#fff";
  x.textBaseline = "middle";
  x.font = "700 46px Syncopate, 'Helvetica Neue', Arial, sans-serif";
  const w = x.measureText(text).width + 80;
  for (let px = 20; px < c.width; px += w) x.fillText(text, px, 66);
  x.fillRect(0, 14, c.width, 3);                                       // gân viền dệt nổi
  x.fillRect(0, c.height - 17, c.width, 3);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

export function createWovenCloth(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0, 9);

  const BW = 14, BH = 1.25;
  const geo = new THREE.PlaneGeometry(BW, BH, 180, 14);
  const mark = markTexture("SIGNAL · FLOW · WOVEN IN MOTION ·");
  const uniforms = {
    uTime: { value: 0 }, uAmp: { value: 1 }, uOpacity: { value: 1 }, uShift: { value: 0 },
    uRepeat: { value: new THREE.Vector2(460, 34) }, uMark: { value: mark },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -0.18;
  mesh.rotation.z = -0.04;
  scene.add(mesh);

  let W = 1, H = 1;
  const resize = (w = canvas.clientWidth, h = canvas.clientHeight) => {
    W = Math.max(1, w); H = Math.max(1, h);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75) * state.quality);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // vừa chiều ngang dải với khung hình (dải rộng BW, luôn chạm hai mép)
    const halfW = (BW * 0.46) / camera.aspect;
    camera.position.z = halfW / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.updateProjectionMatrix();
  };
  resize();

  return {
    uniforms,
    resize,
    /** pulse: 0..1 gió mạnh lên khi chuyển testimonial; shift: dịch màu màng theo tiến độ */
    render(pulse = 0, shift = 0) {
      uniforms.uTime.value = state.time * (state.reduced ? 0.25 : 1);
      uniforms.uAmp.value = 1 + pulse * 1.6 + Math.abs(state.scroll.smooth) * 0.8;
      uniforms.uShift.value = shift;
      mesh.rotation.y = state.mouse.nx * 0.06;
      renderer.render(scene, camera);
    },
    dispose() { geo.dispose(); mat.dispose(); mark.dispose(); renderer.dispose(); },
  };
}
