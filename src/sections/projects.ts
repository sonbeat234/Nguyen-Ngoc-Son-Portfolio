// Projects (scene `dotmatrix`): mỗi dự án là một "die" trên wafer.
// Dữ liệu: src/content/profile.ts → projects. Trường trống hiện ô skeleton (để trống, không bịa nội dung)
// kèm chữ sr-only "not added yet" cho trình đọc màn hình.
// Hiệu ứng: card cắt ra từ tâm như dicing (clip-path), tilt 3D + spotlight + chữ thập probe theo con trỏ;
// V4: cả card bấm được (link phủ #project/<slug> → overlay chi tiết, sections/projectView.ts), viền beam chạy quanh
// + vệt sáng quét chéo + nâng nhẹ khi hover, dòng "Open die →" luôn hiện (máy cảm ứng không có hover),
// tiêu đề card decode khi card cắt xong, tiêu đề section kiểu Sliding Text (fx/text/slideHeading).
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { $, $$ } from "../core/dom";
import { state } from "../core/state";
import { decodeText } from "../fx/text/decode";
import { slideHeading } from "../fx/text/slideHeading";
import { profile, isFilled, esc, projectSlug, type Project } from "../content/profile";
import { initProjectView } from "./projectView";

const ARROW = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 8h9.2M8.8 4.2 12.6 8l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>`;

const slot = (what: string, size = "") => `<span class="slot ${size}" aria-hidden="true"></span><span class="sr-only">${what} not added yet</span>`;

function field(label: string, value: string | string[]) {
  let body: string;
  if (!isFilled(value)) body = slot(label);
  else if (Array.isArray(value)) body = `<ul class="pc-tags">${value.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
  else body = esc(value);
  return `<div class="pc-field"><dt>${label}</dt><dd>${body}</dd></div>`;
}

function card(p: Project, i: number) {
  const n = String(i + 1).padStart(2, "0");
  const has = isFilled(p.title);
  const status = isFilled(p.period) ? esc(p.period) : has ? "" : "TBA";
  const name = has ? esc(p.title) : `Project ${n}`;
  // link phủ toàn card (.pc-hit); link ngoài (nếu có) đặt NGOÀI link phủ, nổi trên nó — không lồng <a> trong <a>
  return `
  <article class="pcard card${has ? "" : " is-empty"}" data-tilt="0.8">
    <a class="pc-hit" href="#project/${projectSlug(p, i)}" aria-label="Open DIE ${n} — ${name}${has ? "" : " (details to be added)"}"></a>
    <i class="pc-beam" aria-hidden="true"></i><i class="pc-sheen" aria-hidden="true"></i>
    <i class="pc-probe" aria-hidden="true"></i>
    <i class="pc-mark pc-tl" aria-hidden="true"></i><i class="pc-mark pc-br" aria-hidden="true"></i>
    <header class="pc-head">
      <span class="pc-die">DIE ${n}</span>
      ${status ? `<span class="pc-status">${status}</span>` : ""}
    </header>
    <h3 class="pc-title"><span class="pc-title-t" data-pc-title>${name}</span>${has ? "" : `<span class="pc-title-tba">Title to be added</span>`}</h3>
    <dl class="pc-fields">
      ${field("Objective", p.objective)}
      ${field("Tools &amp; tech", p.tools)}
      ${field("Role", p.role)}
      ${field("Outcome", p.outcome)}
    </dl>
    <div class="pc-foot">
      <span class="pc-open" aria-hidden="true">Open die ${ARROW}</span>
      ${isFilled(p.link) ? `<a class="pc-link" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">View project ${ARROW}</a>` : ""}
    </div>
  </article>`;
}

export function initProjects() {
  const sec = $("#projects");
  const grid = $("[data-projects]", sec);
  const filled = profile.projects.some((p) => isFilled(p.title));
  $("[data-projects-sub]", sec).textContent = filled
    ? "Selected projects in integrated circuit design and semiconductor engineering. Open a die to read the full record."
    : "Project write-ups are on the way. Each die below opens into its own record — objective, approach, results and lessons — ready to be filled in.";
  grid.innerHTML = profile.projects.map(card).join("");
  const count = sec.querySelector("[data-proj-count]");
  if (count) count.textContent = `(${String(profile.projects.length).padStart(2, "0")}) dies`;

  const cards = $$(".pcard", grid);
  const view = initProjectView(profile.projects, cards);
  cards.forEach((c, i) => {
    const hit = $<HTMLAnchorElement>(".pc-hit", c);
    hit.addEventListener("click", (e) => { e.preventDefault(); view.open(i, { fromCard: true }); });
    // Space trên link (mặc định chỉ cuộn trang) cũng mở card, như một nút
    hit.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); view.open(i, { fromCard: true }); } });
  });

  slideHeading($(".sec-title", sec));

  if (state.reduced) return;
  gsap.set(cards, { clipPath: "inset(48% 48% 48% 48% round 18px)", opacity: 0 });
  ScrollTrigger.batch(cards, {
    start: "top 86%", once: true,
    onEnter: (batch) => gsap.to(batch, {
      clipPath: "inset(0% 0% 0% 0% round 18px)", opacity: 1, duration: 1.2, ease: "expo.out", stagger: 0.14,
      onStart() { (batch as HTMLElement[]).forEach((c, k) => setTimeout(() => decodeText($("[data-pc-title]", c), { duration: 900 }), 380 + k * 140)); },
      onComplete: () => { gsap.set(batch, { clearProps: "clipPath" }); },
    }),
  });
  // parallax: cột giữa trôi lệch nhịp với hai cột bên
  cards.forEach((c, i) => gsap.fromTo(c, { y: i % 3 === 1 ? 60 : 20 }, {
    y: i % 3 === 1 ? -60 : -20, ease: "none",
    scrollTrigger: { trigger: grid, start: "top bottom", end: "bottom top", scrub: true },
  }));
}
