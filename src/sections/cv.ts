// CV (scene `topo`): tài liệu dựng từ src/content/profile.ts.
// Chuyển động: tài liệu nổi lên + tia quét chạy qua, tiêu đề mục decode, từng khối reveal, đường timeline
// học tập vẽ theo cuộn, thanh điểm ngoại ngữ đầy dần. Reduced-motion: nội dung tĩnh, đọc đủ.
// In: nút "Print / Save as PDF" (window.print) + styles/print.css chỉ in tài liệu, nền trắng chữ đen,
// ẩn mọi ô trống. Nút Download chỉ hiện khi profile.cvFile trỏ tới file thật trong public/.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { profile, isFilled, esc } from "../content/profile";
import { decodeGroup } from "../fx/text/decode";

const slot = (what: string, size = "") => `<span class="slot ${size}" aria-hidden="true"></span><span class="sr-only">${what} not added yet</span>`;

function head(n: string, title: string) {
  return `<h4 class="cv-h"><span class="cv-h-n" aria-hidden="true">${n}</span><span data-article-heading>${title}</span></h4>`;
}

function renderCv() {
  const p = profile;
  const contact = p.contact.map((c) => `<div><dt>${esc(c.label)}</dt><dd><a href="${esc(c.href)}">${esc(c.value)}</a></dd></div>`).join("");

  const education = p.educationEntries.map((e) => `
    <li class="cv-tl-item">
      <i class="cv-tl-node" aria-hidden="true"></i>
      <p class="cv-tl-period">${isFilled(e.period) ? esc(e.period) : slot("Period", "slot-sm")}</p>
      <h5 class="cv-tl-title">${esc(e.school)}</h5>
      <p class="cv-tl-sub">${isFilled(e.program) ? esc(e.program) : slot("Programme")}</p>
      ${e.notes.length ? `<ul class="cv-list">${e.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    </li>`).join("");

  const filledProjects = p.projects.filter((x) => isFilled(x.title));
  const projects = filledProjects.length
    ? `<ul class="cv-projects">${filledProjects.map((x) => `
        <li>
          <p class="cv-pj-title">${esc(x.title)}${isFilled(x.period) ? ` <span class="cv-pj-period">${esc(x.period)}</span>` : ""}</p>
          ${isFilled(x.objective) ? `<p>${esc(x.objective)}</p>` : ""}
          ${isFilled(x.role) ? `<p><b>Role:</b> ${esc(x.role)}</p>` : ""}
          ${isFilled(x.outcome) ? `<p><b>Outcome:</b> ${esc(x.outcome)}</p>` : ""}
          ${x.tools.length ? `<p class="cv-pj-tools">${x.tools.map(esc).join(" · ")}</p>` : ""}
        </li>`).join("")}</ul>`
    : `<ul class="cv-projects">${p.projects.map((_, i) => `<li class="is-slot">${slot(`Project ${i + 1}`, "slot-lg")}${slot("Description")}</li>`).join("")}</ul>`;

  const skills = p.skills.length
    ? p.skills.map((g) => `<div class="cv-skill"><p class="cv-skill-g">${esc(g.group)}</p><ul class="cv-chips">${g.items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`).join("")
    : `<ul class="cv-chips is-slot">${Array.from({ length: 6 }, () => `<li>${slot("Skill", "slot-chip")}</li>`).join("")}</ul>`;

  const languages = p.languages.map((l) => `
    <div class="cv-lang">
      <p class="cv-lang-name">${esc(l.name)}</p>
      ${l.scores.map((s) => `
        <div class="cv-meter" style="--p:${(s.value / s.max).toFixed(4)}">
          <span class="cv-meter-label">${esc(s.label)}</span>
          <span class="cv-meter-bar" aria-hidden="true"><i></i></span>
          <span class="cv-meter-val">${esc(s.text)}<small> / ${s.max.toFixed(s.text.includes(".") ? 1 : 0)}</small></span>
        </div>`).join("")}
    </div>`).join("");

  return `
    <i class="cv-scan" aria-hidden="true"></i>
    <header class="cv-head">
      <div class="cv-id">
        <h3 class="cv-name">${esc(p.fullName)}</h3>
        <p class="cv-field">${esc(p.field)}</p>
      </div>
      <dl class="cv-meta">
        <div><dt>Date of birth</dt><dd>${esc(p.dateOfBirth)}</dd></div>
        <div><dt>Education</dt><dd>${esc(p.education)}</dd></div>
        ${contact}
      </dl>
    </header>
    <div class="cv-body">
      <div class="cv-col">
        <section class="cv-block">${head("01", "Profile")}<p class="cv-summary">${esc(p.summary)}</p></section>
        <section class="cv-block">${head("02", "Education")}<ol class="cv-timeline"><i class="cv-tl-line" aria-hidden="true"></i>${education}</ol></section>
        <section class="cv-block${filledProjects.length ? "" : " is-empty"}">${head("03", "Projects")}${projects}</section>
      </div>
      <div class="cv-col">
        <section class="cv-block${p.skills.length ? "" : " is-empty"}">${head("04", "Skills")}${skills}</section>
        <section class="cv-block">${head("05", "Languages")}${languages}</section>
      </div>
    </div>
    <footer class="cv-foot"><span>${esc(p.fullName)} · Curriculum vitae</span><span>${esc(p.field)}</span></footer>`;
}

export function initCv() {
  const sec = $("#cv");
  const doc = $("[data-cv]", sec);
  doc.setAttribute("aria-label", `Curriculum vitae of ${profile.fullName}`);
  doc.innerHTML = renderCv();

  const actions = $("[data-cv-actions]", sec);
  actions.innerHTML =
    (profile.cvFile
      ? `<a class="btn btn-beam" href="${esc(profile.cvFile)}" download data-magnetic="0.3"><span class="glow" aria-hidden="true"></span>Download PDF</a>`
      : "") +
    `<button class="btn btn-spin" type="button" data-print data-magnetic="0.3"><span>Print / Save as PDF</span></button>`;
  $("[data-print]", actions).addEventListener("click", () => window.print());

  const blocks = $$(".cv-block", doc);
  // V4: tiêu đề mục decode kiểu Article Headings — cả nhóm lần lượt (stagger 140 ms, preserve .3, tail .18)
  const headings = $$("[data-article-heading]", doc);
  if (!state.reduced) ScrollTrigger.create({ trigger: $(".cv-body", doc), start: "top 78%", once: true, onEnter: () => decodeGroup(headings) });
  if (state.reduced) { doc.classList.add("is-on"); return; }

  gsap.timeline({ scrollTrigger: { trigger: doc, start: "top 84%", once: true } })
    .from(doc, { y: 90, rotateX: 10, opacity: 0, duration: 1.3, ease: "expo.out", transformPerspective: 1400, transformOrigin: "50% 0%" })
    .fromTo($(".cv-scan", doc), { yPercent: -100, opacity: 1 }, { yPercent: 100, opacity: 0.2, duration: 1.6, ease: "power2.inOut" }, 0.3)
    .from($$(".cv-head > *", doc), { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 0.35);

  blocks.forEach((b) => gsap.from(b, {
    y: 36, opacity: 0, duration: 1, ease: "power3.out",
    scrollTrigger: { trigger: b, start: "top 88%", once: true },
    onStart: () => b.classList.add("is-on"),
  }));

  // đường timeline học tập vẽ dần theo cuộn
  const line = doc.querySelector<HTMLElement>(".cv-tl-line");
  if (line) gsap.fromTo(line, { scaleY: 0 }, {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: line.parentElement!, start: "top 80%", end: "bottom 55%", scrub: true },
  });

  // in: hoàn tất mọi chuyển động trong CV trước khi trình duyệt chụp trang
  addEventListener("beforeprint", () => doc.classList.add("is-on"));
}
