# Nguyễn Ngọc Sơn — IC Design & Semiconductor Portfolio

Portfolio + CV một trang, cuộn liên tục, nền WebGL đổi theo từng phần (dissolve noise có viền sáng), dựng trên engine của dự án SIGNAL trước đó (Vite + TypeScript, GSAP, Lenis, một WebGL context cho toàn bộ shader nền).

## Chạy

```bash
npm i
npm run dev        # http://localhost:5173  (thêm ?debug để xem HUD: fps, scene, số WebGL context)
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # xem bản build ở http://localhost:4173
```

Kiểm tra headless (Playwright + SwiftShader, cần server đang chạy):

```bash
node scripts/verify.mjs --port 4173 --out verify --steps 3 --boundaries   # desktop + mobile, mọi section
node scripts/verify.mjs --port 4173 --out verify-reduced --reduced          # chế độ giảm chuyển động
node scripts/sheet.mjs verify desktop 4                                     # ghép contact sheet
```

## Sửa nội dung — chỉ một file: `src/content/profile.ts`

Mọi thông tin cá nhân nằm ở đây; hero, Profile, Projects, CV và footer đều đọc từ file này. Trường để trống (`""` / `[]`) hiện dạng ô skeleton trên web và **bị ẩn khi in CV** — trang không bao giờ hiện chữ bịa.

| Trường | Hiện trạng | Cần làm |
|---|---|---|
| `fullName`, `dateOfBirth`, `education`, `ielts`, `toeic` | đã điền (thông tin đã xác nhận) | — |
| `portrait` | trống → khung package chip hiện "Portrait — to be added" | chép ảnh thật vào `public/img/portrait.webp`, đặt `portrait: "/img/portrait.webp"` |
| `cvFile` | trống → chỉ có nút **Print / Save as PDF** | nếu có PDF thật: chép vào `public/cv/…pdf`, đặt đường dẫn → nút **Download PDF** tự hiện |
| `summary` | bản nháp trung tính, chỉ dùng thông tin đã có | viết lại bằng giọng của bạn |
| `educationEntries[0].program / period / notes` | trống | ngành học, năm học, GPA / môn tiêu biểu (nếu muốn) |
| `projects[]` | 3 ô trống | mỗi dự án: `title, objective, tools[], role, outcome, period, link` |
| `skills[]` | trống | nhóm kỹ năng thật, vd `{ group: "HDL", items: ["Verilog"] }` |
| `languages[]` | English: IELTS 6.0, TOEIC 750 | thêm ngôn ngữ khác nếu muốn |
| `contact[]` | trống → không có nút liên hệ nào | email / LinkedIn / GitHub thật |

Thông tin xác nhận cũng được viết cố định trong `index.html` ở hero (tên, FPT University Hanoi, IELTS, TOEIC), preloader và footer — nếu đổi tên hiển thị, sửa cả ở đó.

## Cấu trúc trang

| # | Section (`index.html`) | Nền stage (shader) | Hiệu ứng chính | Code |
|---|---|---|---|---|
| 00 | Preloader "POWER-ON" | — | bộ đếm 000→100 theo font + prewarm shader, log terminal decode, thanh 16 ô, tên tách R/G/B hội tụ, mở bằng iris | `sections/preloader.ts`, `styles/sections/preloader.css` |
| 01 | Power-on (hero) | `wafer` (custom) | wafer 300 mm óng ánh màng mỏng theo chuột, die "probe" loé sáng, chấm mực die hỏng; pin 140% zoom vào một die. Tên ký tự dựng lên + kinetic type theo con trỏ, precision frame (toạ độ chuột, giờ UTC), readout decode, CTA magnetic | `sections/hero.ts`, `shaders/wafer.ts` |
| 02 | Profile | `circuit` (custom) | đi dây metal 2 lớp parallax, xung tín hiệu chạy dọc dây; khung chân dung là package QFN (40 chân có tín hiệu chạy vòng, dây bond vàng vẽ dần, tia quét die), tilt + spotlight; chữ sáng theo cuộn; datasheet decode; vòng điểm IELTS/TOEIC | `sections/about.ts`, `shaders/circuit.ts` |
| 03 | Design flow | `stream` | 7 headline ngành (Specification → Signoff & tape-out); desktop: pin + cuộn ngang, parallax trong thẻ, bộ đếm giai đoạn; visual: PPA morph, block diagram, RTL gõ từng dòng, waveform viewer (canvas), netlist có dòng tín hiệu, place & route + clock H-tree (canvas), chồng lớp layout tách 3D + checklist; marquee thuật ngữ theo vận tốc cuộn | `sections/designFlow.ts`, `canvas/Waveform.ts`, `canvas/PlaceRoute.ts` |
| 04 | Projects | `dotmatrix` | card "die": cắt ra từ tâm (clip-path), tilt 3D + spotlight + chữ thập probe, parallax lệch nhịp | `sections/projects.ts` |
| 05 | CV | `topo` | tài liệu nổi lên + tia quét, tiêu đề decode, khối reveal, timeline vẽ theo cuộn, thanh điểm đầy dần; in A4 sạch | `sections/cv.ts`, `styles/print.css` |
| 06 | End of line | `ribbon` | tên outline khổng lồ tô màu theo con trỏ, session uptime, "Back to power-on" tua ngược qua mọi dissolve | `sections/eol.ts` |

Lớp toàn cục (`fx/ui/*`): đường mạch SVG mép trái vẽ theo tiến độ cuộn (nấc 45° + via ở mỗi section, `trace.ts`), top dock kính có hạt (WebGL), rail chấm, thanh progress, menu fullscreen preview scene, cursor dot + ring có nhãn, grain, starfield mờ. RGB split của composite tăng khi cuộn nhanh.

## Hiệu năng & khả năng truy cập

- Một RAF (`gsap.ticker`) cho mọi thứ; canvas 2D chỉ render khi đang hiện; không cấp phát trong tick ở các vòng lặp nóng.
- WebGL context đồng thời: **2** (stage + dock) — đo bằng `scripts/verify.mjs`, ngân sách ≤ 6.
- Quality tự hạ độ phân giải stage khi fps < 48.
- `prefers-reduced-motion` (hoặc `?reduced`): Lenis không làm mượt, shader chậm 4×, reveal = fade, không marquee/skew/scrub, Design flow thành danh sách dọc — nội dung hiện đủ.
- Bàn phím: skip link, focus ring accent, link `#…` cuộn tới đích rồi chuyển focus, menu đóng bằng Esc. Canvas trang trí `aria-hidden`; tên tách ký tự vẫn đọc đúng (SplitText aria); điểm số có chữ sr-only.
- Mobile < 900px: Design flow dọc; < 768px: không cursor/tilt/magnetic, bố cục 375px không tràn ngang.

## Giấy phép

Hiệu ứng nền, nút, dock, decode… chuyển thể từ **ThreeUI** (MIT) — xem `licenses/`. Font: Unbounded, Geist, JetBrains Mono (Google Fonts, OFL); Instrument Serif, Newsreader, Fragment Mono (OFL, tự host trong `public/fonts`). Shader `wafer` và `circuit`, canvas waveform / place & route là code mới của dự án này.
