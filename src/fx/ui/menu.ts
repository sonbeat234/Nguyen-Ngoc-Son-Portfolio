// Menu fullscreen: mở bằng mask tròn từ nút menu, 12 chương chữ display lớn.
// Hover từng dòng → stage.force(scene) để preview scene đó phía sau. Esc để đóng.
import gsap from "gsap";
import { $ } from "../../core/dom";
import { lockScroll, scrollTo } from "../../core/scroll";
import { state } from "../../core/state";
import { stage } from "../../stage/instance";
import { chapters, currentChapter, tweenAccent } from "./accent";
import { profile } from "../../content/profile";

export function initMenu() {
  const menu = $("#menu");
  const list = $(".menu__list", menu);
  const openBtn = $<HTMLButtonElement>("[data-menu-open]");
  const closeBtn = $<HTMLButtonElement>("[data-menu-close]", menu);
  const main = $("main");
  const html = document.documentElement;
  let open = false;

  chapters.forEach((c) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "menu__link";
    a.href = `#${c.id}`;
    a.innerHTML = `<small>${String(c.index + 1).padStart(2, "0")}</small>${c.title}`;
    const preview = () => { stage.force(c.scene); tweenAccent(c.accent, c.accent2, 0.6); };
    a.addEventListener("pointerenter", preview);
    a.addEventListener("focus", preview);
    a.addEventListener("click", (e) => { e.preventDefault(); close(); scrollTo(c.el, 2); });
    li.appendChild(a);
    list.appendChild(li);
  });
  // lối tắt tới khối liên hệ ở footer (#contact) — chỉ khi có liên hệ thật. Preview scene/accent của End of line;
  // cuộn dừng cho khối nằm ~35% chiều cao màn (không bị dock che), rồi focus link liên hệ đầu tiên cho bàn phím.
  const eol = chapters.find((c) => c.id === "eol");
  if (profile.contact.length && eol) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "menu__link";
    a.href = "#contact";
    a.innerHTML = `<small>@</small>Contact`;
    const preview = () => { stage.force(eol.scene); tweenAccent(eol.accent, eol.accent2, 0.6); };
    a.addEventListener("pointerenter", preview);
    a.addEventListener("focus", preview);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      close();
      const target = document.getElementById("contact");
      if (!target) return;
      scrollTo(target, state.reduced ? 0.01 : 2, -state.h * 0.35);
      // main còn visibility:hidden ở frame đóng menu (transition .6s, base.css) → focus sau 2 frame mới ăn
      const first = target.querySelector<HTMLElement>("a, button");
      requestAnimationFrame(() => requestAnimationFrame(() => first?.focus({ preventScroll: true })));
    });
    li.appendChild(a);
    list.appendChild(li);
  }
  list.addEventListener("pointerleave", () => stage.force(null));

  const setOrigin = () => {
    const r = openBtn.getBoundingClientRect();
    menu.style.setProperty("--mx", `${r.left + r.width / 2}px`);
    menu.style.setProperty("--my", `${r.top + r.height / 2}px`);
  };

  function show() {
    if (open) return;
    open = true;
    setOrigin();
    menu.classList.add("is-open");
    menu.removeAttribute("aria-hidden");
    html.classList.add("menu-open");
    main.inert = true;
    openBtn.setAttribute("aria-expanded", "true");
    lockScroll(true, "menu");
    gsap.fromTo(menu, { clipPath: "circle(0px at var(--mx) var(--my))" }, {
      clipPath: "circle(150vmax at var(--mx) var(--my))", duration: state.reduced ? 0.01 : 0.9, ease: "expo.inOut", overwrite: true,
    });
    gsap.fromTo(menu.querySelectorAll(".menu__link"), { yPercent: 60, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.03, ease: "power3.out", delay: 0.25, overwrite: true,
    });
    menu.querySelector<HTMLElement>(".menu__link")?.focus({ preventScroll: true });
  }
  function close() {
    if (!open) return;
    open = false;
    stage.force(null);
    const c = currentChapter();
    if (c) tweenAccent(c.accent, c.accent2, 0.6);
    html.classList.remove("menu-open");
    main.inert = false;
    openBtn.setAttribute("aria-expanded", "false");
    lockScroll(false, "menu");
    gsap.to(menu, {
      clipPath: "circle(0px at var(--mx) var(--my))", duration: state.reduced ? 0.01 : 0.7, ease: "expo.inOut", overwrite: true,
      onComplete: () => { menu.classList.remove("is-open"); menu.setAttribute("aria-hidden", "true"); },
    });
    openBtn.focus({ preventScroll: true });
  }

  openBtn.addEventListener("click", () => (open ? close() : show()));
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) close(); });
}
