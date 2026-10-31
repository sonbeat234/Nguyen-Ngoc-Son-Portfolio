// lazy.ts: mount renderer nặng khi section còn cách viewport < 1 màn hình.
// V5-perf (f): trước đây unmount khi > 2 màn rồi mount lại mỗi lần cuộn về → dựng lại canvas / bake lại sprite / biên
// dịch lại shader ngay trước chuyển cảnh (long task). Giờ:
//  - prewarm: mount sớm trong requestIdleCallback sau khi trang rảnh (không chờ tới lúc cuộn gần);
//  - keepAlive: đã mount thì giữ (canvas 2D không tốn context; WebGL chỉ giữ khi còn trong ngân sách context ≤ 6,
//    vendor.ts quyết định) — render vẫn chỉ chạy khi section hiện (IntersectionObserver của từng renderer).
export type Mountable = { mount: () => void; unmount: () => void };
export type LazyOpts = { keepAlive?: () => boolean; prewarm?: boolean };

const idle = (fn: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1200);

export function lazyMount(el: HTMLElement, m: Mountable, { keepAlive = () => true, prewarm = true }: LazyOpts = {}) {
  let mounted = false, stopped = false;
  const mount = () => { if (!mounted && !stopped) { m.mount(); mounted = true; } };
  const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) mount(); }, { rootMargin: "100% 0px 100% 0px" });
  const far = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting && mounted && !keepAlive()) { m.unmount(); mounted = false; }
  }, { rootMargin: "200% 0px 200% 0px" });
  near.observe(el); far.observe(el);
  // dựng sẵn khi rảnh: sau preloader (window "signal:intro") rồi chờ idle
  if (prewarm) addEventListener("signal:intro", () => idle(mount), { once: true });
  return {
    get mounted() { return mounted; },
    /** dừng hẳn: ngừng theo dõi và unmount nếu đang mount (hiệu ứng chạy một lần rồi thôi) */
    stop() { stopped = true; near.disconnect(); far.disconnect(); if (mounted) { m.unmount(); mounted = false; } },
  };
}
