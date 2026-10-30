// End of line (footer, scene `ribbon`).
// - Tên khổng lồ dạng outline typeflow: rê chuột thì phần chữ dưới con trỏ được tô (radial-gradient + background-clip),
//   touch / không hover: vệt sáng tự chạy (CSS). Chữ trồi lên theo cuộn khi vào chương.
// - Liên hệ: CHỈ render khi profile.contact có dữ liệu thật; trống thì gỡ hẳn khối.
// - Session uptime (cập nhật 1 lần/giây), nút "Back to power-on" tua ngược về đầu trang qua mọi dissolve.
import gsap from "gsap";
import { $ } from "../core/dom";
import { state } from "../core/state";
import { onTick } from "../core/loop";
import { scrollTo } from "../core/scroll";
import { profile, esc } from "../content/profile";

const pad = (n: number) => String(n).padStart(2, "0");

export function initEol() {
  const sec = $("#eol");

  const list = $("[data-contact]", sec);
  if (profile.contact.length) {
    list.innerHTML = profile.contact.map((c) => {
      const ext = /^https?:/.test(c.href) ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<li><a class="eol-link" href="${esc(c.href)}"${ext} data-magnetic="0.25"><span>${esc(c.label)}</span>${esc(c.value)}</a></li>`;
    }).join("");
  } else list.remove();

  const name = $(".eol-name", sec);
  const fill = $("span", name);
  name.addEventListener("pointermove", (e) => {
    const r = fill.getBoundingClientRect();
    fill.style.setProperty("--mx", `${e.clientX - r.left}px`);
    fill.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
  name.addEventListener("pointerenter", () => name.classList.add("is-hot"));
  name.addEventListener("pointerleave", () => name.classList.remove("is-hot"));
  if (!state.reduced) {
    gsap.fromTo(fill, { yPercent: 45, opacity: 0.2 }, {
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
