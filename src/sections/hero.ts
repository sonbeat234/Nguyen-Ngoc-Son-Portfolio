// Hero "Power-on": scene `wafer` (shader trượt wafer về giữa và zoom vào một die theo tiến độ pin).
// Lớp (dưới lên): stage → precision frame (toạ độ chuột + giờ UTC) → scrim → tên + copy + readout.
// Tên: V4 — hạt (WebGL, three/ParticleWordmark → createParticleName) bay về đúng vị trí từng ký tự DOM rồi nhường lại
// cho chữ thật (context được trả ngay sau đó); không có WebGL / reduced → ký tự dựng lên như cũ.
// Sau intro: chữ gần con trỏ nhô lên, to ra, ngả màu accent và ĐẬM lên (sóng độ đậm: font variable Unbounded wght 200–900).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { onTick } from "../core/loop";
import { damp } from "../core/math";
import { mountVendor, type VendorHandle } from "../core/vendor";
import { initPrecisionFrame } from "../fx/ui/precisionFrame";
import { decodeText } from "../fx/text/decode";
import { createParticleName, type NameLine } from "../three/ParticleWordmark";

type ParticleName = ReturnType<typeof createParticleName>;
import { palette } from "../stage/palette";

// renderer hạt tạo + biên dịch shader TRONG pha tải (main.ts gọi prewarmHeroParticles trước khi preloader xong),
// intro chỉ còn lấy mẫu điểm đích → không khựng. Gắn qua mountVendor (lazy mount + trả context khi stop()).
let particles: { h: VendorHandle<ParticleName>; host: HTMLElement; ox: number; oy: number } | null = null;

export function prewarmHeroParticles() {
  if (state.reduced) return;
  const sec = $("#hero"), pin = $(".pin", sec);
  const host = document.createElement("div");
  host.className = "hero-particles";
  host.setAttribute("aria-hidden", "true");
  host.innerHTML = "<canvas></canvas>";
  pin.appendChild(host);
  const p = { host, ox: 0, oy: 0, h: null as unknown as VendorHandle<ParticleName> };
  p.h = mountVendor(sec, $<HTMLCanvasElement>("canvas", host),
    (cv) => createParticleName(cv, [palette.primary, palette.signal, palette.bone]),
    (r) => r.render(state.mouse.x - p.ox, state.mouse.y - p.oy));
  particles = p;
}

/** hạt hội tụ thành tên: canvas phủ cả pin, điểm đích = vị trí thật của từng ký tự đã tách */
function particleName(sec: HTMLElement, name: HTMLElement, chars: HTMLElement[]) {
  const pin = $(".pin", sec);
  /** chạy hội tụ → chữ DOM hiện → hạt tắt → trả context. null nếu renderer chưa sẵn (fallback). */
  return () => {
    const p = particles, r = p?.h.r;
    if (!p || !r) { p?.h.stop(); p?.host.remove(); return null; }
    const box = pin.getBoundingClientRect();
    p.ox = box.left; p.oy = box.top;
    const probe = document.createElement("canvas").getContext("2d")!;
    const lines: NameLine[] = [];
    $$(".hero-line", name).forEach((ln) => {
      const cs = getComputedStyle(ln);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      probe.font = font;
      const m = probe.measureText(ln.textContent ?? "");
      const top = ln.getBoundingClientRect().top - box.top;
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.1;
      const baseline = top + (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      // vẽ TỪNG ký tự tại vị trí ô SplitText của nó (chữ tách mất kerning → khớp DOM hơn vẽ cả dòng)
      chars.filter((c) => ln.contains(c)).forEach((c) => lines.push({ text: c.textContent ?? "", font, letterSpacing: "0px", x: c.getBoundingClientRect().left - box.left, baseline }));
    });
    r.setLines(lines, { w: box.width, h: box.height });
    const h = p.h, host = p.host;
    const u = r.uniforms;
    return gsap.timeline({ onComplete: () => { h.stop(); host.remove(); } })
      .set(chars, { opacity: 0 }, 0)
      .to(u.u_assemble, { value: 1, duration: 1.7, ease: "power2.inOut" }, 0)
      .fromTo(chars, { opacity: 0, filter: "blur(8px)", yPercent: 8 }, { opacity: 1, filter: "blur(0px)", yPercent: 0, duration: 0.7, ease: "power2.out", stagger: 0.022 }, 1.2)
      .to(u.u_fade, { value: 1, duration: 0.7, ease: "power1.in" }, 1.4);
  };
}

export function initHero() {
  const sec = $("#hero");
  const q = gsap.utils.selector(sec);
  const name = $(".hero-name", sec);
  const eyebrow = $(".hero-eyebrow", sec);
  const frame = $(".hero-frame", sec);
  const readouts = $$(".hero-readout dd", sec);

  // pin 140%: copy trôi lên và mờ, khung giãn; shader wafer tự zoom theo progress của section
  ScrollTrigger.create({ trigger: sec, start: "top top", end: "+=140%", pin: "#hero .pin" });
  gsap.to(q(".hero-copy"), {
    yPercent: -16, opacity: 0, ease: "none",
    scrollTrigger: { trigger: sec, start: "top top", end: "+=90%", scrub: true },
  });
  gsap.to(frame, {
    scale: 1.06, opacity: 0, ease: "none",
    scrollTrigger: { trigger: sec, start: "top top", end: "+=120%", scrub: true },
  });
  gsap.to(q(".hero-readout, .hero-hint"), {
    y: 30, opacity: 0, ease: "none",
    scrollTrigger: { trigger: sec, start: "top top", end: "+=40%", scrub: true },
  });

  // tên: tách ký tự KHÔNG dùng mask (mask cắt mất dấu chồng của ễ/ọ/ơ)
  const split = SplitText.create(name, { type: "chars", charsClass: "hero-ch" });
  const chars = split.chars as HTMLElement[];
  const playParticles = state.reduced ? null : particleName(sec, name, chars);
  const intro = gsap.timeline({ paused: true, onComplete: () => { gsap.set(chars, { clearProps: "transform,filter,opacity" }); kinetic(); } });
  if (state.reduced) {
    intro.from(q(".hero-name, .hero-tag, .hero-lede, .hero-ctas, .hero-frame-inner, .hero-readout"), { opacity: 0, duration: 0.8, ease: "power1.out" });
  } else {
    gsap.set(chars, { opacity: 0 });                  // ẩn tới khi hạt (hoặc fallback) dựng tên
    intro
      .from(q(".hero-frame-inner"), { opacity: 0, scale: 1.035, duration: 1.4, ease: "expo.out" }, 0)
      .add(() => {
        if (playParticles?.()) return;
        gsap.fromTo(chars, { yPercent: 70, rotateX: -80, opacity: 0, filter: "blur(10px)", transformOrigin: "50% 100%" }, {
          yPercent: 0, rotateX: 0, opacity: 1, filter: "blur(0px)", duration: 1.25, ease: "expo.out", stagger: 0.04,
        });
      }, 0.05)
      .to({}, { duration: 2.3 }, 0)                   // giữ intro tới khi hạt nhường chỗ xong (onComplete → kinetic)
      .from(q(".hero-tag"), { y: 24, opacity: 0, filter: "blur(6px)", duration: 1, ease: "power3.out" }, 0.6)
      .from(q(".hero-lede"), { y: 20, opacity: 0, duration: 0.9, ease: "power3.out" }, 0.75)
      // yPercent (không phải y): CTA có data-magnetic, magnetic.ts điều khiển x/y — tránh hai tween giành cùng thuộc tính
      .from(q(".hero-ctas > *"), { yPercent: 60, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 0.85)
      .from(q(".hero-readout > div"), { x: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, 0.95)
      .from(q(".hero-hint"), { opacity: 0, duration: 0.8 }, 1.3)
      .add(() => name.classList.add("is-scanned"), 0.2);
  }
  eyebrow.style.visibility = "hidden";

  let started = false;
  addEventListener("signal:intro", () => {
    if (started) return;
    started = true;
    eyebrow.style.visibility = "";
    decodeText(eyebrow, { duration: 1100 });
    readouts.forEach((el, i) => setTimeout(() => decodeText(el, { duration: 900 }), 900 + i * 160));
    intro.play();
  }, { once: true });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
  initPrecisionFrame(frame, () => visible);

  // kinetic type: tâm ký tự đo lại khi h1 đổi kích thước, mỗi frame chỉ đọc rect của h1 ở tick "early"
  // rồi ghi transform ở tick thường. Không cấp phát trong tick.
  function kinetic() {
    if (state.touch || state.reduced) return;
    const n = chars.length;
    const cx = new Float32Array(n), cy = new Float32Array(n), k = new Float32Array(n);
    // sóng độ đậm (font-variation "wght" theo --k, CSS): khoá bề rộng mỗi ký tự ở độ đậm gốc để chữ đậm lên
    // không đẩy cả dòng (chỉ vẽ lại trong ô của nó, không reflow dây chuyền)
    const measure = () => {
      for (let i = 0; i < n; i++) chars[i].style.width = "";
      const base = name.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        const r = chars[i].getBoundingClientRect();
        cx[i] = r.left - base.left + r.width / 2;
        cy[i] = r.top - base.top + r.height / 2;
        chars[i].style.width = `${chars[i].offsetWidth}px`;   // bề rộng layout (không tính scale của kinetic)
      }
    };
    measure();
    new ResizeObserver(measure).observe(name);
    let ox = 0, oy = 0, radius = 160;
    onTick(() => {
      if (!visible) return;
      const r = name.getBoundingClientRect();
      ox = r.left; oy = r.top;
      radius = Math.max(120, r.height * 0.55);
    }, "early");
    onTick((_, dt) => {
      if (!visible) return;
      const mx = state.mouse.x - ox, my = state.mouse.y - oy;
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(mx - cx[i], my - cy[i]) / radius;
        const v = damp(k[i], Math.exp(-d * d), 9, dt);
        if (Math.abs(v - k[i]) < 0.002 && v < 0.01) { k[i] = v; continue; }
        k[i] = v;
        const s = chars[i].style;
        s.transform = `translate3d(0,${(-v * 0.12).toFixed(3)}em,0) scale(${(1 + v * 0.1).toFixed(3)})`;
        s.setProperty("--k", v.toFixed(3));
      }
    });
  }
}
