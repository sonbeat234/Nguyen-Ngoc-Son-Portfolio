# SIGNAL — tiến độ

Spec: `../threeui-main/PROMPT_SIGNAL_SCROLL_SITE.md` · Quy tắc: `../threeui-main/PROMPT_AUTONOMOUS_RUN.md`

## Phase 0: Khởi tạo
- [x] Đọc toàn bộ spec + lướt các file nguồn ở spec mục 2.2
- [x] Tạo dự án Vite TS, cài dependency (spec mục 2)
- [x] Copy vendor, font, ảnh, license (spec mục 2.1), sửa import tương đối nếu cần
- [x] tsconfig, three128.d.ts, `npx tsc --noEmit` sạch (vendor được @ts-nocheck)
- [x] git init + commit

## Phase 1: Core engine
- [ ] core/math, state, loop, scroll, quality, lazy, dom, vendor (spec mục 4, 11)
- [ ] ShaderStage + composite + scenes (spec mục 5), shader nebula/topo (mục 6)
- [ ] Trang test tạm: 12 section rỗng có data-scene, cuộn thấy dissolve giữa mọi scene, không lỗi console
- [ ] Debug HUD `?debug`

## Phase 2: Hệ thống thiết kế + lớp toàn cục
- [ ] tokens.css, base.css, @font-face, buttons.css (8 kiểu nút)
- [ ] cursor, magnetic, tilt + spotlight, accent theo chương, dock, rail, progress, grain, menu fullscreen + stage.force
- [ ] text FX: decode, reveal, scrub, glitch, velocity skew, marquee, text path, neon

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
