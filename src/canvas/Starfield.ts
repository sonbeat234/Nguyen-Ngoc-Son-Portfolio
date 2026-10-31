// Port 2 lớp sao trong threeui-main/src/shaders/neuform-isolated/sources/imaginie-starfield.html:
// - ambient: 70 sao trôi lên, toàn trang (đặt trên stage, dưới nội dung); trôi nhanh hơn khi cuộn
// - portal: 45 sao phát sáng có shadowBlur, nảy trong khung vòm (chương 11)
// Không tự RAF: gọi render() từ onTick.
import { state } from "../core/state";
import { palette, css } from "../stage/palette";

const STAR = css(palette.bone);

const PORTAL_COLORS = [
  "rgba(230, 194, 158, ", // bronze/gold
  "rgba(244, 244, 246, ", // trắng mềm
  "rgba(173, 140, 255, ", // tím
  "rgba(135, 206, 250, ", // xanh lạnh
];

export function createAmbientStarfield(canvas: HTMLCanvasElement, count = 70) {
  const ctx = canvas.getContext("2d")!;
  let W = 0, H = 0;
  let stars: { x: number; y: number; size: number; opacity: number; drift: number }[] = [];
  const resize = () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      size: Math.random() * 0.8 + 0.2, opacity: Math.random() * 0.6 + 0.1, drift: Math.random() * 0.02 + 0.01,
    }));
  };
  resize();
  addEventListener("resize", resize);
  return {
    render(dt: number) {
      ctx.clearRect(0, 0, W, H);
      // tốc độ gốc 0.01–0.03 px/frame (60fps) + kéo theo vận tốc cuộn
      const push = 60 * dt * (1 + Math.abs(state.scroll.smooth) * 60) * (state.reduced ? 0.25 : 1);
      const dir = state.scroll.direction;
      ctx.fillStyle = STAR;
      for (const s of stars) {
        s.y -= s.drift * push * dir;
        if (s.y < 0) s.y += H; else if (s.y > H) s.y -= H;
        ctx.globalAlpha = s.opacity;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.globalAlpha = 1;
    },
    dispose() { removeEventListener("resize", resize); },
  };
}

export function createPortalStarfield(canvas: HTMLCanvasElement, count = 45) {
  const ctx = canvas.getContext("2d")!;
  let W = 0, H = 0;
  type Star = { x: number; y: number; radius: number; color: string; speed: number; angle: number; pulse: number };
  let stars: Star[] = [];
  const init = () => {
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      radius: Math.random() * 1.5 + 0.5,
      color: PORTAL_COLORS[Math.floor(Math.random() * PORTAL_COLORS.length)],
      speed: Math.random() * 0.15 + 0.05, angle: Math.random() * Math.PI * 2, pulse: Math.random() * 0.02,
    }));
  };
  const resize = (w = canvas.clientWidth, h = canvas.clientHeight) => {
    const dpr = Math.min(devicePixelRatio || 1, 2) * state.quality;
    W = Math.max(1, w); H = Math.max(1, h);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    init();
  };
  resize();
  return {
    resize,
    /** boost: hệ số tốc độ (vd theo tiến độ chương) */
    render(boost = 1) {
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();
      for (const s of stars) {
        s.x += Math.cos(s.angle) * s.speed * boost;
        s.y += Math.sin(s.angle) * s.speed * boost;
        if (s.x < 0 || s.x > W) s.angle = Math.PI - s.angle;
        if (s.y < 0 || s.y > H) s.angle = -s.angle;
        s.speed = Math.max(0.02, Math.min(s.speed + (Math.random() - 0.5) * 0.01, 0.25));
        const alpha = 0.3 + Math.abs(Math.sin(now * s.pulse)) * 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color + alpha + ")";
        ctx.shadowBlur = s.radius * 4;
        ctx.shadowColor = s.color + "0.8)";
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    },
    dispose() { /* 2D canvas: không giữ tài nguyên ngoài */ },
  };
}
