# SIGNAL — tiến độ

Spec: `../threeui-main/PROMPT_SIGNAL_SCROLL_SITE.md` · Quy tắc: `../threeui-main/PROMPT_AUTONOMOUS_RUN.md`

## Phase 0: Khởi tạo
- [x] Đọc toàn bộ spec + lướt các file nguồn ở spec mục 2.2
- [x] Tạo dự án Vite TS, cài dependency (spec mục 2)
- [x] Copy vendor, font, ảnh, license (spec mục 2.1), sửa import tương đối nếu cần
- [x] tsconfig, three128.d.ts, `npx tsc --noEmit` sạch (vendor được @ts-nocheck)
- [x] git init + commit

## Phase 1: Core engine
- [x] core/math, state, loop, scroll, quality, lazy, dom, vendor (spec mục 4, 11) + core/gl (đếm/giải phóng context), core/hud
- [x] ShaderStage + composite + scenes (spec mục 5), shader nebula/topo (mục 6)
- [x] Trang test tạm: 12 section rỗng có data-scene, cuộn thấy dissolve giữa mọi scene, không lỗi console
- [x] Debug HUD `?debug`

## Phase 2: Hệ thống thiết kế + lớp toàn cục
- [x] tokens.css, base.css, @font-face, buttons.css (8 kiểu nút)
- [x] cursor, magnetic, tilt + spotlight, accent theo chương, dock, rail, progress, grain, menu fullscreen + stage.force
- [x] text FX: decode, reveal, scrub, glitch, velocity skew, marquee, text path, neon (CSS; bản canvas ở chương 10)

## Phase 2.5: Quy ước chung + chia việc song song (CONVENTIONS.md)
- [x] index.html có 12 khung section + preloader; main.ts import sẵn mọi init + CSS chương; stub cho từng file
- [x] scripts/verify.mjs nhận --port --out --chapters --steps --viewports --reduced --boundaries; scripts/sheet.mjs
- [ ] Subagent A (00–03), B (04–06), C (07–09), D (10–12) xong và báo cáo

### Trạng thái sau khi bị ngắt do hết limit (checkpoint `991cde9`)

tsc sạch. Verify dev server, từng nhóm chạy tuần tự `--steps 3 --boundaries` (desktop + mobile): **0 lỗi console/WebGL/HTTP, không tràn ngang, đỉnh 3 context** ở cả 4 nhóm. Chạy 2 trình duyệt SwiftShader song song thì `page.screenshot` quá 30s → đã nâng timeout mặc định trong verify.mjs lên 120s.

| Ch | File | Trạng thái | Ghi chú / lỗi |
|---|---|---|---|
| 00 Preloader | preloader.ts, c00.css | xong | đếm 000→100, log decode, 16 ô, chromatic + iris |
| 01 Origin | hero.ts, c01.css, ParticleWordmark, precisionFrame | xong, cần chỉnh | headline/eyebrow đè lên wordmark hạt (mobile: "We build" nằm ngay trên "SIGNAL", khó đọc) |
| 02 Transit | warp.ts | chưa làm | stub; chỉ có scene `stream` |
| 03 Manifesto | manifesto.ts | chưa làm | stub; chỉ có scene `topo` |
| 04 Form | chrome.ts, c04.css, WireframeForms | xong | blob + 4 card + đếm + vortex (desktop) / reveal (mobile) |
| 05 Amplify | lasers.ts, c05.css | xong | 4 panel ngang, weight laser0..3, predictive/pixel arc |
| 06 Resonance | resonance.ts | dở | stub section; đã có `fx/ui/gauges.ts`, chưa có AudioWordmark, markup, CSS |
| 07 Works | orbit.ts | dở | stub section; đã có `canvas/Grainient.ts`, `fx/ui/characterWave.ts` |
| 08 Flow | flow.ts | dở | stub section; đã có `canvas/simplex.ts`, `canvas/FlowField.ts`, `three/WovenCloth.ts` |
| 09 Clarity | glass.ts | dở | stub section; đã có `fx/ui/toggle.ts`, `sparkBadge.ts`, `liquidMetal.ts` |
| 10 Signal Lost | signal.ts, c10.css, NeonSign | xong | CRT 4 kênh, neon canvas, scanline, glitch |
| 11 Core | core.ts | chưa làm | stub; chỉ có scene `orb` |
| 12 Footer | footer.ts | chưa làm | stub; chỉ có scene `ribbon` |

→ Spawn lại cả 4 nhóm (mỗi nhóm còn ít nhất 1 chương chưa xong): A (02, 03 + chỉnh 01), B (06), C (07, 08, 09), D (11, 12).
- [ ] Tích hợp: build + verify toàn trang, context ≤ 6, sửa xung đột

## Phase 3: Preloader + chương 01–04
- [ ] 00 Preloader (prewarm, log, đếm, chromatic intro, iris)
- [ ] 01 Origin (particle wordmark, frame, CTA)
- [ ] 02 Transit (warp streaks/letters/hyperspace, particle network, 3 từ bay xuyên)
- [ ] 03 Manifesto (scrub words, text path, kinetic lathe)
- [ ] 04 Form (liquid chrome, 4 card bay vào, typography vortex, wireframe forms)

## Phase 4: Chương 05–08
- [ ] 05 Amplify (4 laser cuộn ngang, weight theo panel, predictive/data pixel arc)
- [ ] 06 Resonance (bell strike, 4 gauges, audio wordmark)
- [ ] 07 Works (orbit 12 tile, grainient canvas, lightbox Flip, dải chữ sóng)
- [ ] 08 Flow (flow field, testimonials, woven cloth)

## Phase 5: Chương 09–12
- [ ] 09 Clarity (emerald, condensation trên card, toggle, comet, spark badge, liquid metal)
- [ ] 10 Signal Lost (CRT 4 biến thể, neon canvas, scanline)
- [ ] 11 Core (orb, ember storm, star portal, orbital sphere, CTA beam/slide/lumen)
- [ ] 12 Footer (ribbon, outline typeflow, newsletter dot border, back to top)

## Phase 6: Hoàn thiện
- [ ] Mobile 375px + reduced-motion (spec mục 14)
- [ ] Hiệu năng: đếm WebGL context ≤ 6, fps HUD ≥ 55 khi cuộn (máy thật), sửa điểm nghẽn
- [ ] README.md (chương → hiệu ứng → file nguồn ThreeUI, license)
- [ ] Rà lại toàn bộ Definition of Done (spec mục 15), tick từng ô kèm bằng chứng

## Nhật ký kiểm chứng

- Phase 0: `npx tsc --noEmit` sạch (vendor strict, không cần `@ts-nocheck`). Node 24.20, npm 11.19, gsap 3.15.0, lenis 1.3.27, three128 = three 0.128.0, vite 7.3.7, TS 5.9.3.
- Phase 1–2: tsc sạch; `vite build` OK (JS 740 kB / gzip 213 kB, CSS 18.8 kB); verify preview desktop+mobile 12 chương: 0 lỗi console, WebGL context đỉnh 2 (stage + dock), không tràn ngang. Screenshot: cả 13 scene stage đều có hình. `--boundaries`: dissolve A/B mix 0.50 ở mọi ranh giới có scene (nebula→stream, stream→topo, topo→liquid, liquid→laser0, laser3→bell, bell→dotmatrix, orb→ribbon); c08/c10 không scene → stage fade về nền qua u_level. Draw call stage: 2–3/frame (≤ 2 scene + composite).
