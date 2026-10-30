// Theo dõi mọi WebGL context đang sống. Three r128 và CRT không tự trả context khi dispose(),
// nên lazy unmount phải gọi releaseCanvas() để không chạm giới hạn "too many active WebGL contexts".
type GL = WebGLRenderingContext | WebGL2RenderingContext;
const live = new Set<GL>();
const byCanvas = new WeakMap<HTMLCanvasElement, GL>();
const original = HTMLCanvasElement.prototype.getContext as unknown as (this: HTMLCanvasElement, t: string, a?: unknown) => unknown;

(HTMLCanvasElement.prototype as unknown as { getContext: (t: string, a?: unknown) => unknown }).getContext = function (
  this: HTMLCanvasElement, type: string, attrs?: unknown,
) {
  const ctx = original.call(this, type, attrs);
  if (ctx && type.startsWith("webgl") && !byCanvas.has(this)) {
    const gl = ctx as GL;
    byCanvas.set(this, gl);
    live.add(gl);
    this.addEventListener("webglcontextlost", () => live.delete(gl));
  }
  return ctx;
};

export const liveContexts = () => live.size;

/** trả WebGL context của canvas về cho trình duyệt; true nếu canvas từng có context WebGL */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  const gl = byCanvas.get(canvas);
  if (!gl) return false;
  live.delete(gl);
  byCanvas.delete(canvas);
  if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}
