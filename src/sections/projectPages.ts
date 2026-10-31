// Nội dung trang chi tiết dự án — dùng chung cho chế độ SÁCH (mỗi PageDef = một trang giấy) và chế độ CUỘN
// (mỗi PageDef = một khối). Dữ liệu: src/content/profile.ts → projects[i]. Trường rỗng → khối skeleton có nhãn
// "to be added" (không bịa nội dung). Chuỗi người dùng luôn qua esc().
import { esc, isFilled, type Project } from "../content/profile";

export type PageDef = {
  kind: "cover" | "overview" | "step" | "results" | "gallery" | "lessons" | "back" | "end";
  /** nhãn ngắn cho chấm tiến độ */
  label: string;
  html: string;
};

const ARROW = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 8h9.2M8.8 4.2 12.6 8l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>`;
const pad2 = (n: number) => String(n).padStart(2, "0");

/** khối trống có nhãn: skeleton + "to be added" (trình đọc màn hình: "… not added yet") */
const tba = (what: string, lines = 2) =>
  `<div class="pg-tba"><span class="pg-tba-lines" aria-hidden="true">${"<i></i>".repeat(lines)}</span>` +
  `<span class="pg-tba-label" aria-hidden="true">${esc(what)} — to be added</span><span class="sr-only">${esc(what)} not added yet</span></div>`;

/** số trong chuỗi giá trị đếm lên (giữ phần chữ quanh số): "96.4 %" → <b data-count="96.4"> */
function metricValue(v: string) {
  const m = v.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return `<span class="pg-metric-v">${esc(v)}</span>`;
  const num = m[0].replace(",", ".");
  const dec = num.includes(".") ? num.split(".")[1].length : 0;
  const i = m.index ?? 0;
  return `<span class="pg-metric-v">${esc(v.slice(0, i))}<b data-count="${num}" data-dec="${dec}">${esc(m[0])}</b>${esc(v.slice(i + m[0].length))}</span>`;
}

/** độ dài thanh: giá trị % dùng trực tiếp, còn lại so với số lớn nhất không phải % */
function metricBars(metrics: Project["metrics"]) {
  const nums = metrics.map((m) => parseFloat((m.value.match(/-?\d+(?:[.,]\d+)?/)?.[0] ?? "0").replace(",", ".")));
  const max = Math.max(1e-6, ...nums.filter((_, i) => !metrics[i].value.includes("%")));
  return metrics.map((m, i) => Math.max(0.04, Math.min(1, m.value.includes("%") ? nums[i] / 100 : nums[i] / max)));
}

const kicker = (die: string, text: string) => `<p class="pg-kicker"><span>${die}</span><span>${esc(text)}</span></p>`;

/** minh hoạ die (khi chưa có ảnh): SVG trừu tượng lưới cell, không phải ảnh thật */
const DIE_ART = `<svg class="pg-die-art" viewBox="0 0 200 200" aria-hidden="true">
  <rect x="20" y="20" width="160" height="160" rx="6" class="da-body"/>
  <rect x="44" y="44" width="112" height="112" rx="3" class="da-core"/>
  <path class="da-pads" d="${Array.from({ length: 9 }, (_, k) => { const t = 38 + k * 15.5; return `M${t} 26h7M${t} 167h7M26 ${t}v7M167 ${t}v7`; }).join("")}"/>
  <path class="da-rows" d="${Array.from({ length: 8 }, (_, k) => `M52 ${58 + k * 12}h${40 + ((k * 37) % 56)}`).join("")}"/>
  <rect x="104" y="96" width="40" height="44" rx="2" class="da-macro"/>
</svg>`;

const emptyFig = (what: string) => `<div class="pg-fig-empty" aria-hidden="true"></div><figcaption class="pg-tba-label">${what} — to be added</figcaption>`;

export function buildPages(p: Project, i: number): PageDef[] {
  const die = `DIE ${pad2(i + 1)}`;
  const has = isFilled(p.title);
  const pages: PageDef[] = [];

  // 1 · Bìa: tiêu đề, DIE nn, thời gian, tag công cụ, ảnh bìa
  pages.push({
    kind: "cover", label: "Cover",
    html: `<div class="pg pg-cover">
      ${kicker(die, "Project record")}
      <h3 class="pg-title pg-title-xl" data-pg-title>${has ? esc(p.title) : `Project ${pad2(i + 1)}`}</h3>
      ${has ? "" : `<p class="pg-tba-label">Title — to be added</p>`}
      <p class="pg-meta">${isFilled(p.period) ? esc(p.period) : `<span class="pg-tba-label">Period — to be added</span>`}</p>
      ${p.tools.length
        ? `<ul class="pg-tags">${p.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`
        : `<ul class="pg-tags is-empty" aria-hidden="true"><li></li><li></li><li></li></ul><span class="sr-only">Tools not added yet</span>`}
      <figure class="pg-fig pg-cover-fig" data-pg-img>${isFilled(p.cover)
        ? `<img src="${esc(p.cover)}" alt="${esc(p.title)} — cover" loading="lazy" decoding="async" />`
        : `${DIE_ART}<figcaption class="pg-tba-label">Cover image — to be added</figcaption>`}</figure>
    </div>`,
  });

  // 2 · Tổng quan & bài toán
  pages.push({
    kind: "overview", label: "Overview",
    html: `<div class="pg pg-overview">
      ${kicker(die, "01 · Overview")}
      <h3 class="pg-title" data-pg-title>Overview &amp; problem</h3>
      <div class="pg-block"><p class="pg-h">Summary</p>${isFilled(p.summary) ? `<p class="pg-lead">${esc(p.summary)}</p>` : tba("Summary", 3)}</div>
      <div class="pg-block"><p class="pg-h">Problem</p>${isFilled(p.problem) ? `<p>${esc(p.problem)}</p>` : tba("Problem statement", 3)}</div>
      <dl class="pg-facts">
        <div><dt>Objective</dt><dd>${isFilled(p.objective) ? esc(p.objective) : `<span class="pg-tba-label">to be added</span>`}</dd></div>
        <div><dt>Role</dt><dd>${isFilled(p.role) ? esc(p.role) : `<span class="pg-tba-label">to be added</span>`}</dd></div>
      </dl>
    </div>`,
  });

  // 3 · Cách làm: mỗi bước một trang
  const steps = p.approach.length ? p.approach : [null];
  steps.forEach((s, k) => pages.push({
    kind: "step", label: `Step ${k + 1}`,
    html: `<div class="pg pg-step">
      ${kicker(die, `02 · Approach — step ${pad2(k + 1)}${steps.length > 1 ? ` / ${pad2(steps.length)}` : ""}`)}
      <h3 class="pg-title" data-pg-title>${s && isFilled(s.title) ? esc(s.title) : "Approach"}</h3>
      ${s && isFilled(s.text) ? `<p class="pg-lead">${esc(s.text)}</p>` : tba(s ? "Step description" : "Approach steps", 4)}
      <figure class="pg-fig" data-pg-img>${s?.image ? `<img src="${esc(s.image)}" alt="${esc(s.title)}" loading="lazy" decoding="async" />` : emptyFig("Figure")}</figure>
    </div>`,
  }));

  // 4 · Kết quả: số liệu đếm lên + thanh
  const bars = metricBars(p.metrics);
  pages.push({
    kind: "results", label: "Results",
    html: `<div class="pg pg-results">
      ${kicker(die, "03 · Results")}
      <h3 class="pg-title" data-pg-title>Results</h3>
      ${p.metrics.length
        ? `<ul class="pg-metrics">${p.metrics.map((m, k) => `<li class="pg-metric" style="--v:${bars[k].toFixed(3)}"><span class="pg-metric-l">${esc(m.label)}</span>${metricValue(m.value)}<i class="pg-bar" aria-hidden="true"><b></b></i></li>`).join("")}</ul>`
        : `<ul class="pg-metrics is-empty">${[0.62, 0.38, 0.8].map((v) => `<li class="pg-metric" style="--v:${v}"><span class="pg-metric-l pg-tba-label">Metric — to be added</span><span class="pg-metric-v" aria-hidden="true">—</span><i class="pg-bar" aria-hidden="true"><b></b></i></li>`).join("")}</ul>`}
      <div class="pg-block"><p class="pg-h">Outcome</p>${isFilled(p.outcome) ? `<p>${esc(p.outcome)}</p>` : tba("Outcome", 2)}</div>
    </div>`,
  });

  // 5 · Hình ảnh
  const gal = p.gallery.length ? p.gallery : [null, null, null, null];
  pages.push({
    kind: "gallery", label: "Gallery",
    html: `<div class="pg pg-gallery">
      ${kicker(die, "04 · Gallery")}
      <h3 class="pg-title" data-pg-title>Gallery</h3>
      <ul class="pg-gal${p.gallery.length ? "" : " is-empty"}">${gal.map((g, k) => `<li><figure class="pg-fig" data-pg-img>${g
        ? `<img src="${esc(g.src)}" alt="${esc(g.caption)}" loading="lazy" decoding="async" /><figcaption>${esc(g.caption)}</figcaption>`
        : emptyFig(`Image ${k + 1}`)}</figure></li>`).join("")}</ul>
    </div>`,
  });

  // 6 · Bài học
  pages.push({
    kind: "lessons", label: "Lessons",
    html: `<div class="pg pg-lessons">
      ${kicker(die, "05 · Lessons")}
      <h3 class="pg-title" data-pg-title>Lessons learned</h3>
      ${p.lessons.length ? `<ol class="pg-lessons-list">${p.lessons.map((l) => `<li>${esc(l)}</li>`).join("")}</ol>` : tba("Lessons", 5)}
    </div>`,
  });

  // 7 · Link + bìa sau
  const links = [...(isFilled(p.link) ? [{ label: "View project", href: p.link }] : []), ...p.links];
  pages.push({
    kind: "back", label: "Links",
    html: `<div class="pg pg-back">
      ${kicker(die, "06 · Links")}
      <h3 class="pg-title" data-pg-title>Links</h3>
      ${links.length
        ? `<ul class="pg-links">${links.map((l) => `<li><a class="pg-link" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ${ARROW}</a></li>`).join("")}</ul>`
        : tba("Repository / report links", 2)}
      <div class="pg-back-mark" aria-hidden="true">${DIE_ART}<p>${die} · end of record</p></div>
      <button class="btn btn-spin pg-close" type="button" data-pv-close><span>Back to projects</span></button>
    </div>`,
  });

  return pages;
}

/** trang đệm cho sách khi số trang lẻ (chỉ trang trí) */
export const END_PAGE: PageDef = {
  kind: "end", label: "End",
  html: `<div class="pg pg-end" aria-hidden="true">${DIE_ART}<p class="pg-end-mark">end paper</p></div>`,
};
