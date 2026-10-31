# Portfolio IC Design — tiến độ

Quy tắc làm việc: `../threeui-main/PROMPT_AUTONOMOUS_RUN.md` (tự chủ, ghi DECISIONS, kiểm chứng tsc + build + verify headless + tự xem ảnh, commit cục bộ).
Nội dung: `src/content/profile.ts`. Hướng dẫn: `README.md`.

## Vòng V4 (`../threeui-main/PROMPT_V4_THEME_PROJECTS.md`, nhánh `v4-theme-projects`)
- [x] Ảnh before (verify-v4-before — chụp từ bản build đóng băng của `main`, desktop + mobile, 3 điểm mỗi section, 0 lỗi)
- [x] Token màu mới, bỏ hex rải rác, shader theo palette, giữ đổi màu theo section
- [x] Con trỏ chuẩn (mũi tên / bàn tay) đổi màu theo section, bỏ ring + nhãn
- [x] Loading screen màu mới + motion mới, thời gian ≤ 2.2 s
- [x] Profile: dim shader vùng chữ, panel, scrub mới, contrast đạt
- [x] Contrast đạt ở mọi section (contrast.json)
- [x] Mở rộng type Project + ví dụ trong README
- [x] Card bấm được, Flip mở/đóng, URL / Back / Esc / focus
- [x] Chế độ sách: lật cong giấy, kéo / phím / chuột / bấm, chỉ số trang
- [x] Chế độ cuộn: Lenis riêng, reveal, gallery ngang, nhớ lựa chọn
- [x] ≥ 10 hiệu ứng chữ/chuyển động mới, có bảng trong DECISIONS (17 mục)
- [x] Reduced-motion + mobile đầy đủ
- [x] verify (4 viewport + reduced + --projects) 0 lỗi, WebGL ≤ 4
- [x] Tự xem contact sheet, so sánh before/after
- [x] Cập nhật README / DECISIONS / PROGRESS, commit nhánh v4

### Nhật ký kiểm chứng V4 (bản build `verify-v4-dist`, preview cổng riêng)
- `npx tsc --noEmit` sạch; `npm run build` OK (JS ~805 kB / gzip ~237 kB).
- `verify.mjs --steps 3 --gpu` desktop / laptop / tablet / mobile (`verify-v4/`): **0 lỗi** console / pageerror / HTTP, tràn ngang 0 ở cả 4 khung, đỉnh **3** WebGL context (stage + dock thường trực, hạt hero ~2 s lúc intro). Lượt SwiftShader desktop + mobile (`verify-v4-sw/`): 0 lỗi, đỉnh 3.
- `--reduced` (`verify-v4-reduced/`): 0 lỗi, đỉnh 2, nội dung đủ.
- `--projects --gpu` desktop / laptop / tablet / mobile (`verify-v4-projects/`): Enter trên card mở overlay (main `inert`, hash `#project/die-01`); desktop + laptop = sách: ← → hai lần → "Page 5–6 / 8", kéo góc nửa chừng chụp được trang đang cong (dựng dải 2–2.5 ms; quality hạ cấp → 8 dải), thả → "Page 7–8 / 8"; tablet 820px + mobile = chế độ cuộn (3 vị trí). Esc đóng và trả focus về card; Back của trình duyệt đóng overlay; mở thẳng `/#project/die-01` → overlay hiện sau preloader. `--projects --reduced`: 0 lỗi, mặc định chế độ cuộn.
- `contrast.mjs --gpu` desktop + mobile × 6 section × 3 vị trí × 3 khung (`verify-v4/contrast.json`): **270 khối, 0 khối dưới ngưỡng** (chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1). Lần đo đầu (trước khi sửa) trượt 9 khối: tiêu đề Design flow 1.4:1 trên dải sáng shader, nhãn stage, caption package, `em` lúc chưa sáng → sửa bằng shield composite + nền thẻ đậm hơn + em không mờ.
- Preloader (mark `preloader:loaded` → `preloader:done`): GPU thật (Intel UHD qua ANGLE D3D11) lần đầu **1.50 s**, mở lại trong phiên **0.48–0.68 s**; SwiftShader 2.27 s / 1.14 s (biên dịch shader bằng CPU — không đại diện).
- Before/after: `verify-v4/compare-desktop.png`, `verify-v4/compare-mobile.png` (loading, hero, profile, flow, projects, sách / chế độ cuộn, CV, end of line).
- Chưa đo được: fps / long task khi lật trang trên máy thật bằng DevTools Performance (headless chỉ đo được thời gian dựng dải 2–3 ms); cảm giác kéo trang bằng chuột/touch thật.

## Chuyển đổi SIGNAL → portfolio
- [x] Dừng 4 subagent SIGNAL, commit checkpoint `af41c3e` (toàn bộ việc dở được giữ trong git)
- [x] Giữ engine: core (loop/scroll/quality/lazy/gl/hud), ShaderStage + composite dissolve, text FX, cursor/magnetic/tilt, dock/rail/menu/progress/grain, preloader
- [x] Xoá 11 section + 13 file CSS chương SIGNAL (khôi phục: `git checkout af41c3e -- src/sections src/styles/chapters`)

## Portfolio
- [x] Nguồn nội dung duy nhất `src/content/profile.ts` (TODO cho mọi trường chưa có, không bịa dữ liệu)
- [x] Font có tiếng Việt: Unbounded / Geist / JetBrains Mono (Google Fonts, đã kiểm tra subset vietnamese)
- [x] Shader mới: `wafer` (hero, zoom vào die theo cuộn), `circuit` (profile, xung tín hiệu trên dây metal)
- [x] Preloader POWER-ON (chip mark, log khởi động, tên chromatic, iris)
- [x] Hero: tên kinetic, precision frame, readout, CTA
- [x] Profile: package QFN làm khung chân dung (placeholder, chưa có ảnh thật), datasheet, vòng điểm IELTS/TOEIC
- [x] Design flow: 7 headline ngành, cuộn ngang (desktop) / dọc (mobile, reduced), 7 visual riêng (2 canvas)
- [x] Projects: 3 card die trống có TODO
- [x] CV: Profile / Education / Projects / Skills / Languages, chuyển động đồng bộ, in A4 (print.css), nút Download chỉ hiện khi có file thật
- [x] End of line: tên outline typeflow, uptime, back to top; liên hệ chỉ hiện khi có dữ liệu thật
- [x] Đường mạch SVG toàn trang vẽ theo cuộn
- [x] README.md

## Nhật ký kiểm chứng
- `npx tsc --noEmit`: sạch. `npm run build`: OK (JS 753 kB / gzip 219 kB, CSS 62 kB / gzip 14 kB).
- Verify bản preview (`verify-pf`, desktop 1440×900 + mobile 375×812, 3 điểm mỗi section + ranh giới): **0 lỗi** console / pageerror / WebGL / HTTP, không tràn ngang, đỉnh **2** WebGL context. Dissolve có ở mọi ranh giới.
- Vòng sửa sau khi xem ảnh: header Design flow bị đẩy ra ngoài màn (cột grid giãn theo track) → `grid-template-columns: 100%`; caption datasheet; dây bond đứt nét (non-scaling-stroke + pathLength); code RTL tràn trên mobile; wafer lệch phải hơn + nền mờ cho readout hero.
- Reduced-motion (`verify-reduced`): 0 lỗi, mọi nội dung hiện; Design flow dạng dọc.
- In CV (Playwright `page.pdf`, media print): 1 trang A4 trắng/đen, khối trống (Projects, Skills) bị ẩn, thanh điểm đúng tỉ lệ.
- Chưa đo được: fps trên máy thật (headless SwiftShader ~20–25 fps, không đại diện).

## Vòng cải thiện 2 (sau khi deploy Cloudflare Pages)
- [x] Con trỏ hệ thống hình probe theo accent (không trễ) + ring bám nhanh hơn, bỏ mix-blend
- [x] Sửa CTA hero kẹt lệch 24px / magnetic bị kéo lê (xung đột CSS transition `transform` với GSAP)
- [x] Bớt reflow mỗi frame (stage.measure ở tick early), starfield 20fps khi đứng yên
- [x] Tên outline footer + marquee sạch nét (paint-order), nút back-to-top mới, chấm mực wafer khi zoom
- [x] Favicon + Open Graph; verify.mjs thêm `--base`, viewport laptop/tablet
- Kiểm chứng: tsc + build sạch; verify desktop/laptop/tablet/mobile + reduced: 0 lỗi, 2 WebGL context; bản deploy (`--base https://nguyen-ngoc-son-portfolio.pages.dev`) 0 lỗi; kiểm tra con trỏ bằng Playwright: CSS cursor = SVG, ring cách con trỏ ~5px sau 100ms khi nhảy 300px, hover nút bật trạng thái hot.

<details><summary>Lịch sử SIGNAL (trước khi chuyển sang portfolio)</summary>

Phase 0–2 hoàn tất (engine, stage, lớp toàn cục, text FX). Chương 00, 01, 04, 05, 10 đã xong; 02, 03, 06–09, 11, 12 còn dở khi chuyển hướng. Toàn bộ nằm trong commit `af41c3e`.
</details>
