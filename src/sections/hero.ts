// Chương 01 — Origin (hero), scene "nebula". Spec mục 12/01 + mục 9.
// Lớp (dưới lên): stage nebula → canvas particle wordmark "SIGNAL" → precision frame → nội dung.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { $ } from "../core/dom";
import { state } from "../core/state";
import { mountVendor } from "../core/vendor";
import { createParticleWordmark } from "../three/ParticleWordmark";
import { initPrecisionFrame } from "../fx/ui/precisionFrame";
import { decodeText } from "../fx/text/decode";

/** giá trị chia sẻ giữa các lần mount (unmount/remount giữ nguyên trạng thái ghép chữ) */
const shared = { assemble: 0, disperse: 0, pointer: false };

export async function initHero() {
  const sec = $("#c01");
  const wm = $(".c01-wm", sec);
  const frame = $(".c01-frame", sec);
  const title = $(".c01-title", sec);
  const eyebrow = $(".c01-eyebrow", sec);

  // font phải có trước khi lấy mẫu pixel chữ (không chặn quá 3s nếu mất mạng)
  await Promise.race([document.fonts.load('700 300px "Syncopate"'), new Promise((r) => setTimeout(r, 3000))]);

  // con trỏ chỉ "đẩy" hạt khi thực sự có chuột (hoặc ngón tay đang chạm)
  addEventListener("pointermove", (e) => { shared.pointer = e.pointerType === "mouse" || e.buttons > 0; }, { passive: true });
  addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") shared.pointer = false; });
  document.documentElement.addEventListener("pointerleave", () => (shared.pointer = false));

  mountVendor(sec, $<HTMLCanvasElement>("canvas", wm), (c) => createParticleWordmark(c, "SIGNAL"), (r) => {
    r.uniforms.u_assemble.value = shared.assemble;
    r.uniforms.u_disperse.value = shared.disperse;
    r.render(shared.pointer);
  });

  // pin 150%: hạt nổ tung theo cuộn, copy trôi lên và mờ, khung giãn và mờ
  const easeIn = gsap.parseEase("power2.in");
  ScrollTrigger.create({
    trigger: sec, start: "top top", end: "+=150%", pin: "#c01 .pin", scrub: true,
    onUpdate: (st) => {
      shared.disperse = easeIn(st.progress);
      wm.style.opacity = String(1 - Math.max(0, (st.progress - 0.8) / 0.2));
    },
  });
  gsap.to("#c01 .hero-copy", {
    yPercent: -40, opacity: 0, ease: "none",
    scrollTrigger: { trigger: sec, start: "top top", end: "+=100%", scrub: true },
  });
  gsap.to(frame, {
    scale: 1.08, opacity: 0, ease: "none",
    scrollTrigger: { trigger: sec, start: "top top", end: "+=120%", scrub: true },
  });
  gsap.to("#c01 .c01-hint", {
    opacity: 0, ease: "none",
    scrollTrigger: { trigger: sec, start: "top top", end: "+=25%", scrub: true },
  });

  // headline: masked char reveal (tách 1 lần sau khi font đã tải; mask theo word nên không cần tách lại khi resize)
  const split = SplitText.create(title, { type: "words,chars", mask: "words" });
  title.classList.add("is-split");
  const intro = gsap.timeline({ paused: true });
  if (state.reduced) {
    intro.from([title, ".c01-lede", ".c01-ctas", ".c01-frame-inner", ".c01-hint"], { opacity: 0, duration: 0.8, ease: "power1.out" });
  } else {
    intro
      .from(".c01-frame-inner", { opacity: 0, scale: 1.035, duration: 1.4, ease: "expo.out" }, 0)
      .from(split.chars, {
        yPercent: 115, rotate: 8, opacity: 0, filter: "blur(6px)",
        duration: 1.15, ease: "power4.out", stagger: 0.018,
      }, 0.15)
      .from(".c01-lede", { y: 20, opacity: 0, duration: 0.9, ease: "power3.out" }, 0.55)
      .from(".c01-ctas > *", { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 0.7)
      .from(".c01-hint", { y: 14, opacity: 0, duration: 0.8, ease: "power2.out" }, 1.1);
  }
  eyebrow.style.visibility = "hidden";

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    eyebrow.style.visibility = "";
    decodeText(eyebrow, { duration: 1100 });
    intro.play();
    if (state.reduced) shared.assemble = 1;
    else gsap.to(shared, { assemble: 1, duration: 2.8, ease: "expo.out" });
  };
  addEventListener("signal:intro", start, { once: true });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
  initPrecisionFrame(frame, () => visible);
}
