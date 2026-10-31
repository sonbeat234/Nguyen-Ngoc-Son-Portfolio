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

## Vòng V4 (màu chủ đạo · profile dễ đọc · con trỏ thường · project mở chi tiết · motion text)

- [v4] Ảnh "before" chụp từ bản build đóng băng của `main` (`vite build --outDir verify-v4-before-dist`, preview cổng riêng) — dev server có HMR sẽ lẫn code mới vào ảnh before; bộ before có sẵn trong thư mục chỉ 2 điểm/section và thiếu Design flow nên chụp lại đủ 3 điểm.
- [v4] Một nguồn màu: khối BẢNG MÀU trong `tokens.css` + `data-accent*` trong `index.html`; JS (shader, con trỏ, neon, hạt hero) đọc lại token lúc chạy qua `stage/palette.ts` — không có hex thứ hai trong code. Hex còn lại có chủ đích: `#000` trong `mask` (chỉ là kênh alpha), `print.css` (trắng/đen theo yêu cầu), GLSL vendor (không sửa logic vendor).
- [v4] Shader vendor (`stream`, `dotmatrix`, `ribbon`) không có chỗ nhận màu → recolor trong composite: `grade()` lấy kênh sáng nhất làm độ sáng rồi ramp accent → accent2 (amount 0.8–0.9). `wafer`, `circuit`, `topo` nhận uniform màu trực tiếp. Viền dissolve = accent2 của scene đích (scene sau theo thứ tự trang).
- [v4] Wafer: óng ánh thin-film = 62% ramp palette (accent → signal → accent2) + 38% cầu vồng gốc — vẫn đọc ra vật liệu silicon mà theo màu chủ đạo. Chấm mực die hỏng giữ đỏ (ý nghĩa vật lý, diện tích rất nhỏ).
- [v4] `--on-primary` = INK: `#8B7BFF` với đen 6.4:1, với trắng chỉ 3.3:1. `--gold` giữ làm token suy ra (COPPER pha BONE) cho chi tiết vật liệu sáng; dây bond / chân chip dùng COPPER như mục 1.
- [v4] Con trỏ: SVG vẽ tay 24px — mũi tên (hotspot 5,2), bàn tay (hotspot đầu ngón 10,2), I-beam (12,12); ruột accent, viền `rgb(0 0 0 / .85)` 1.5px. Cập nhật qua `onAccent()` (onUpdate của tween accent, chặn 100 ms). Bỏ ring + nhãn + `data-cursor` (CONVENTIONS cập nhật).
- [v4] `characterWave` gốc là băng chuyền ký tự quấn vòng (đảo thứ tự chữ) → thêm `waveLabel()`: cùng hàm focus exp(−d²k) + sin + rotateY nhưng giữ vị trí ký tự để "POWER-ON" vẫn đọc được.
- [v4] Thời gian preloader đo bằng mark `preloader:loaded` → `preloader:done`. Headless SwiftShader cho 2–4 s vì biên dịch shader WebGL bằng CPU (dock, hạt hero) rơi đúng vào intro → (a) lớp toàn cục và renderer hạt hero khởi tạo + vẽ/biên dịch ngay trong pha tải (song song font và prewarm stage); (b) chờ một nhịp ticker trước khi dựng timeline reveal (lagSmoothing 0 khiến timeline tạo ngay sau tác vụ dài "nhảy cóc" bỏ qua iris); (c) MIN_MS 1900 → 700 (chỉ chống nháy), chờ `fonts.ready` ≤ 250 ms. Đo trên GPU thật (Chromium headless + ANGLE D3D11, Intel UHD): lần đầu ~1.5 s, mở lại trong phiên ~0.6–0.7 s. `verify.mjs --gpu` để chạy như vậy.
- [v4] Profile: `circuit` nhận `u_dim` 0.6 + `u_textRect` (đo ở tick "early" chỉ khi section hiện, mảng dùng lại); trong vùng chữ + viền mềm 8% nền còn 26% độ sáng; glow via/xung −40%.
- [v4] Scrub: `<em>` không bị tách (SplitText `ignore`) để `background-clip: text` còn tác dụng; em giữ opacity 1 (màu chờ `--mute` đã đủ tương phản trên panel), chỉ quét gradient. Từ thường 0.4 → 1, mute → bone, kết thúc ở "bottom 55%".
- [v4] "Shield" chung thay cho panel đặc ở mọi nơi: composite nhận tối đa 6 hình chữ nhật `[data-shield]` (đầu Design flow + thanh đếm, đầu Profile, đầu Projects) → nền sau chữ còn 28% độ sáng, viền mềm 56px; chi phí 6 phép so sánh/pixel. Thẻ stage của flow đậm nền hơn (panel 92/86%), stage không active 0.55.
- [v4] `contrast.mjs`: đo theo hộp các dòng chữ (Range rects) thay vì hộp phần tử (icon/padding sáng làm sai); chữ có opacity < 1 trộn với nền trước khi tính; bỏ khối ngoài dải đọc 8–92% hoặc đang mờ (< 0.5 — trừ từ scrub, đo cả khi mờ); nền = p95 (chữ sáng) / p5 (chữ tối) qua 3 khung. Chạy trên bản build có cổng riêng để HMR không reload giữa phép đo.
- [v4] Overlay project nằm ngoài `<main>` (main nhận `inert`) → selector `#project-view` thay vì `#projects`. Card: `<a class="pc-hit" href="#project/slug">` phủ toàn card, link ngoài nằm ngoài link phủ (z-index cao hơn); Space trên link cũng mở. `main.ts` bỏ qua link `#project/…`.
- [v4] Flip: `data-flip-id` chung card ↔ khung overlay, reset tilt của card trước `Flip.getState`. Đóng: mở bằng pushState → `history.back()` (popstate thấy đang bận nên bỏ qua); mở bằng deep link → `replaceState` xoá hash. Project trước/sau dùng `replaceState` (Back luôn đóng overlay thay vì lùi qua từng project).
- [v4] Sách: số trang lẻ → thêm trang "end paper" trang trí; chỉ số dạng "Page 3–4 / 8" (một spread hai trang). `perspective` đặt trên `.pv-spread` (không preserve-3d ở spread) → lá lật được chiếu phối cảnh rồi xếp theo z-index, không z-fighting với trang bên dưới.
- [v4] Mỗi mặt dải giữ bản sao `.pg` (gồm cả nền giấy) đặt lệch theo dải; `container-type: size` trên `.pv-clone` để cỡ chữ `cqh` khớp trang thật. Dựng 16 dải ≈ 2–3 ms (đo trong `--projects`).
- [v4] Kéo trang: vùng bắt là dải mép ngoài 8% (đủ chiều cao) có nếp gấp gợi ý ở góc dưới; thả tay: lật nếu t > 0.42 hoặc vận tốc > 1.1/s; chạm nhẹ (< 6px) = lật. Wheel: khoá tới khi ngừng nhận wheel 220 ms (quán tính trackpad) → một cử chỉ một trang.
- [v4] Chế độ cuộn: `data-lenis-prevent` trên vùng cuộn để Lenis chính bỏ qua; `grid-template-columns: minmax(0, 1fr)` (dải gallery `max-content` từng kéo giãn cột gây tràn ngang trên mobile).
- [v4] Hero: ParticleWordmark gốc dùng Syncopate (không có dấu tiếng Việt) và hộp 9 × 2.1 cố định → viết `createParticleName`: camera trực giao 1 đơn vị = 1px, lấy mẫu từ canvas 2D vẽ TỪNG ký tự đúng vị trí ô SplitText và đúng font computed → hạt khớp chữ DOM; hai pha (tạo + biên dịch trong pha tải, `setLines` lúc intro); trả context ngay khi xong (`mountVendor().stop()` mới).
- [v4] Sóng độ đậm: `font-variation-settings "wght"` theo `--k` của kinetic type; ô ký tự khoá bề rộng (`offsetWidth`) để chữ đậm lên không reflow cả dòng. Google Fonts Unbounded đổi sang `wght@200..900`.
- [v4] `decode.ts` chuyển sang một tick chung (trước đó mỗi phần tử một `requestAnimationFrame`) — đúng mục 8 "một RAF"; thêm `decodeGroup()` = Article Headings (stagger 140, preserve .3, tail .18).
- [v4] Profile title dùng reveal "flip" (SplitText chars, không mask, `from: "center"`), xong thì `revert()` DOM rồi em nhận vệt gradient CSS; `text-shadow` của tiêu đề tắt trên em (bóng phủ lên chữ clip-text).
- [v4] Neon "THANKS": thêm glyph K vào NeonSign; bảng màu ống suy ra từ palette. Hiệu ứng nặng duy nhất của End of line (canvas 2D, không tốn WebGL context).

- [v4] Reflog: nhánh `v4-theme-projects` do một tiến trình khác tạo lúc 12:36 rồi xoá lúc 12:39 (checkout về `main`), nên các commit v4 ban đầu rơi vào `main` cục bộ → tạo lại `v4-theme-projects` tại HEAD và đưa `main` về `4cecf32` (= `origin/main`). Không mất commit, không merge, không push.

### Hiệu ứng V4

| # | Tên | Vị trí | Nguồn (ThreeUI) | Giấy phép | Chi phí |
|---|---|---|---|---|---|
| 1 | Sóng ký tự "POWER-ON" | Preloader | `character-carousel/sources/character-wave.html` → `fx/ui/characterWave.ts` (`waveLabel`) | MIT | 8 span transform, tick chung |
| 2 | Tên 3 kênh palette hội tụ → chữ BONE glow | Preloader | chromatic intro của uplink-loader (đã có) — đổi kênh màu | MIT | 4 lớp DOM, transform/opacity |
| 3 | Iris có viền sáng PRIMARY | Preloader | tự viết (mask radial + `::after` theo `--r`) | — | 1 gradient toàn màn ~0.8 s |
| 4 | Log decode + con trỏ khối nhấp nháy | Preloader | `article-headings/articleHeadingDecode.ts` | MIT | text node, tick chung |
| 5 | Hạt hội tụ thành tên rồi nhường chữ DOM | Hero | `neuform-isolated` ParticleWordmark → `three/ParticleWordmark.ts` | MIT | WebGL context thứ 3 trong ~2 s, ≤ 14k điểm |
| 6 | Sóng độ đậm theo con trỏ | Hero | kỹ thuật font variable (brief mục 7.3) | — | `font-variation` 15 ô khoá bề rộng |
| 7 | Lật ký tự 3D lan từ tâm | Profile (tiêu đề) | GSAP SplitText (brief mục 7.3) | GSAP (miễn phí) | ~25 ký tự, chạy một lần |
| 8 | Vệt gradient quét chữ nghiêng | Profile (tiêu đề + scrub) | tự viết CSS | — | `background-position` |
| 9 | Tiêu đề stage scramble khi active | Design flow | `article-headings` decode | MIT | text node |
| 10 | Tiêu đề trượt từng từ + lăn khi hover | Projects | `neuform-isolated/sources/sliding-text-cta.html` + bố cục `gallery-heading.html` | MIT | transform từng từ |
| 11 | Tiêu đề card decode khi cắt | Projects | `article-headings` decode | MIT | text node |
| 12 | Viền beam + vệt quét chéo + nâng nhẹ | Card project | `gradient-beam-cta.html` (`.btn-beam`) | MIT | conic + translate, chỉ khi hover |
| 13 | Lật trang cong giấy (16/8/1 dải) | Overlay — sách | `sketchbook/sketchbookDocument.js` (`.curl/.strip`, `--tt/--td`) | MIT | 2N bản sao DOM, chỉ trong lúc lật |
| 14 | Tiêu đề trang theo ký tự + số đếm lên + ảnh wipe | Overlay — sách | GSAP SplitText + clip-path | GSAP | khi trang mở |
| 15 | Line reveal, ảnh wipe + parallax, gallery ngang khi pin | Overlay — cuộn | GSAP ScrollTrigger (scroller riêng) + Lenis thứ 2 | GSAP / MIT | Lenis 2 trên `gsap.ticker` |
| 16 | Decode cả nhóm kiểu Article Headings | CV | `article-headings/articleHeadingDecode.ts` | MIT | text node, tick chung |
| 17 | Biển neon "THANKS" bật đèn từng chữ | End of line | `neuform-isolated/sources/glassblown-neon.html` → `canvas/NeonSign.ts` | MIT | canvas 2D bake 1 lần, ghép lát khi hiện |
