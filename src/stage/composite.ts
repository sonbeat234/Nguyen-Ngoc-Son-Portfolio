export const COMPOSITE_FRAG = `
precision highp float;
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform vec2  u_res;
uniform float u_scaleA;
uniform float u_scaleB;
uniform float u_mix;
uniform float u_hasB;
uniform float u_level;
uniform float u_time;
uniform float u_vel;
uniform float u_glitch;
uniform vec3  u_bg;
uniform vec3  u_edge;
// tint theo palette cho scene không nhận màu (vendor): lo/hi = accent/accent2, amt 0 = giữ màu gốc
uniform vec3  u_tintLoA;
uniform vec3  u_tintHiA;
uniform float u_tintAmtA;
uniform vec3  u_tintLoB;
uniform vec3  u_tintHiB;
uniform float u_tintAmtB;
// "shield" sau khối chữ (fx/ui/shield.ts): tối đa 6 hình chữ nhật px (x0 y0 x1 y1, gốc dưới trái);
// trong vùng nền chỉ còn 28% độ sáng, viền mềm ra ngoài ~56px
uniform vec4  u_shield[6];
uniform float u_shieldN;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }

// recolor giữ độ sáng: kênh sáng nhất làm luminance, ramp lo → hi theo độ sáng
vec3 grade(vec3 c, vec3 lo, vec3 hi, float amt){
  float l = max(max(c.r, c.g), c.b);
  vec3 t = mix(lo, hi, smoothstep(0.2, 0.95, l)) * l * 1.08;
  return mix(c, t, amt);
}

vec3 rgbSplit(sampler2D t, vec2 uv, float s, vec2 off){
  vec2 lim = vec2(1.0) - 1.0/u_res;
  return vec3(
    texture2D(t, clamp(uv + off, 0.0, 1.0) * s * lim).r,
    texture2D(t, uv * s * lim).g,
    texture2D(t, clamp(uv - off, 0.0, 1.0) * s * lim).b);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 c = uv - 0.5;
  float v = clamp(u_vel, -1.0, 1.0);
  float g = u_glitch;

  // "lens" theo vận tốc cuộn: kéo dọc nhẹ + tách màu tăng dần ra rìa
  uv.y = clamp(uv.y + v * 0.012 * (1.0 - dot(c,c) * 2.0), 0.0, 1.0);
  // chương Signal Lost: dải nhiễu ngang dịch theo hàng
  float band = step(0.82, hash(vec2(floor(uv.y * 38.0), floor(u_time * 12.0))));
  uv.x = clamp(uv.x + band * g * (hash(vec2(floor(uv.y * 38.0), u_time)) - 0.5) * 0.05, 0.0, 1.0);
  vec2 off = c * (0.0012 + abs(v) * 0.014 * (1.0 + g * 1.5)) + vec2(0.0, v * 0.003);

  vec3 a = grade(rgbSplit(u_a, uv, u_scaleA, off), u_tintLoA, u_tintHiA, u_tintAmtA);
  vec3 col = a;

  if (u_hasB > 0.5) {
    vec3 b = grade(rgbSplit(u_b, uv, u_scaleB, off), u_tintLoB, u_tintHiB, u_tintAmtB);
    float n = fbm(uv * vec2(u_res.x / u_res.y, 1.0) * 2.4 + vec2(0.0, u_time * 0.05));
    n = mix(n, 1.0 - uv.y, 0.35);                 // dissolve quét từ dưới lên theo hướng cuộn
    float w = 0.16;
    float t = u_mix * (1.0 + 2.0 * w) - w;        // u_mix=0 → toàn A, u_mix=1 → toàn B
    float m = smoothstep(n - w, n + w, t);
    col = mix(a, b, m);
    float edge = 1.0 - abs(m * 2.0 - 1.0);
    col += u_edge * pow(edge, 6.0) * 0.55;        // viền phát sáng ở mép dissolve
  }

  float sh = 0.0;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= u_shieldN) break;
    vec4 r = u_shield[i];
    vec2 o = max(r.xy - gl_FragCoord.xy, gl_FragCoord.xy - r.zw);
    sh = max(sh, 1.0 - smoothstep(-24.0, 56.0, max(o.x, o.y)));
  }
  col = mix(col, u_bg + (col - u_bg) * 0.28, sh);

  col = mix(u_bg, col, u_level);
  float vig = smoothstep(1.3, 0.3, length(c * vec2(u_res.x / u_res.y, 1.0) * 0.9));
  col *= mix(0.7, 1.0, vig);
  col += (hash(gl_FragCoord.xy + fract(u_time * 7.31) * 113.0) - 0.5) * 0.032; // film grain
  gl_FragColor = vec4(col, 1.0);
}`;
