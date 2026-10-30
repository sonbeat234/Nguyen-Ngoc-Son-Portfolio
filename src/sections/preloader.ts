// Chương 00 — Preloader "UPLINK" (stub; subagent A thay bằng bản đầy đủ theo spec mục 12/00).
// HỢP ĐỒNG với main.ts (giữ nguyên chữ ký):
//   initPreloader(): khoá scroll ("preloader"), prewarm stage + font + ảnh, resolve khi tải xong.
//   reveal(): chạy intro (chromatic + iris), ẩn .preloader (display:none), mở scroll,
//             phát window event "signal:intro" (hero bắt để chạy u_assemble), resolve khi xong.
import { stage } from "../stage/instance";
import { lockScroll } from "../core/scroll";
import { $ } from "../core/dom";

export type Preloader = { reveal: () => Promise<void> };

export async function initPreloader(): Promise<Preloader> {
  lockScroll(true, "preloader");
  await stage.prewarm();
  await document.fonts.ready;
  return {
    async reveal() {
      $(".preloader").style.display = "none";
      lockScroll(false, "preloader");
      window.dispatchEvent(new CustomEvent("signal:intro"));
    },
  };
}
