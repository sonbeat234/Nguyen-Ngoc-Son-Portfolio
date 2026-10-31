import { lazyMount } from "./lazy";
import { onTick } from "./loop";
import { releaseCanvas, liveContexts } from "./gl";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = { render: (...a: any[]) => void; resize?: (w: number, h: number) => void; dispose?: () => void };

export type VendorHandle<T> = {
  /** renderer đang sống (null khi đã unmount) */
  r: T | null;
  /** canvas hiện tại: sau mỗi unmount, canvas từng có context WebGL được thay bằng bản sao mới */
  canvas: HTMLCanvasElement;
  /** false = tạm ngưng render (vd lớp warp đang opacity 0) */
  active: boolean;
  /** gỡ hẳn renderer + trả WebGL context, không mount lại nữa */
  stop: () => void;
};

/**
 * Gắn renderer vendor vào section: tạo khi section cách viewport < 1 màn, huỷ khi > 2 màn,
 * chỉ render trong tick chung khi section giao viewport.
 */
export function mountVendor<T extends R>(
  section: HTMLElement,
  canvas: HTMLCanvasElement,
  create: (canvas: HTMLCanvasElement) => T,
  frame: (r: T) => void = (r) => r.render(),
): VendorHandle<T> {
  const h: VendorHandle<T> = { r: null, canvas, active: true, stop: () => {} };
  let off: (() => void) | null = null, ro: ResizeObserver | null = null, io: IntersectionObserver | null = null;
  const vis = { on: false };
  // WebGL: giữ context sau khi mount nếu tổng context còn trong ngân sách (≤ 6, CONVENTIONS 3); không prewarm sớm
  // (hạt hero tự dựng trong pha tải). Canvas 2D dùng lazyMount trực tiếp (giữ luôn).
  const lazy = lazyMount(section, {
    mount() {
      const r = create(h.canvas);
      h.r = r;
      ro = new ResizeObserver(() => r.resize?.(h.canvas.clientWidth, h.canvas.clientHeight));
      ro.observe(h.canvas);
      r.resize?.(h.canvas.clientWidth, h.canvas.clientHeight);
      io = new IntersectionObserver(([e]) => (vis.on = e.isIntersecting));
      io.observe(section);
      off = onTick(() => { if (vis.on && h.active && h.r) frame(h.r); });
    },
    unmount() {
      off?.(); ro?.disconnect(); io?.disconnect();
      off = null; ro = null; io = null;
      h.r?.dispose?.();
      h.r = null;
      if (releaseCanvas(h.canvas)) {
        const fresh = h.canvas.cloneNode(false) as HTMLCanvasElement;
        h.canvas.replaceWith(fresh);
        h.canvas = fresh;
      }
    },
  }, { keepAlive: () => liveContexts() <= 4, prewarm: false });
  h.stop = () => lazy.stop();
  return h;
}
