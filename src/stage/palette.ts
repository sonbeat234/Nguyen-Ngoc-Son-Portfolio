// Màu cho phần không đọc được CSS (shader nền, con trỏ SVG, neon canvas): đọc lại token trong styles/tokens.css
// và data-accent / data-accent2 của từng section trong index.html. Đổi palette chỉ cần sửa hai chỗ đó.
export type RGB = [number, number, number];

const root = getComputedStyle(document.documentElement);

/** giá trị chuỗi của một token CSS, vd token("--primary") → "#8b7bff" */
export const token = (name: string) => root.getPropertyValue(name).trim();

/** "#rgb" / "#rrggbb" / "rgb(r, g, b)" → [0..1] × 3 (xám trung tính nếu không đọc được) */
export function rgb01(color: string): RGB {
  const c = color.trim();
  if (c.startsWith("#")) {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join("") : c.slice(1, 7);
    const n = parseInt(h, 16);
    if (!Number.isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
  return [0.5, 0.5, 0.5];
}

export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** [0..1] × 3 → "rgb(r g b / a)" cho canvas 2D */
export const css = (c: RGB, a = 1) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)} / ${a})`;

/** accent / accent2 của section gắn scene `id` (data-scene) */
export function sceneAccent(id: string): { a: RGB; b: RGB } {
  const el = document.querySelector<HTMLElement>(`[data-scene="${id}"]`);
  return { a: rgb01(el?.dataset.accent ?? token("--primary")), b: rgb01(el?.dataset.accent2 ?? token("--primary-2")) };
}

export const palette = {
  primary: rgb01(token("--primary")),
  primary2: rgb01(token("--primary-2")),
  signal: rgb01(token("--signal")),
  ink: rgb01(token("--ink")),
  panel: rgb01(token("--panel")),
  bone: rgb01(token("--bone")),
  mute: rgb01(token("--mute")),
  copper: rgb01(token("--copper")),
};
