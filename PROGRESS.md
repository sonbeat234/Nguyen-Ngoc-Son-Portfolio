# Portfolio IC Design — tiến độ

Quy tắc làm việc: `../threeui-main/PROMPT_AUTONOMOUS_RUN.md` (tự chủ, ghi DECISIONS, kiểm chứng tsc + build + verify headless + tự xem ảnh, commit cục bộ).
Nội dung: `src/content/profile.ts`. Hướng dẫn: `README.md`.

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

<details><summary>Lịch sử SIGNAL (trước khi chuyển sang portfolio)</summary>

Phase 0–2 hoàn tất (engine, stage, lớp toàn cục, text FX). Chương 00, 01, 04, 05, 10 đã xong; 02, 03, 06–09, 11, 12 còn dở khi chuyển hướng. Toàn bộ nằm trong commit `af41c3e`.
</details>
