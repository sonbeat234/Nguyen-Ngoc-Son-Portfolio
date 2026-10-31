// Hero "Power-on": scene `wafer` (shader trượt wafer về giữa và zoom vào một die theo tiến độ pin).
// Lớp (dưới lên): stage → precision frame (toạ độ chuột + giờ UTC) → scrim → tên + copy + readout.
// Tên: V4 — hạt (WebGL, three/ParticleWordmark → createParticleName) bay về đúng vị trí từng ký tự DOM rồi nhường lại
// cho chữ thật (context được trả ngay sau đó); không có WebGL / reduced → ký tự dựng lên như cũ.
// Sau intro: chữ gần con trỏ nhô lên, to ra, ngả màu accent và ĐẬM lên (sóng độ đậm: font variable Unbounded wght 200–900).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { mountVendor, type VendorHandle } from "../core/vendor";
import { initPrecisionFrame } from "../fx/ui/precisionFrame";
import { decodeText } from "../fx/text/decode";
import { createParticleName } from "../three/ParticleWordmark";
import { createHeroName } from "./heroName";

type HeroName = ReturnType<typeof createHeroName>;

type ParticleName = ReturnType<typeof createParticleName>;
import { palette } from "../stage/palette";
import { profile, esc } from "../content/profile";

/**
 * Readout hero: sau "Education" (cố định trong index.html) là các hồ sơ ngoài (LinkedIn, GitHub…) lấy từ
 * profile.contact — chỉ hiện handle ngắn cho gọn, mở tab mới. V5: điểm IELTS / TOEIC chỉ còn ở Profile + CV.
 */
function renderReadoutLinks(dl: HTMLElement) {
  const handle = (href: string) => {
    try { return new URL(href).pathname.split("/").filter(Boolean).pop() ?? ""; } catch { return ""; }
  };
  dl.insertAdjacentHTML("beforeend", profile.contact.filter((c) => /^https?:/.test(c.href)).slice(0, 2).map((c) =>
    `<div><dt>${esc(c.label)}</dt><dd data-decode="manual"><a href="${esc(c.href)}" target="_blank" rel="noopener noreferrer">${esc(handle(c.href) || c.value)}<span class="sr-only"> (opens in a new tab)</span></a></dd></div>`,
  ).join(""));
}

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

/**
 * hạt hội tụ thành tên: canvas phủ cả pin, điểm đích = vị trí của từng grapheme trên dòng chữ THẬT (đã kerning,
 * cùng font — sections/heroName.ts), canvas lấy mẫu phủ cả pin nên dấu chồng trên chữ hoa không bị cắt.
 */
function particleName(sec: HTMLElement, hn: HeroName, chars: HTMLElement[]) {
  const pin = $(".pin", sec);
  /** chạy hội tụ → chữ DOM hiện → hạt tắt → trả context. null nếu renderer chưa sẵn (fallback). */
  return () => {
    const p = particles, r = p?.h.r;
    if (!p || !r) { p?.h.stop(); p?.host.remove(); return null; }
    const box = pin.getBoundingClientRect();
    p.ox = box.left; p.oy = box.top;
    r.setLines(hn.particleLines(box.left, box.top), { w: box.width, h: box.height });
    const h = p.h, host = p.host;
    const u = r.uniforms;
    // V5-perf (d): chữ hiện bằng opacity + dịch nhẹ (không blur từng ký tự; ?legacyfx giữ blur cũ)
    const blur = state.legacyfx;
    return gsap.timeline({ onComplete: () => { h.stop(); host.remove(); } })
      .set(chars, { opacity: 0 }, 0)
      .to(u.u_assemble, { value: 1, duration: 1.7, ease: "power2.inOut" }, 0)
      .fromTo(chars, { opacity: 0, yPercent: 8, ...(blur ? { filter: "blur(8px)" } : {}) },
        { opacity: 1, yPercent: 0, ...(blur ? { filter: "blur(0px)" } : {}), duration: 0.7, ease: "power2.out", stagger: 0.022 }, 1.2)
      .to(u.u_fade, { value: 1, duration: 0.7, ease: "power1.in" }, 1.4);
  };
}

export function initHero() {
  const sec = $("#hero");
  const q = gsap.utils.selector(sec);
  const name = $(".hero-name", sec);
  const eyebrow = $(".hero-eyebrow", sec);
  const frame = $(".hero-frame", sec);
  renderReadoutLinks($(".hero-readout", sec));
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

  // tên: dòng chữ thật giữ kerning; desktop có lớp phủ từng grapheme (intro + sóng độ đậm) — sections/heroName.ts.
  // Cảm ứng / reduced: không lớp phủ, intro chạy trên chính các dòng chữ.
  const hn = createHeroName(name, { overlay: !state.reduced && !state.touch });
  const chars: HTMLElement[] = hn.els.length ? hn.els : $$(".hero-line", name);
  const playParticles = state.reduced ? null : particleName(sec, hn, chars);
  const intro = gsap.timeline({ paused: true, onComplete: () => { gsap.set(chars, { clearProps: "transform,filter,opacity" }); hn.wave(); } });
  if (state.reduced) {
    intro.from(q(".hero-name, .hero-tag, .hero-lede, .hero-ctas, .hero-frame-inner, .hero-readout"), { opacity: 0, duration: 0.8, ease: "power1.out" });
  } else {
    gsap.set(chars, { opacity: 0 });                  // ẩn tới khi hạt (hoặc fallback) dựng tên
    intro
      .from(q(".hero-frame-inner"), { opacity: 0, scale: 1.035, duration: 1.4, ease: "expo.out" }, 0)
      .add(() => {
        if (playParticles?.()) return;
        const blur = state.legacyfx;   // V5-perf (d): không blur từng ký tự
        gsap.fromTo(chars, { yPercent: 70, rotateX: -80, opacity: 0, transformOrigin: "50% 100%", ...(blur ? { filter: "blur(10px)" } : {}) }, {
          yPercent: 0, rotateX: 0, opacity: 1, ...(blur ? { filter: "blur(0px)" } : {}), duration: 1.25, ease: "expo.out", stagger: 0.04,
        });
      }, 0.05)
      .to({}, { duration: 2.3 }, 0)                   // giữ intro tới khi hạt nhường chỗ xong (onComplete → kinetic)
      .from(q(".hero-tag"), { y: 24, opacity: 0, ...(state.legacyfx ? { filter: "blur(6px)" } : {}), duration: 1, ease: "power3.out" }, 0.6)
      .from(q(".hero-lede"), { y: 20, opacity: 0, duration: 0.9, ease: "power3.out" }, 0.75)
      // yPercent (không phải y): CTA có data-magnetic, magnetic.ts điều khiển x/y — tránh hai tween giành cùng thuộc tính
      .from(q(".hero-ctas > *"), { yPercent: 60, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 0.85)
      .from(q(".hero-readout > div"), { x: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, 0.95)
      .from(q(".hero-hint"), { opacity: 0, duration: 0.8 }, 1.3)
      .add(() => {
        name.classList.add("is-scanned");
        name.addEventListener("animationend", () => name.classList.remove("is-scanned"), { once: true });
      }, 0.2);
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

}
