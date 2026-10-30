# Quyết định

- [0] Site đặt ở `web 2/signal-site/` (anh em với `threeui-main`), ghi được nên không cần sửa `.gitignore` của repo — đúng phương án chính của spec.
- [0] Dựng khung Vite bằng tay (package.json, tsconfig, vite.config.ts, index.html) thay vì `npm create vite` — create-vite mới hỏi tương tác "install and start now?", có thể treo trong shell không TTY; kết quả tương đương template vanilla-ts.
- [0] gsap resolve thành 3.15.0 (`^3.13` cho phép) — mọi plugin (ScrollTrigger, SplitText, Flip) vẫn miễn phí trong gói `gsap`.
- [0] Vendor qua `tsc` strict mà không lỗi nên không thêm `// @ts-nocheck` vào file nào.
- [0] npm 11 cảnh báo postinstall của esbuild chưa được duyệt trong `allowScripts`; build vẫn chạy qua gói platform của esbuild nên không đổi chính sách cài.
