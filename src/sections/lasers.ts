// Chương 05 — Amplify (stub; subagent B thay bằng track ngang theo spec mục 12/05).
// Stub: chia weight 4 scene laser theo coverage/progress để thử dissolve trên trang test.
import { onTick } from "../core/loop";
import { coverage, $ } from "../core/dom";
import { stage } from "../stage/instance";

export function initLasers() {
  const sec = $("#c05");
  onTick(() => {
    const { cover, progress } = coverage(sec);
    const f = progress * 3;
    for (let i = 0; i < 4; i++) stage.setWeight(`laser${i}`, cover * Math.max(0, 1 - Math.abs(f - i)), progress);
  }, "early");
}
