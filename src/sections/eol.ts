// End of line (footer, scene `ribbon`).
// - Tên khổng lồ dạng outline typeflow: rê chuột thì phần chữ dưới con trỏ được tô (radial-gradient + background-clip),
//   touch / không hover: vệt sáng tự chạy (CSS). Chữ trồi lên theo cuộn khi vào chương.
// - Liên hệ: CHỈ render khi profile.contact có dữ liệu thật; trống thì gỡ hẳn khối.
// - Session uptime (cập nhật 1 lần/giây), nút "Back to power-on" tua ngược về đầu trang qua mọi dissolve.
// - V4: biển neon "THANKS" (canvas/NeonSign — port glassblown-neon.html): ống thuỷ tinh màu palette, bật đèn lần lượt
//   khi vào màn, thỉnh thoảng một chữ chập chờn. Hiệu ứng nặng duy nhất của section: mount/unmount qua core/lazy.
//   Biển là trang trí (aria-hidden); chữ thật là câu cảm ơn ngay dưới. Reduced: đèn sáng tĩnh.
import gsap from "gsap";
import { $ } from "../core/dom";
import { state } from "../core/state";
import { onTick } from "../core/loop";
import { scrollTo } from "../core/scroll";
import { lazyMount } from "../core/lazy";
import { profile, esc } from "../content/profile";
import { createNeonSign, type NeonPalette } from "../canvas/NeonSign";
import { palette, css, mixRgb } from "../stage/palette";

const pad = (n: number) => String(n).padStart(2, "0");

/** bảng màu ống neon suy ra từ palette (PRIMARY lõi, PRIMARY_2 quầng, BONE tim sáng) */
function neonPalette(): NeonPalette {
  const P = palette;
  return {
    spill: [css(P.primary), css(P.primary2)], bloom: [css(P.primary), css(P.primary2)],
    core: [css(P.primary), css(P.primary2), css(P.bone)],
    glass: [css(mixRgb(P.panel, P.primary, 0.28)), css(mixRgb(P.ink, P.primary, 0.16))], spec: css(P.bone, 0.5),
    tip: [css(mixRgb(P.panel, P.primary, 0.2)), css(P.primary2, 0.2), css(P.bone, 0.14)],
    electrode: [css(P.bone, 0.95), css(P.primary, 0.62), css(P.primary, 0)], elecEdge: css(P.primary2, 0.3),
  };
}

function initNeon(sec: HTMLElement) {
  const board = $(".eol-neon", sec);
  const canvas = $<HTMLCanvasElement>("canvas", board);
  const pal = neonPalette();
  let neon: ReturnType<typeof createNeonSign> | null = null;
  let off: (() => void) | null = null, ro: ResizeObserver | null = null, lit = false, visible = false;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && neon && !lit) { lit = true; neon.ignite(0.25); }
  }, { threshold: 0.4 });
  io.observe(board);
  let kickAt = 4;
  lazyMount(sec, {
    mount() {
      neon = createNeonSign(board, canvas, {
        layouts: [{ minAspect: 0, lines: ["THANKS"] }],
        palette: () => pal,
        faulty: (_l, _n, i) => i === 4,
        reduced: state.reduced,
      });
      ro = new ResizeObserver(() => neon?.resize());
      ro.observe(board);
      if (visible && !lit) { lit = true; neon.ignite(0.25); }
      off = onTick((t, dt) => {
        if (!visible || !neon) return;
        neon.render(dt);
        if (t > kickAt) { kickAt = t + 5 + Math.random() * 6; neon.kick(2); }   // thỉnh thoảng chập chờn
      });
    },
    unmount() { off?.(); ro?.disconnect(); neon?.dispose(); neon = null; off = null; lit = false; },
  });
}

export function initEol() {
  const sec = $("#eol");
  initNeon(sec);

  const list = $("[data-contact]", sec);
  if (profile.contact.length) {
    list.innerHTML = profile.contact.map((c) => {
      const ext = /^https?:/.test(c.href) ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<li><a class="eol-link" href="${esc(c.href)}"${ext} data-magnetic="0.25"><span>${esc(c.label)}</span>${esc(c.value)}</a></li>`;
    }).join("");
  } else list.remove();

  const name = $(".eol-name", sec);
  const inner = $(".eol-name-in", name);
  const fill = $(".eol-fill", name);
  name.addEventListener("pointermove", (e) => {
    const r = fill.getBoundingClientRect();
    fill.style.setProperty("--mx", `${e.clientX - r.left}px`);
    fill.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
  name.addEventListener("pointerenter", () => name.classList.add("is-hot"));
  name.addEventListener("pointerleave", () => name.classList.remove("is-hot"));
  if (!state.reduced) {
    gsap.fromTo(inner, { yPercent: 45, opacity: 0.2 }, {
      yPercent: 0, opacity: 1, ease: "none",
      scrollTrigger: { trigger: name, start: "top bottom", end: "top 60%", scrub: true },
    });
  }

  $("[data-top]", sec).addEventListener("click", () => {
    scrollTo(0, state.reduced ? 0.01 : 2.4);
    $("#hero").focus({ preventScroll: true });
  });

  const up = $("[data-uptime]", sec);
  const t0 = performance.now();
  let last = -1, visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
  onTick(() => {
    if (!visible) return;
    const s = Math.floor((performance.now() - t0) / 1000);
    if (s === last) return;
    last = s;
    up.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  });
}
