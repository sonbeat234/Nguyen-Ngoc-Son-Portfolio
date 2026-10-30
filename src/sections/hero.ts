// Hero "Power-on": scene `wafer` (shader trượt wafer về giữa và zoom vào một die theo tiến độ pin).
// Lớp (dưới lên): stage → precision frame (toạ độ chuột + giờ UTC) → scrim → tên + copy + readout.
// Tên: ký tự dựng lên khi intro; sau đó chữ gần con trỏ nhô lên, to ra và ngả màu accent (kinetic type).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { onTick } from "../core/loop";
import { damp } from "../core/math";
import { initPrecisionFrame } from "../fx/ui/precisionFrame";
import { decodeText } from "../fx/text/decode";

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
  const intro = gsap.timeline({ paused: true, onComplete: () => { gsap.set(chars, { clearProps: "transform,filter,opacity" }); kinetic(); } });
  if (state.reduced) {
    intro.from(q(".hero-name, .hero-tag, .hero-lede, .hero-ctas, .hero-frame-inner, .hero-readout"), { opacity: 0, duration: 0.8, ease: "power1.out" });
  } else {
    intro
      .from(q(".hero-frame-inner"), { opacity: 0, scale: 1.035, duration: 1.4, ease: "expo.out" }, 0)
      .from(chars, {
        yPercent: 70, rotateX: -80, opacity: 0, filter: "blur(10px)", transformOrigin: "50% 100%",
        duration: 1.25, ease: "expo.out", stagger: 0.04,
      }, 0.1)
      .from(q(".hero-tag"), { y: 24, opacity: 0, filter: "blur(6px)", duration: 1, ease: "power3.out" }, 0.6)
      .from(q(".hero-lede"), { y: 20, opacity: 0, duration: 0.9, ease: "power3.out" }, 0.75)
      .from(q(".hero-ctas > *"), { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 0.85)
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
    const measure = () => {
      const base = name.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        const r = chars[i].getBoundingClientRect();
        cx[i] = r.left - base.left + r.width / 2;
        cy[i] = r.top - base.top + r.height / 2;
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
