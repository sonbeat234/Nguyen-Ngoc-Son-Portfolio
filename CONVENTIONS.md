# Quy ước code (portfolio)

1. **Nội dung**: chỉ ở `src/content/profile.ts`. Section render từ đó; chuỗi người dùng chèn vào `innerHTML` luôn qua `esc()`. Không viết dữ liệu cá nhân chưa xác nhận vào code hay HTML.
2. **Một RAF**: mọi animation theo frame đăng ký `onTick(fn, "early" | "normal" | "late")` (`core/loop`). Đọc layout ở `"early"`, ghi DOM ở `"normal"`; `ShaderStage.render` chạy `"late"`. Không cấp phát trong tick ở vòng lặp nóng (typed array, chuỗi tính sẵn).
3. **WebGL**: nền dùng chung `stage` (`stage/scenes.ts`, scene gắn section qua `data-scene`). Renderer WebGL riêng phải qua `mountVendor` (`core/vendor`) để lazy mount + giải phóng context. Ngân sách đồng thời ≤ 6 (hiện dùng 2).
4. **Section**: mỗi section một file `src/sections/*.ts` export `init*()`, CSS ở `src/styles/sections/*.css`, selector bắt đầu bằng `#<id-section>`. Pin: `trigger` = section, `pin` = `"#id .pin"`.
5. **Hiệu ứng chữ dùng chung** qua thuộc tính: `data-decode`, `data-reveal="lines|words|chars"`, `data-scrub`, `data-skew`, `data-marquee`, `data-magnetic`, `data-tilt` — `main.ts` quét sau khi mọi section init.
6. **Reduced-motion & mobile**: kiểm tra `state.reduced` / `state.touch` / `state.mobile`; reduced = chế độ thay thế (nội dung đủ, chuyển động tối thiểu), không phải bản cắt nội dung. Mọi animation CSS có nhánh `prefers-reduced-motion` + `html.reduced`.
7. **In**: `styles/print.css` chỉ in `#cv`; thành phần mới trong CV cần đúng ở trạng thái cuối khi `transform/opacity` bị ép về mặc định.
8. **Kiểm chứng** trước khi commit: `npx tsc --noEmit`, `npm run build`, `scripts/verify.mjs` (0 lỗi) + tự xem contact sheet.
