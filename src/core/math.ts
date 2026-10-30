export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** lerp không phụ thuộc framerate: lambda ~ 4 (chậm) .. 20 (nhanh) */
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const mapRange = (v: number, a: number, b: number, c: number, d: number) =>
  c + (d - c) * clamp((v - a) / (b - a));
