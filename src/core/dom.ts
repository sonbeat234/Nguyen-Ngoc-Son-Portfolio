export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];

/** tỉ lệ viewport mà element phủ (0..1) và tiến độ đi qua element khi nó lấp viewport */
export function coverage(el: Element, vh = window.innerHeight) {
  const r = el.getBoundingClientRect();
  const cover = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
  const progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
  return { cover, progress, rect: r };
}
