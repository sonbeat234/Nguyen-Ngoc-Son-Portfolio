// Quét toàn trang một lượt sau khi mọi section đã init (phần tử section tạo động cũng được bắt).
// Phần tử đã xử lý được đánh dấu nên gọi lại không bị chạy hai lần.
import { initDecode } from "./decode";
import { initReveals } from "./reveal";
import { initScrub } from "./scrub";
import { initGlitch } from "./glitch";
import { initVelocitySkew } from "./velocitySkew";
import { initMarquee } from "./marquee";
import { initTextPaths } from "./textPath";

export function initTextFx(root: ParentNode = document) {
  initScrub(root);
  initReveals(root);
  initTextPaths(root);
  initDecode(root);
  initGlitch(root);
  initVelocitySkew(root);
  initMarquee(root);
}
