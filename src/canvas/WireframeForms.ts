// Port từ threeui-main/src/shaders/neuform-isolated/sources/wireframe-forms.html (WireframeEngine):
// 3 khối wireframe (stella octangula, hai trụ đan nhau, icosphere 2 lớp) chiếu phối cảnh fov/(fov+z),
// cạnh mờ theo độ sâu, đỉnh sáng ở phía trước. Gộp cả 3 khối vào một canvas; góc xoay do section điều khiển.
// Không tự RAF: section gọi render(ax, ay) trong onTick.
import { state } from "../core/state";

type V3 = { x: number; y: number; z: number };
type Shape = { points: V3[]; edges: [number, number][]; proj: Float32Array };

function cube(): Shape {
  const s = 80, points: V3[] = [], edges: [number, number][] = [];
  points.push({ x: s, y: s, z: s }, { x: -s, y: -s, z: s }, { x: -s, y: s, z: -s }, { x: s, y: -s, z: -s });
  points.push({ x: -s, y: -s, z: -s }, { x: s, y: s, z: -s }, { x: s, y: -s, z: s }, { x: -s, y: s, z: s });
  edges.push([0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]);
  edges.push([4, 5], [4, 6], [4, 7], [5, 6], [5, 7], [6, 7]);
  return { points, edges, proj: new Float32Array(points.length * 3) };
}

function cylinders(): Shape {
  const r = 70, segments = 24, points: V3[] = [], edges: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2, next = (i + 1) % segments;
    points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r, z: -30 }, { x: Math.cos(t) * r, y: Math.sin(t) * r, z: 30 });
    edges.push([i * 2, next * 2], [i * 2 + 1, next * 2 + 1], [i * 2, i * 2 + 1]);
  }
  const off = points.length;
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2, next = (i + 1) % segments;
    points.push({ x: Math.cos(t) * r, y: -30, z: Math.sin(t) * r }, { x: Math.cos(t) * r, y: 30, z: Math.sin(t) * r });
    edges.push([off + i * 2, off + next * 2], [off + i * 2 + 1, off + next * 2 + 1], [off + i * 2, off + i * 2 + 1]);
  }
  return { points, edges, proj: new Float32Array(points.length * 3) };
}

function sphere(): Shape {
  const t = (1 + Math.sqrt(5)) / 2, s = 50, points: V3[] = [], edges: [number, number][] = [];
  const p = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  p.forEach((v) => points.push({ x: v[0] * s, y: v[1] * s, z: v[2] * s }));
  const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (dist(points[i], points[j]) < s * 2.1) edges.push([i, j]);
  p.forEach((v) => points.push({ x: v[0] * s * 0.5, y: v[1] * s * 0.5, z: v[2] * s * 0.5 }));
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) if (dist(points[12 + i], points[12 + j]) < s * 1.1) edges.push([12 + i, 12 + j]);
    edges.push([i, 12 + i]);
  }
  return { points, edges, proj: new Float32Array(points.length * 3) };
}

// 4 mức alpha cho cạnh (gom stroke theo mức để ít đổi strokeStyle)
const BUCKETS = 4;

export function createWireframeForms(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const shapes = [cube(), cylinders(), sphere()];
  let W = 1, H = 1, scale = 1;
  const strokes = Array.from({ length: BUCKETS }, (_, i) => `rgba(255,255,255,${(((i + 0.5) / BUCKETS) * 0.9 + 0.1) * 0.4})`);

  const resize = (w = canvas.clientWidth, h = canvas.clientHeight) => {
    W = Math.max(1, w); H = Math.max(1, h);
    const dpr = Math.min(devicePixelRatio || 1, 2) * state.quality;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // khối gốc rộng ~ ±90px trong ô ~260px; 3 ô xếp ngang hoặc dọc tuỳ tỉ lệ canvas
    scale = (W >= H ? Math.min(W / 3, H) : Math.min(W, H / 3)) / 260;
  };

  function project(sh: Shape, ax: number, ay: number, cx: number, cy: number) {
    const cX = Math.cos(ax), sX = Math.sin(ax), cY = Math.cos(ay), sY = Math.sin(ay), fov = 400;
    for (let i = 0; i < sh.points.length; i++) {
      const p = sh.points[i];
      const x = p.x * cY - p.z * sY;
      let z = p.z * cY + p.x * sY;
      const y = p.y * cX - z * sX;
      z = z * cX + p.y * sX;
      const k = fov / (fov + z);
      sh.proj[i * 3] = x * k * scale + cx;
      sh.proj[i * 3 + 1] = y * k * scale + cy;
      sh.proj[i * 3 + 2] = z;
    }
  }

  resize();
  return {
    resize,
    render(ax: number, ay: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 0.8;
      const horizontal = W >= H;
      shapes.forEach((sh, n) => {
        const cx = horizontal ? (W * (n + 0.5)) / 3 : W / 2;
        const cy = horizontal ? H / 2 : (H * (n + 0.5)) / 3;
        project(sh, ax + n * 0.7, ay - n * 0.9, cx, cy);
      });
      for (let b = 0; b < BUCKETS; b++) {
        ctx.beginPath();
        for (const sh of shapes) {
          const P = sh.proj;
          for (const [i, j] of sh.edges) {
            const depth = (P[i * 3 + 2] + P[j * 3 + 2]) / 2;
            const alpha = Math.max(0.1, 1 - depth / 200);
            const bucket = Math.min(BUCKETS - 1, Math.floor(((Math.min(alpha, 1) - 0.1) / 0.9) * BUCKETS));
            if (bucket !== b) continue;
            ctx.moveTo(P[i * 3], P[i * 3 + 1]);
            ctx.lineTo(P[j * 3], P[j * 3 + 1]);
          }
        }
        ctx.strokeStyle = strokes[b];
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (const sh of shapes) {
        const P = sh.proj;
        for (let i = 0; i < sh.points.length; i++) {
          if (1 - P[i * 3 + 2] / 200 > 0.5) ctx.fillRect(P[i * 3] - 1, P[i * 3 + 1] - 1, 2, 2);
        }
      }
    },
  };
}
