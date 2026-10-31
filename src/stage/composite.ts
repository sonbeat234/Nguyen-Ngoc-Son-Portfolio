// Shader của stage (V5-perf):
//  - COMPOSITE_FRAG: trộn scene A/B (dissolve), kính mờ, shield, vignette → render vào FBO ở độ phân giải
//    state.stageScale (adaptive quality đổi mượt, không cấp phát lại). Ghi độ "kính" vào alpha cho pass blit.
//  - BLIT_FRAG: phóng composite lên canvas (1 mẫu bilinear) + sao nền + film grain ở độ phân giải ĐẦY ĐỦ (hạt mịn,
//    sao 0.2–1 px không bị nhoè khi composite chạy thấp). Đo trên Intel UHD: composite 1920×1080 ≈ 5–6.5 ms GPU —
//    phần lớn ngân sách 6.9 ms của 144 Hz — nên composite phải co theo quality như scene (bản cũ co cả canvas).
//  - FROST_MIX_FRAG / FROST_BLUR_FRAG: bản trộn scene A/B ở 1/4 → blur Gaussian tách hai lượt → "kính mờ" trong
//    composite (fx/ui/frost.ts), thay CSS backdrop-filter trên canvas sống.
//  - film grain + sao nền chỉ còn ở đây (lớp .grain DOM và canvas #ambient đã bỏ).

/** phần dùng chung: hash/noise, grade, mask dissolve — composite và pass trộn của frost phải ra cùng màu */
const COMMON = `
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
// mask dissolve tại uv (0 = toàn A, 1 = toàn B)
float dissolveMask(vec2 uv, vec2 res, float mixv, float time){
  float n = fbm(uv * vec2(res.x / res.y, 1.0) * 2.4 + vec2(0.0, time * 0.05));
  n = mix(n, 1.0 - uv.y, 0.35);                 // dissolve quét từ dưới lên theo hướng cuộn
  float w = 0.16;
  float t = mixv * (1.0 + 2.0 * w) - w;
  return smoothstep(n - w, n + w, t);
}
`;

const SCENE_UNIFORMS = `
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform vec2  u_res;
uniform float u_scaleA;
uniform float u_scaleB;
uniform float u_mix;
uniform float u_hasB;
uniform float u_time;
uniform vec3  u_tintLoA;
uniform vec3  u_tintHiA;
uniform float u_tintAmtA;
uniform vec3  u_tintLoB;
uniform vec3  u_tintHiB;
uniform float u_tintAmtB;
`;

export const COMPOSITE_FRAG = `
precision highp float;
${SCENE_UNIFORMS}
uniform float u_level;
uniform float u_vel;
uniform float u_glitch;
uniform vec3  u_bg;
uniform vec3  u_edge;
// "shield" sau khối chữ (fx/ui/shield.ts): tối đa 6 hình chữ nhật px composite (x0 y0 x1 y1, gốc dưới trái);
// trong vùng nền chỉ còn 28% độ sáng, viền mềm ra ngoài ~56px (theo px canvas — u_px đổi sang px composite)
uniform vec4  u_shield[6];
uniform float u_shieldN;
uniform float u_px;          // px composite / px canvas (= stageScale)
// khung kính (fx/ui/frost.ts): rect px composite + (bán kính góc px, độ mạnh 0..1, bão hoà)
uniform vec4  u_frost[8];
uniform vec4  u_frostP[8];
uniform float u_frostN;
uniform sampler2D u_blur;
${COMMON}

vec3 rgbSplit(sampler2D t, vec2 uv, float s, vec2 off){
  vec2 lim = vec2(1.0) - 1.0/u_res;
  return vec3(
    texture2D(t, clamp(uv + off, 0.0, 1.0) * s * lim).r,
    texture2D(t, uv * s * lim).g,
    texture2D(t, clamp(uv - off, 0.0, 1.0) * s * lim).b);
}
float rrect(vec2 p, vec4 r, float rad){
  vec2 c = (r.xy + r.zw) * 0.5, h = (r.zw - r.xy) * 0.5;
  rad = min(rad, min(h.x, h.y));
  vec2 q = abs(p - c) - h + rad;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 uv0 = uv;
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
    float m = dissolveMask(uv, u_res, u_mix, u_time);
    col = mix(a, b, m);
    float edge = 1.0 - abs(m * 2.0 - 1.0);
    col += u_edge * pow(edge, 6.0) * 0.55;        // viền phát sáng ở mép dissolve
  }

  // kính mờ: nền đã blur (1/4 độ phân giải, Gaussian 2 lượt) trong khung bo góc, bão hoà như saturate(1.2) cũ
  float fr = 0.0, sat = 1.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= u_frostN) break;
    vec4 p = u_frostP[i];
    float k = (1.0 - smoothstep(-0.75, 0.75, rrect(gl_FragCoord.xy, u_frost[i], p.x))) * p.y;
    if (k > fr) { fr = k; sat = p.z; }
  }
  if (fr > 0.0) {
    vec3 bl = texture2D(u_blur, uv0).rgb;
    float l = dot(bl, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(vec3(l), bl, sat), fr);
  }

  float sh = 0.0;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= u_shieldN) break;
    vec4 r = u_shield[i];
    vec2 o = max(r.xy - gl_FragCoord.xy, gl_FragCoord.xy - r.zw);
    sh = max(sh, 1.0 - smoothstep(-24.0 * u_px, 56.0 * u_px, max(o.x, o.y)));
  }
  col = mix(col, u_bg + (col - u_bg) * 0.28, sh);

  col = mix(u_bg, col, u_level);
  float vig = smoothstep(1.3, 0.3, length(c * vec2(u_res.x / u_res.y, 1.0) * 0.9));
  col *= mix(0.7, 1.0, vig);
  gl_FragColor = vec4(col, fr);                   // alpha = độ kính → pass blit che sao / grain dưới kính
}`;

/** phóng composite lên canvas + sao nền + film grain ở độ phân giải đầy đủ */
export const BLIT_FRAG = `
precision highp float;
uniform sampler2D u_comp;
uniform vec2  u_res;         // px canvas
uniform vec2  u_cs;          // phần texture composite đang dùng (viewport / kích thước texture)
uniform vec2  u_half;        // nửa texel của texture composite (kẹp mép)
uniform float u_time;
// grain: biên độ nền + phần theo độ sáng (gần đúng overlay 6% của lớp .grain DOM cũ)
uniform vec2  u_grain;
// sao nền (thay canvas #ambient): độ dịch tích luỹ theo cuộn (px CSS), độ đậm (opacity .55 cũ), px canvas / px CSS
uniform float u_starShift;
uniform float u_starA;
uniform float u_css;
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }

// 3 lớp lưới sao (ô 150 px CSS, ~40% ô có sao) trôi theo cuộn với tốc độ riêng — tương đương 70 sao 0.2–1 px của
// canvas cũ; phần lớn pixel thoát sau một hash (ô không có sao)
float stars(vec2 px){
  float acc = 0.0;
  for (int L = 0; L < 3; L++) {
    float fl = float(L);
    float drift = 0.012 + fl * 0.008;
    vec2 p = vec2(px.x + fl * 53.0, px.y + u_starShift * drift + fl * 91.0);
    vec2 id = floor(p / 150.0);
    vec2 seed = id + fl * 17.3;
    if (hash(seed) > 0.4) continue;
    vec2 f = p - id * 150.0;
    vec2 sp = vec2(hash(seed + 3.7), hash(seed + 9.1)) * 150.0;
    float size = 0.2 + 0.8 * hash(seed + 5.3);
    float op = 0.1 + 0.6 * hash(seed + 1.9);
    vec2 d = abs(f - sp) * u_css;                         // khoảng cách theo px thiết bị
    float cover = clamp(size * u_css, 0.25, 1.0);        // sao < 1 px: mờ theo diện tích
    acc += op * cover * (1.0 - smoothstep(0.35, 0.85 + size * u_css * 0.5, max(d.x, d.y)));
  }
  return acc;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec4 s = texture2D(u_comp, min(uv * u_cs, u_cs - u_half));
  vec3 col = s.rgb;
  float fr = s.a;
  // sao nền: trên stage (không vignette / shield), bị che dưới kính
  if (u_starA > 0.0) {
    vec2 cssPx = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_css;
    col = mix(col, vec3(0.945, 0.94, 0.973), clamp(stars(cssPx) * u_starA * (1.0 - fr), 0.0, 1.0));
  }
  // film grain: mạnh hơn ở vùng sáng như blend overlay; dưới kính gần như không (đã bị blur)
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += (hash(gl_FragCoord.xy + fract(u_time * 7.31) * 113.0) - 0.5) * (u_grain.x + u_grain.y * lum) * (1.0 - 0.85 * fr);
  gl_FragColor = vec4(col, 1.0);
}`;

/** pass 1 của kính: trộn A/B (cùng grade + mask dissolve như composite) xuống 1/4 độ phân giải, lọc hộp 4 mẫu */
export const FROST_MIX_FRAG = `
precision highp float;
${SCENE_UNIFORMS}
uniform vec2 u_small;   // kích thước target nhỏ (px)
${COMMON}
vec3 scene(vec2 uv){
  vec2 lim = vec2(1.0) - 1.0/u_res;
  vec3 a = grade(texture2D(u_a, uv * u_scaleA * lim).rgb, u_tintLoA, u_tintHiA, u_tintAmtA);
  if (u_hasB < 0.5) return a;
  vec3 b = grade(texture2D(u_b, uv * u_scaleB * lim).rgb, u_tintLoB, u_tintHiB, u_tintAmtB);
  return mix(a, b, dissolveMask(uv, u_res, u_mix, u_time));
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_small;
  vec2 d = 0.25 / u_small;
  gl_FragColor = vec4((scene(uv + vec2(-d.x, -d.y)) + scene(uv + vec2(d.x, -d.y)) + scene(uv + vec2(-d.x, d.y)) + scene(uv + vec2(d.x, d.y))) * 0.25, 1.0);
}`;

/** pass 2/3 của kính: Gaussian 1 chiều 9 mẫu trên target 1/4 độ phân giải */
export const FROST_BLUR_FRAG = `
precision highp float;
uniform sampler2D u_src;
uniform vec2 u_small;
uniform vec2 u_dir;     // (1,0) hoặc (0,1) theo texel
void main(){
  vec2 uv = gl_FragCoord.xy / u_small;
  vec2 s = u_dir * 1.35 / u_small;   // nới bước mẫu: σ ≈ 4 texel 1/4 ≈ 13 px CSS (gần blur(12–14px) cũ)
  vec3 c = texture2D(u_src, uv).rgb * 0.1531;
  c += (texture2D(u_src, uv + s * 1.3846).rgb + texture2D(u_src, uv - s * 1.3846).rgb) * 0.2770;
  c += (texture2D(u_src, uv + s * 3.2308).rgb + texture2D(u_src, uv - s * 3.2308).rgb) * 0.1468;
  c += (texture2D(u_src, uv + s * 5.0769).rgb + texture2D(u_src, uv - s * 5.0769).rgb) * 0.0446;
  c += (texture2D(u_src, uv + s * 6.9231).rgb + texture2D(u_src, uv - s * 6.9231).rgb) * 0.0089;
  gl_FragColor = vec4(c / (0.1531 + 2.0 * (0.2770 + 0.1468 + 0.0446 + 0.0089)), 1.0);
}`;
