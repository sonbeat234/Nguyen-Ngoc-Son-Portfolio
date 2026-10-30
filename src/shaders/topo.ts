// Port từ threeui-main/src/shaders/neuform-isolated/sources/topo-field.html: snoise 2D,
// đường đồng mức bằng triangle wave, lưới 48px. Thêm u_progress, quầng sáng và lực đẩy quanh chuột.
export const TOPO_FRAG = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dpr;
uniform vec2 u_mouse;
uniform float u_progress;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  float asp = u_resolution.x / u_resolution.y;
  st.x *= asp;
  vec2 m = vec2(u_mouse.x * asp, u_mouse.y);

  float gridSize = 48.0 * u_dpr;
  vec2 gf = fract(gl_FragCoord.xy / gridSize);
  float lt = 1.0 / gridSize;
  float grid = clamp(step(1.0 - lt, gf.x) + step(1.0 - lt, gf.y), 0.0, 1.0) * 0.10;

  float md = length(st - m);
  vec2 np = st * 1.4 + vec2(u_time * 0.015, u_time * 0.025 + u_progress * 1.2);
  np += normalize(st - m + 1e-4) * exp(-md * 6.0) * 0.12;           // chuột "đẩy" địa hình
  float n = snoise(np) * 0.5 + 0.5;
  float bands = 8.0 + u_progress * 10.0;
  float tri = abs(fract(n * bands) - 0.5) * 2.0;
  float topo = smoothstep(0.03, 0.0, tri) * 0.45;
  float major = smoothstep(0.05, 0.0, abs(fract(n * bands / 5.0) - 0.5) * 2.0) * 0.35;

  vec3 col = vec3(0.012);
  col += vec3(1.0) * grid;
  col += vec3(1.0) * topo;
  col += vec3(0.95, 0.93, 0.88) * major;
  col += vec3(1.0) * exp(-md * 10.0) * 0.08;                         // quầng sáng con trỏ
  col *= smoothstep(1.25, 0.2, length((gl_FragCoord.xy / u_resolution.xy) - 0.5));
  gl_FragColor = vec4(col, 1.0);
}`;
