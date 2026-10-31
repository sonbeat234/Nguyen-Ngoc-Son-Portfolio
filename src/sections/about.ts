// Profile (scene `circuit`): khung chân dung là package chip QFN nhìn từ trên.
// - 4 × PINS chân: tín hiệu chạy vòng quanh package (CSS, lệch pha theo --n), sáng hết khi hover.
// - Dây bond vàng từ pad trên die ra chân, vẽ dần khi vào màn; cửa sổ die có tia quét.
// - Datasheet cá nhân (giá trị decode lần lượt) + vòng điểm IELTS / TOEIC đầy dần, số đếm lên.
// - Parallax nhiều lớp: package, cột chữ và nền trôi với tốc độ khác nhau.
// - V4 đọc chữ: cột chữ nằm trên panel kính; shader `circuit` nhận u_textRect = vùng cột chữ (uv) để tối hẳn
//   phần nền ngay sau chữ (đo ở tick "early", chỉ khi section đang hiện).
import gsap from "gsap";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { onTick } from "../core/loop";
import { stage } from "../stage/instance";
import { profile, esc, type Score } from "../content/profile";

const PINS = 10;                       // chân mỗi cạnh
const PIN_FROM = 0.16, PIN_SPAN = 0.68; // vị trí chân dọc cạnh (tỉ lệ cạnh package)
const DIE = 0.18;                      // cửa sổ die chiếm 0.18 → 0.82 thân package (khớp inset trong about.css)

export function initAbout() {
  const sec = $("#about");
  renderDatasheet($("[data-datasheet]", sec));
  renderScores($("[data-scores]", sec));
  buildPackage($(".pkg", sec));
  animate(sec);
  trackTextRect(sec);
}

/** vùng cột chữ (uv 0..1, y lên) → uniform u_textRect của shader circuit. Mảng dùng lại, không cấp phát trong tick. */
function trackTextRect(sec: HTMLElement) {
  const text = $(".about-text", sec);
  const rect = [1, 1, 0, 0];
  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
  onTick(() => {
    if (!visible) return;
    const r = text.getBoundingClientRect();
    rect[0] = r.left / state.w; rect[2] = r.right / state.w;
    rect[1] = 1 - r.bottom / state.h; rect[3] = 1 - r.top / state.h;
    stage.set("circuit", "u_textRect", rect);
  }, "early");
}

function renderDatasheet(tbody: HTMLElement) {
  const rows: [string, string][] = [
    ["Full name", profile.fullName],
    ["Date of birth", profile.dateOfBirth],
    ["Education", profile.education],
    ["High school", profile.highSchool],
    ["IELTS", profile.ielts],
    ["TOEIC", profile.toeic],
  ];
  tbody.innerHTML = rows.map(([k, v], i) => `
    <tr>
      <td class="ds-pin">${String(i + 1).padStart(2, "0")}</td>
      <th scope="row">${esc(k)}</th>
      <td class="ds-val" data-decode data-decode-delay="${i * 120}">${esc(v)}</td>
    </tr>`).join("");
}

function renderScores(host: HTMLElement) {
  const scores: Score[] = profile.languages.flatMap((l) => l.scores);
  host.innerHTML = scores.map((s) => {
    const dec = s.text.includes(".") ? 1 : 0;
    return `
    <figure class="score" style="--p:${(s.value / s.max).toFixed(4)}">
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle class="score-ticks" cx="60" cy="60" r="56" pathLength="100" />
        <circle class="score-track" cx="60" cy="60" r="48" />
        <circle class="score-arc" cx="60" cy="60" r="48" pathLength="100" />
      </svg>
      <figcaption>
        <span class="score-num" aria-hidden="true" data-to="${s.value}" data-dec="${dec}">${s.text}</span>
        <span class="score-label">${esc(s.label)}</span>
        <span class="score-max" aria-hidden="true">/ ${s.max.toFixed(dec)}</span>
        <span class="sr-only">${esc(s.label)} score ${esc(s.text)} out of ${s.max.toFixed(dec)}</span>
      </figcaption>
    </figure>`;
  }).join("");
}

function buildPackage(pkg: HTMLElement) {
  // chân: thứ tự n chạy vòng theo chiều kim đồng hồ để tín hiệu "đi quanh" package
  const sides = ["t", "r", "b", "l"] as const;
  let pins = "", n = 0;
  for (const side of sides) for (let i = 0; i < PINS; i++) pins += `<i class="pin pin-${side}" style="--i:${i};--n:${n++}"></i>`;
  $(".pkg-pins", pkg).innerHTML = pins;

  // dây bond trong hệ toạ độ 0..100 của thân package
  const svg = $<SVGSVGElement>(".pkg-wires", pkg);
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  let wires = "";
  for (let i = 0; i < PINS; i++) {
    const t = PIN_FROM + (i / (PINS - 1)) * PIN_SPAN;
    const d = DIE + 0.04 + (i / (PINS - 1)) * (1 - 2 * DIE - 0.08);    // pad trên mép die
    const P = t * 100, Q = d * 100, a = DIE * 100, e = 4;
    const bow = (i % 2 ? 3 : -3);
    wires += `<path d="M${Q} ${a}Q${(P + Q) / 2 + bow} ${(a + e) / 2} ${P} ${e}"/>`;                // trên
    wires += `<path d="M${100 - a} ${Q}Q${(200 - a - e) / 2} ${(P + Q) / 2 + bow} ${100 - e} ${P}"/>`; // phải
    wires += `<path d="M${Q} ${100 - a}Q${(P + Q) / 2 - bow} ${(200 - a - e) / 2} ${P} ${100 - e}"/>`; // dưới
    wires += `<path d="M${a} ${Q}Q${(a + e) / 2} ${(P + Q) / 2 - bow} ${e} ${P}"/>`;                 // trái
  }
  svg.innerHTML = wires;
  svg.querySelectorAll("path").forEach((p) => p.setAttribute("pathLength", "1"));

  // ảnh thật nếu đã cấu hình; nếu chưa: placeholder trừu tượng, KHÔNG dùng ảnh người khác/ảnh giả
  const photo = $("[data-portrait]", pkg);
  if (profile.portrait) {
    photo.innerHTML = `<img src="${esc(profile.portrait)}" alt="Portrait of ${esc(profile.fullName)}" loading="lazy" decoding="async" />`;
  } else {
    photo.classList.add("is-empty");
    photo.innerHTML = `<span class="pkg-ph"><span class="pkg-ph-label">Portrait<br />to be added</span></span>`;
  }

  // hover: chân sáng hết + die bừng nhẹ
  pkg.addEventListener("pointerenter", () => pkg.classList.add("is-hot"));
  pkg.addEventListener("pointerleave", () => pkg.classList.remove("is-hot"));
  // chỉ chạy animation CSS của chân khi package đang trong màn
  new IntersectionObserver(([e]) => pkg.classList.toggle("is-live", e.isIntersecting)).observe(pkg);
}

function animate(sec: HTMLElement) {
  const pkg = $(".pkg", sec);
  const wires = $$<SVGPathElement>(".pkg-wires path", pkg);
  const rows = $$(".ds tbody tr", sec);
  const scores = $$(".score", sec);

  const countUp = (el: HTMLElement) => {
    const to = Number(el.dataset.to), dec = Number(el.dataset.dec);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.8, ease: "power3.out", onUpdate: () => (el.textContent = o.v.toFixed(dec)) });
  };

  if (state.reduced) {
    pkg.classList.add("is-powered");
    scores.forEach((s) => s.classList.add("is-on"));
    return;
  }

  gsap.set(wires, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.timeline({ scrollTrigger: { trigger: pkg, start: "top 82%", once: true } })
    .from(pkg, { y: 70, rotateX: 22, opacity: 0, duration: 1.3, ease: "expo.out", transformPerspective: 1000 })
    .add(() => pkg.classList.add("is-powered"), 0.35)
    .to(wires, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", stagger: { each: 0.012, from: "random" } }, 0.45)
    .fromTo($(".pkg-scan", pkg), { yPercent: -110 }, { yPercent: 110, duration: 1.4, ease: "power2.inOut" }, 0.9);

  gsap.from(rows, {
    x: -28, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08,
    scrollTrigger: { trigger: $(".ds", sec), start: "top 85%", once: true },
  });

  scores.forEach((s) => {
    gsap.timeline({ scrollTrigger: { trigger: s, start: "top 88%", once: true } })
      .from(s, { scale: 0.85, opacity: 0, duration: 0.9, ease: "back.out(1.6)" })
      .add(() => { s.classList.add("is-on"); countUp($(".score-num", s)); }, 0.15);
  });

  // parallax nhiều lớp: package chậm, cột chữ nhanh hơn một chút
  gsap.fromTo(pkg, { yPercent: 8 }, { yPercent: -8, ease: "none", scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo($(".about-text", sec), { y: 40 }, { y: -40, ease: "none", scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true } });
}
