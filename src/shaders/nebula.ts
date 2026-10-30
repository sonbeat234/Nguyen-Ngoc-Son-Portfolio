// Port từ threeui-main/src/shaders/neuform-isolated/sources/julian-vance-nebula.html
// + u_progress (đẩy tinh vân lên và thắt lại khi cuộn khỏi hero) + lớp bụi sao lấp lánh.
export const NEBULA_FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_progress;
uniform float u_velocity;

vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){ float v = 0.0; float a = 0.55; for(int i=0;i<4;i++){ v += a*snoise(p); p *= 2.05; a *= 0.5; } return v; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float asp = u_resolution.x / u_resolution.y;
  vec2 p = uv; p.x *= asp;
  float t = u_time * 0.05;
  vec2 drift = (u_mouse - 0.5) * 0.12;
  p.y -= u_progress * 0.55;                         // tinh vân trôi lên khi cuộn
  vec2 st = p * (0.85 + u_progress * 0.35) + drift;
  st += vec2(fbm(st + t), fbm(st - t)) * (0.35 + abs(u_velocity) * 0.25);

  vec3 col = vec3(0.005, 0.005, 0.012);
  vec2 c1 = vec2(asp * 0.62, 0.85) + drift;
  float n1 = fbm(st * 1.4 + t * 2.0);
  float mass = smoothstep(1.15, 0.05, length(p - c1) + n1 * 0.32);
  float tongue = smoothstep(0.55, 0.02, abs(p.x - asp * 0.58 - n1 * 0.22)) * smoothstep(1.2, 0.1, abs(uv.y - 0.55));
  vec2 c2 = vec2(asp * 1.05, 0.5);
  float mass2 = smoothstep(0.9, 0.0, length(p - c2) + fbm(st * 1.1 - t) * 0.25);

  vec3 deepIndigo = vec3(0.05, 0.02, 0.15);
  vec3 purple = vec3(0.2, 0.1, 0.6);
  vec3 hotViolet = vec3(0.5, 0.3, 1.0);
  col = mix(col, deepIndigo, clamp(mass * 0.9 + mass2 * 0.7, 0.0, 1.0));
  col = mix(col, purple, clamp(mass * mass * 1.1 + mass2 * 0.55, 0.0, 1.0));
  col += hotViolet * tongue * mass * (0.85 + u_progress * 0.6);

  // bụi sao: lưới hash, mỗi ô tối đa 1 sao, nhấp nháy lệch pha
  vec2 id = floor(gl_FragCoord.xy / 3.0);
  float h = hash(id);
  float star = step(0.9965, h) * (0.5 + 0.5 * sin(u_time * (1.0 + h * 4.0) + h * 80.0));
  col += vec3(0.85, 0.85, 1.0) * star * (0.6 + mass * 0.8);

  col *= 0.92 + 0.08 * sin(u_time * 0.4);
  col *= mix(0.55, 1.0, smoothstep(1.6, 0.35, length(uv - vec2(0.45, 0.5))));
  col *= mix(0.35, 1.0, smoothstep(0.0, 0.55, uv.x));
  gl_FragColor = vec4(col, 1.0);
}`;
