# Quyết định

- [0] Site đặt ở `web 2/signal-site/` (anh em với `threeui-main`), ghi được nên không cần sửa `.gitignore` của repo — đúng phương án chính của spec.
- [0] Dựng khung Vite bằng tay (package.json, tsconfig, vite.config.ts, index.html) thay vì `npm create vite` — create-vite mới hỏi tương tác "install and start now?", có thể treo trong shell không TTY; kết quả tương đương template vanilla-ts.
- [0] gsap resolve thành 3.15.0 (`^3.13` cho phép) — mọi plugin (ScrollTrigger, SplitText, Flip) vẫn miễn phí trong gói `gsap`.
- [0] Vendor qua `tsc` strict mà không lỗi nên không thêm `// @ts-nocheck` vào file nào.
- [0] npm 11 cảnh báo postinstall của esbuild chưa được duyệt trong `allowScripts`; build vẫn chạy qua gói platform của esbuild nên không đổi chính sách cài.
- [1] Thêm `core/gl.ts`: bọc `HTMLCanvasElement.getContext` để đếm context WebGL đang sống và `releaseCanvas()` gọi `WEBGL_lose_context` — vì `renderer.dispose()` của Three r128 và `dispose()` của CRT không trả context; lazy mount/unmount lặp lại sẽ chạm "too many active WebGL contexts".
- [1] `mountVendor(section, canvas, create(canvas), frame)`: khác spec ở chỗ `create` nhận canvas, và sau unmount canvas có context WebGL được thay bằng bản clone (canvas đã loseContext không tạo lại được context). Handle trả về `{ r, canvas, active }`; style nên đặt trên wrapper, không trên canvas.
- [1] `lockScroll(on, reason)` giữ một tập lý do (preloader/menu/hidden) thay vì bật/tắt trực tiếp — để chuyển tab trong lúc preloader không mở khoá scroll.
- [1] `loop.ts` tự hạ `scroll.velocity` về 0 (damp) vì Lenis không phát "scroll" khi đứng yên → tránh `scroll.smooth` kẹt ở giá trị cuối. Lenis raf đăng ký ticker với `prioritize` để chạy trước tick chính.
- [1] Composite thêm uniform `u_glitch` (dải nhiễu ngang + RGB split mạnh hơn) điều khiển qua `stage.glitch` cho chương 10; scenes.ts thêm "blob nổ" (liquid p > 0.85) và "orb trắng dần" (orb p > 0.8) theo mục 12/04, 12/11.
- [1] verify.mjs thêm cờ Chromium `--enable-unsafe-swiftshader` (Chrome mới chặn WebGL SwiftShader nếu thiếu), kiểm tra request lỗi cùng origin, tràn ngang, số context, `--boundaries` để chụp dissolve; thêm `scripts/sheet.mjs` ghép contact sheet.
- [2] Accent đổi chương bằng IntersectionObserver với dải giữa viewport (rootMargin -49.5%) thay vì đo coverage mỗi frame: tương đương "chương chiếm phần lớn màn" mà không đọc layout.
- [2] Dock: `topDockController` vendor tự chạy RAF nội bộ (không sửa được nếu không đổi vendor) — chấp nhận, chi phí nhỏ. Glass particle field render từ `onTick` ở 30fps, 60fps khi hover; `heightGrowth/drop = 0` vì pill cắt tràn.
- [2] Text FX + magnetic/tilt quét toàn trang SAU khi mọi section init (đánh dấu phần tử đã xử lý) để section tạo DOM động vẫn được áp; mỗi hiệu ứng có API theo phần tử (`decodeTo`, `splitReveal`, `addSkew`, `marquee`, `magnetic`, `tilt`…).
- [2] `[data-reveal]` ẩn tới khi SplitText tách xong (tránh nháy chữ thô); reduced-motion → fade đơn giản.
- [2] Menu mở: `main` mờ + `inert` để `stage.force()` preview hiện rõ phía sau; focus về nút Menu khi đóng.
- [2] Ambient starfield trôi theo chiều cuộn và tăng tốc theo vận tốc (bản gốc chỉ trôi lên đều).
- [2.5] Song song hoá: 4 subagent (A 00–03, B 04–06, C 07–09, D 10–12) theo `CONVENTIONS.md`; mỗi dev server dùng `VITE_CACHE_DIR` riêng để không giẫm cache tối ưu dependency của nhau.
- [2.5] Sau khi bị ngắt do hết limit: commit checkpoint `wip: partial chapters before limit reset`, spawn lại subagent cho các nhóm còn chương chưa xong, tiếp tục từ code hiện có (không viết lại).
- [2.5] verify.mjs: `page.setDefaultTimeout(120000)` — nhiều trình duyệt SwiftShader song song làm một screenshot vượt 30s mặc định (chương nặng như c04 raymarch, c10 CRT).
- [2.5] Ngân sách WebGL: stage + dock luôn sống (2).

## Chuyển sang portfolio IC Design (Nguyễn Ngọc Sơn)

- [pf] Yêu cầu mới thay nội dung SIGNAL → dừng 4 subagent đang dựng chương SIGNAL (tránh sửa chồng `index.html`), commit việc dở vào `af41c3e` rồi mới chuyển hướng.
- [pf] Giữ nguyên engine (stage 1 context + dissolve, Lenis, GSAP, text FX, dock/rail/menu/cursor, preloader) — tích hợp vào kiến trúc sẵn có thay vì dựng lại.
- [pf] Mọi dữ liệu cá nhân ở `src/content/profile.ts`; trường chưa có = rỗng → skeleton trên web, ẩn khi in. Không bịa dự án/kỹ năng/liên hệ/ảnh.
- [pf] Thêm headline ngành (theo ý người dùng) dưới dạng nội dung phổ thông về IC design flow (7 giai đoạn) + marquee thuật ngữ, đặt trong section riêng, không trình bày như kỹ năng/kinh nghiệm cá nhân. Đoạn giới thiệu chỉ mô tả portfolio, không khẳng định kinh nghiệm.
- [pf] Font: Syncopate/Fragment Mono không có dấu tiếng Việt → tên "Nguyễn Ngọc Sơn" sẽ lẫn font fallback. Chọn Unbounded (display), Geist (body), JetBrains Mono (mono) — cả 3 có subset `vietnamese` trên Google Fonts (đã kiểm tra CSS). Instrument Serif chỉ dùng cho chữ nghiêng tiếng Anh. Preloader `document.fonts.load(face, tên)` để tải đúng subset.
- [pf] Tên hero tách ký tự KHÔNG dùng mask của SplitText (mask cắt dấu chồng ễ/ọ/ơ), line-height ≥ 1.1.
- [pf] Shader custom `wafer` (lưới die, notch, thin-film iridescence, wafer-sort flash, chấm mực, zoom vào die theo pin) và `circuit` (route Manhattan 2 lớp, xung tín hiệu) — chủ đề bán dẫn rõ hơn các shader ThreeUI có sẵn. Tái dùng `stream`, `dotmatrix`, `topo`, `ribbon` cho các section sau.
- [pf] Khung chân dung = package QFN (chân + dây bond + cửa sổ die). Chưa có ảnh thật → placeholder trừu tượng "Portrait — to be added", không tạo ảnh người.
- [pf] CV: không có file PDF thật trong repo → không hiện nút Download; thay bằng "Print / Save as PDF" (`window.print`) + `print.css` (A4, trắng/đen, chỉ `#cv`, ép trạng thái cuối, đổi biến màu trong `#cv`). Nút Download tự hiện khi `profile.cvFile` có giá trị.
- [pf] Footer không có liên hệ (chưa có dữ liệu thật) — khối `[data-contact]` bị gỡ khi mảng rỗng. Thay đồng hồ giờ địa phương bằng "session uptime" để không ngầm khẳng định nơi ở.
- [pf] Design flow: desktop ≥ 900px pin + cuộn ngang; < 900px hoặc reduced → danh sách dọc. Dùng `gsap.matchMedia` để tự dựng lại khi đổi breakpoint.
- [pf] Đường mạch toàn trang: SVG fixed hẹp 52px, `<g>` dịch theo scrollY (chỉ raster một dải hẹp mỗi frame) thay vì SVG cao bằng cả trang; hình học dựng lại ở mỗi `ScrollTrigger.refresh`.
- [pf] `scrubWords` bỏ qua khi reduced-motion (chữ không bị mờ chờ cuộn).
- [pf] Link `#…` trong trang cuộn qua Lenis rồi `focus()` đích (section có `tabindex="-1"`) cho người dùng bàn phím.
- [pf2] Con trỏ: bỏ chấm DOM + `cursor: none`, dùng con trỏ HỆ THỐNG với SVG "probe" (chữ thập + chấm, viền tối) đổi màu theo accent qua biến `--cur`/`--cur-hot` → OS vẽ, không trễ khi shader làm tụt fps. Vòng ring chỉ trang trí, damp 14 → 32, bỏ `mix-blend-mode: difference` (blend trên canvas WebGL toàn màn tốn compositing mỗi frame). Nhãn ring chỉ dùng cho vùng không có chữ (package, card), không dùng trên nút có chữ.
- [pf2] Lỗi thật: `.btn { transition: transform }` + GSAP cùng ghi `transform` → GSAP parse giá trị đang transition dở, CTA hero kẹt lệch 24px tới khi hover rồi giật lên; magnetic bị kéo lê 0.5s. Sửa: hover nút/menu dùng thuộc tính độc lập `scale`/`translate`, transform để GSAP độc quyền; intro CTA dùng `yPercent`; magnetic tạo quickTo lúc chạm đầu và tính lệch theo tâm gốc.
- [pf2] `ShaderStage.measure()` (đọc rect section + kích thước canvas) chuyển sang tick "early"; render ở "late" không còn ép reflow sau khi các module khác ghi DOM.
- [pf2] Starfield nền: đứng yên vẽ 20fps (canvas toàn màn), cuộn thì mỗi frame; bỏ tạo chuỗi rgba mỗi sao mỗi frame.
- [pf2] Tên outline footer + marquee flow: `-webkit-text-stroke` trên font variable lộ nét chồng bên trong → `paint-order: stroke fill` với ruột màu nền (chỉ còn viền ngoài sạch) + lớp tô màu theo con trỏ riêng. Nút back-to-top đổi `btn-dotborder` (viền conic vỡ trên pill dài) → `btn-beam`.
- [pf2] Wafer: chấm mực mờ đi khi zoom vào die (không phình thành vết loang). Thêm favicon SVG + thẻ Open Graph. verify.mjs: `--base` (kiểm tra bản deploy), viewport laptop 1280×720 và tablet 820×1180.
- [pf] Giữ các module hiệu ứng không còn dùng (canvas/three/fx/ui/vendor của SIGNAL) làm thư viện — Vite không đóng gói file không import; các section/CSS riêng của SIGNAL thì xoá. Vùng đông nhất là 10–11 (CRT + ember + orbital + lumen) → chương 11 phải giữ ≤ 3 context riêng, khuyến khích port Lumen không cần context riêng.
