// Shader custom cho hero: wafer silicon 300 mm nhìn từ trên.
// - Lưới die + scribe line, notch, viền vát; die cắt dở ở mép tối hơn và không có chi tiết.
// - Óng ánh màng mỏng (thin-film) đổi theo vị trí chuột + vận tốc cuộn; dải phản xạ chạy theo chuột.
// - "Wafer sort": die loé sáng ngẫu nhiên như đang được probe, die gần chuột sáng, vài die hỏng có chấm mực.
// - u_progress (pin hero): wafer trượt về giữa và zoom vào một die → thấy pad I/O + hàng standard cell.
export const WAFER_FRAG = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_progress;
uniform float u_velocity;
uniform vec3  u_accent;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 film(float t){ return 0.5 + 0.5*cos(6.28318*(t + vec3(0.0, 0.33, 0.67))); }

// màn hình → toạ độ wafer (bán kính 1)
vec2 toWafer(vec2 uv, vec2 c, float R, float z, float a, vec2 o){ return rot(a) * ((uv - c) / (R * z)) + o; }

void main(){
  vec2 res = u_resolution;
  float aspect = res.x / res.y;
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.y;
  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);

  // landscape: wafer lệch phải; portrait: wafer ở nửa dưới
  float land = smoothstep(0.85, 1.35, aspect);
  float p = u_progress;
  float e = smoothstep(0.0, 0.55, p);
  vec2 c = mix(mix(vec2(0.0, -0.5), vec2(aspect*0.5 - 0.4, -0.03), land), vec2(0.0), e);
  float R = mix(0.6, 0.78, land);
  float z = exp(smoothstep(0.08, 1.0, p) * 2.7);
  float D = 0.09;                                     // cạnh die (đơn vị wafer)
  vec2 o = vec2(0.5*D, 0.5*D) * e;                    // zoom vào tâm một die, không vào giao scribe
  float a = u_time * 0.012 + p * 0.5;

  vec2 w = toWafer(uv, c, R, z, a, o);
  vec2 mw = toWafer(m, c, R, z, a, o);
  float px = 1.0 / (res.y * R * z);                   // 1 pixel theo đơn vị wafer
  float r = length(w);

  // ---- đĩa + notch ----
  float disc = smoothstep(1.0 + px, 1.0 - px, r);
  disc *= smoothstep(0.022 - px, 0.022 + px, length(w - vec2(0.0, -1.0)));

  // ---- lưới die ----
  vec2 g = w / D;
  vec2 id = floor(g);
  vec2 f = fract(g);
  vec2 dc = (id + 0.5) * D;
  float full = step(length(abs(dc) + 0.5*D), 0.955);
  float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  float aa = px / D * 1.5;
  float scribe = 1.0 - smoothstep(0.03, 0.03 + aa, edge);
  float h = hash(id);

  // ---- nền silicon + óng ánh màng mỏng ----
  vec3 base = vec3(0.045, 0.058, 0.082);
  float t = dot(w, vec2(0.6, 0.8)) * 0.32 + r * 0.55 + m.x * 0.35 + m.y * 0.22
          + u_time * 0.018 + u_velocity * 0.25 + vnoise(w * 2.6) * 0.18;
  vec3 irid = film(t);
  float band = exp(-pow((dot(w, vec2(0.72, 0.69)) - (mw.x + mw.y) * 0.7) * 2.4, 2.0));
  vec3 col = base + irid * (0.07 + 0.2 * band) * mix(0.55, 1.0, full);

  // ---- chi tiết trong die: vòng pad I/O, khối lõi, hàng standard cell (hiện rõ khi zoom) ----
  float detail = mix(0.35, 1.0, smoothstep(1.4, 5.0, z));
  float inner = step(0.12, f.x) * step(f.x, 0.88) * step(0.12, f.y) * step(f.y, 0.88);
  float ringY = step(0.055, min(f.y, 1.0 - f.y)) * step(min(f.y, 1.0 - f.y), 0.1);
  float ringX = step(0.055, min(f.x, 1.0 - f.x)) * step(min(f.x, 1.0 - f.x), 0.1);
  float padX = step(0.3, fract(f.x * 9.0)) * step(fract(f.x * 9.0), 0.75);
  float padY = step(0.3, fract(f.y * 9.0)) * step(fract(f.y * 9.0), 0.75);
  float pads = max(ringY * padX * step(0.1, f.x) * step(f.x, 0.9), ringX * padY * step(0.1, f.y) * step(f.y, 0.9));
  vec2 q = (f - 0.12) / 0.76 * vec2(30.0, 16.0);
  vec2 qi = floor(q), qf = fract(q);
  float cellW = 0.2 + 0.6 * hash(qi + id * 7.13);
  float cells = inner * step(0.16, qf.y) * step(qf.y, 0.84) * step(0.06, qf.x) * step(qf.x, cellW) * step(0.3, hash(qi.yx + id));
  float rails = inner * (1.0 - smoothstep(0.0, 0.05 + aa * 16.0, qf.y));
  float core = step(0.3, f.x) * step(f.x, 0.62) * step(0.34, f.y) * step(f.y, 0.7);
  vec3 dieCol = col;
  dieCol += vec3(0.75, 0.62, 0.38) * pads * 0.22 * detail;                 // pad nhôm
  dieCol += irid.zxy * cells * 0.06 * detail;
  dieCol += vec3(0.4, 0.5, 0.6) * rails * 0.05 * detail;
  dieCol = mix(dieCol, dieCol * 0.6 + irid.yzx * 0.05, core * 0.6);

  // ---- wafer sort: die loé như đang probe, die gần chuột sáng, die hỏng có chấm mực ----
  float flash = pow(max(0.0, sin(u_time * 0.7 + h * 37.0)), 60.0);
  float probe = smoothstep(0.22, 0.0, length(dc - mw));
  float ink = smoothstep(0.16, 0.13, length(f - 0.5)) * step(0.975, h);
  dieCol += u_accent * (flash * 0.35 + probe * 0.22) * (1.0 - core * 0.5);
  dieCol = mix(dieCol, vec3(0.6, 0.07, 0.1), ink * 0.85);

  col = mix(col * 0.75, dieCol, full);
  col = mix(col, vec3(0.32, 0.36, 0.42) + irid * 0.08, scribe * 0.55);   // scribe line bạc

  // viền vát + quầng ngoài
  float rim = smoothstep(0.03, 0.0, abs(r - 0.986));
  col += (irid * 0.4 + 0.25) * rim * 0.35;
  vec3 bg = vec3(0.016, 0.02, 0.028);
  vec2 sg = abs(fract(uv * 9.0) - 0.5);
  bg += 0.012 * step(0.485, max(sg.x, sg.y));                              // lưới reticle mờ
  bg += u_accent * 0.07 * exp(-max(r - 1.0, 0.0) * 5.0);
  col = mix(bg, col, disc);

  gl_FragColor = vec4(col, 1.0);
}`;
