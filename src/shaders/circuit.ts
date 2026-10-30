// Shader custom cho phần Profile: đi dây Manhattan hai lớp metal nhìn từ trên.
// - Lớp trước (đồng, dây ngang + nấc dọc) và lớp sau (xanh nhạt, dây dọc) trượt parallax theo u_progress.
// - Mỗi hàng dây có xung tín hiệu chạy dọc (đầu sáng, đuôi tắt dần); cuộn nhanh thì xung chạy nhanh hơn.
// - Via ở đầu đoạn dây và chỗ đổi hướng; dây quanh con trỏ sáng lên.
export const CIRCUIT_FRAG = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_progress;
uniform float u_velocity;
uniform vec3  u_accent;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }

// x = khoảng cách tới dây, y = khoảng cách tới via (1e3 nếu không có)
vec2 route(vec2 p, float seed){
  vec2 id = floor(p), f = fract(p), c = vec2(0.5);
  float on  = step(0.3, hash(id + seed));
  float onL = step(0.3, hash(id - vec2(1.0, 0.0) + seed));
  float onR = step(0.3, hash(id + vec2(1.0, 0.0) + seed));
  float up   = on * step(0.84, hash(id.yx + seed * 1.7));
  vec2 below = id - vec2(0.0, 1.0);
  float down = step(0.3, hash(below + seed)) * step(0.84, hash(below.yx + seed * 1.7));
  float d = 1e3;
  if (on > 0.5) {
    d = min(d, seg(f, c, vec2(mix(0.5, 1.0, onR), 0.5)));
    d = min(d, seg(f, c, vec2(mix(0.5, 0.0, onL), 0.5)));
    if (up > 0.5) d = min(d, seg(f, c, vec2(0.5, 1.0)));
  }
  if (down > 0.5) d = min(d, seg(f, c, vec2(0.5, 0.0)));
  float via = max(on * (1.0 - onL * onR), max(up, down));
  return vec2(d, via > 0.5 ? length(f - c) : 1e3);
}

void main(){
  vec2 res = u_resolution;
  float aspect = res.x / res.y;
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.y;
  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);
  float pr = u_progress;
  float speed = 0.3 + abs(u_velocity) * 1.4;

  // lớp trước: dây ngang (đồng)
  float s1 = 12.0;
  vec2 p1 = uv * s1 + vec2(0.0, pr * 5.0);
  vec2 r1 = route(p1, 3.1);
  float aa1 = s1 / res.y * 1.4;
  float line1 = 1.0 - smoothstep(0.055, 0.055 + aa1, r1.x);
  float via1 = 1.0 - smoothstep(0.15, 0.15 + aa1, r1.y);
  float hole1 = 1.0 - smoothstep(0.065, 0.065 + aa1, r1.y);
  float row = floor(p1.y);
  float ph = fract(u_time * speed * (0.5 + hash(vec2(row, 1.3))) - p1.x * 0.055 + hash(vec2(row, 7.7)));
  float pulse = exp(-ph * 16.0);

  // lớp sau: dây dọc (xoay 90°), nhỏ hơn và trôi chậm hơn → chiều sâu
  float s2 = 7.5;
  vec2 p2 = vec2(uv.y, -uv.x) * s2 + vec2(pr * 1.6, 0.0);
  vec2 r2 = route(p2, 9.4);
  float aa2 = s2 / res.y * 1.4;
  float line2 = 1.0 - smoothstep(0.045, 0.045 + aa2, r2.x);
  float via2 = 1.0 - smoothstep(0.12, 0.12 + aa2, r2.y);

  vec3 copper = vec3(0.86, 0.52, 0.3);
  vec3 cool = vec3(0.3, 0.5, 0.66);
  float md = smoothstep(0.42, 0.0, length(uv - m));

  vec3 col = vec3(0.016, 0.018, 0.026);
  vec2 dg = abs(fract(p1) - 0.5);
  col += 0.018 * step(0.46, min(dg.x, dg.y));                         // chấm lưới routing
  col += cool * (line2 * 0.07 + via2 * 0.08);
  col += copper * line1 * (0.13 + md * 0.35);
  col += copper * (via1 - hole1 * 0.7) * (0.2 + md * 0.3);
  vec3 hot = mix(u_accent, vec3(1.0), 0.35);
  col += hot * line1 * pulse * 0.95;
  col += u_accent * exp(-r1.x * 9.0) * pulse * 0.22 * step(r1.x, 1.0); // quầng quanh xung

  gl_FragColor = vec4(col, 1.0);
}`;
