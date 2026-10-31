// End of line (footer, scene `ribbon`).
// - Tên khổng lồ dạng outline typeflow: rê chuột thì phần chữ dưới con trỏ được tô (radial-gradient + background-clip),
//   touch / không hover: vệt sáng tự chạy (CSS). Chữ trồi lên theo cuộn khi vào chương.
// - Liên hệ: CHỈ render khi profile.contact có dữ liệu thật; trống thì gỡ hẳn khối. Mỗi pill có icon theo loại
//   (mailto / tel / LinkedIn / GitHub), email có nút Copy (Clipboard API, báo qua aria-live). Khối có id="contact"
//   — mục "Contact" trong menu cuộn tới đây.
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

// icon nét mảnh (viewBox 24, stroke currentColor) chọn theo href — vẽ riêng cho site, không dùng logo thương hiệu
const ICONS = {
  mail: `<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/>`,
  phone: `<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>`,
  linkedin: `<rect x="2.5" y="2.5" width="19" height="19" rx="3.5"/><path d="M7.5 10.5v6M7.5 7.5v.01M11.5 16.5v-6M11.5 13.3a2.7 2.7 0 0 1 5.4 0v3.2"/>`,
  code: `<path d="m8 7.5-4.5 4.5L8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.5 5l-3 14"/>`,
  link: `<path d="m9.5 14.5 5-5M8.5 11.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M15.5 12.5l2-2a3.5 3.5 0 0 0-5-5l-2 2"/>`,
};
const iconFor = (href: string): keyof typeof ICONS =>
  href.startsWith("mailto:") ? "mail" : href.startsWith("tel:") ? "phone"
    : /linkedin\.com/i.test(href) ? "linkedin" : /git(hub|lab)\.com/i.test(href) ? "code" : "link";

function renderContact(list: HTMLElement) {
  list.innerHTML = profile.contact.map((c) => {
    const external = /^https?:/.test(c.href);
    const ext = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    const icon = `<svg class="eol-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[iconFor(c.href)]}</svg>`;
    // trình đọc màn hình: "Email: name@…" (+ "opens in a new tab" với link ngoài)
    const link = `<a class="eol-link" href="${esc(c.href)}"${ext} data-magnetic="0.25">${icon}<span>${esc(c.label)}<span class="sr-only">:</span></span>${esc(c.value)}${external ? `<span class="sr-only"> (opens in a new tab)</span>` : ""}</a>`;
    const copy = c.href.startsWith("mailto:")
      ? `<button class="eol-copy" type="button" data-copy="${esc(c.value)}"><span class="eol-copy-a">Copy</span><span class="eol-copy-b" aria-hidden="true">Copied</span><span class="sr-only"> ${esc(c.label.toLowerCase())} address</span></button><span class="sr-only" aria-live="polite" data-copy-status></span>`
      : "";
    return `<li>${link}${copy}</li>`;
  }).join("");

  list.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
    const status = btn.nextElementSibling as HTMLElement;
    const done = $(".eol-copy-b", btn);
    let timer = 0;
    btn.addEventListener("click", async () => {
      const ok = await copyText(btn.dataset.copy!);
      btn.focus({ preventScroll: true });
      done.textContent = ok ? "Copied" : "Failed";
      status.textContent = "";
      requestAnimationFrame(() => (status.textContent = ok ? "Email address copied" : "Copy failed — select the address instead"));
      btn.classList.add("is-done");
      clearTimeout(timer);
      timer = window.setTimeout(() => btn.classList.remove("is-done"), 1500);
    });
  });
}

/** Clipboard API (cần https / localhost); không được thì dùng textarea ẩn + execCommand */
async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* thử cách cũ */ }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return ok;
}

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
  if (profile.contact.length) renderContact(list);
  else list.remove();

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
