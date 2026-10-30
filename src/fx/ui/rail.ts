// Chapter rail bên phải: 12 chấm, chấm active giãn thành vạch, hover hiện tên, click cuộn tới chương.
import { scrollTo } from "../../core/scroll";
import { $ } from "../../core/dom";
import { chapters, onChapter } from "./accent";

export function initRail() {
  const rail = $(".rail");
  const dots = chapters.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rail__dot";
    b.setAttribute("aria-label", `${String(c.index + 1).padStart(2, "0")} ${c.title}`);
    b.innerHTML = `<span>${String(c.index + 1).padStart(2, "0")} · ${c.title}</span>`;
    b.addEventListener("click", () => scrollTo(c.el, 1.8));
    rail.appendChild(b);
    return b;
  });
  onChapter((c) => dots.forEach((d, i) => {
    d.classList.toggle("is-active", i === c.index);
    if (i === c.index) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
  }));
}
