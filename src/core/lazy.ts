// lazy.ts: mount renderer nặng khi section còn cách viewport < 1 màn hình, unmount khi > 2 màn
export type Mountable = { mount: () => void; unmount: () => void };
export function lazyMount(el: HTMLElement, m: Mountable) {
  let mounted = false;
  const near = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !mounted) { m.mount(); mounted = true; }
  }, { rootMargin: "100% 0px 100% 0px" });
  const far = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting && mounted) { m.unmount(); mounted = false; }
  }, { rootMargin: "200% 0px 200% 0px" });
  near.observe(el); far.observe(el);
  return {
    get mounted() { return mounted; },
    /** dừng hẳn: ngừng theo dõi và unmount nếu đang mount (hiệu ứng chạy một lần rồi thôi) */
    stop() { near.disconnect(); far.disconnect(); if (mounted) { m.unmount(); mounted = false; } },
  };
}
