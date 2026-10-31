# Nguyễn Ngọc Sơn — IC Design & Semiconductor Portfolio

Portfolio + CV một trang, cuộn liên tục, nền WebGL đổi theo từng phần (dissolve noise có viền sáng), dựng trên engine của dự án SIGNAL trước đó (Vite + TypeScript, GSAP, Lenis, một WebGL context cho toàn bộ shader nền).
Vòng V4: bảng màu **Indigo Wafer**, chữ Profile dễ đọc (đo tương phản tự động), con trỏ thường, mỗi project mở thành trang chi tiết dạng **sách lật trang** (desktop) hoặc **cuộn** (mobile), thêm 10+ hiệu ứng chữ.

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
node scripts/verify.mjs --port 4173 --out verify-pv --projects --viewports desktop,mobile   # overlay project: sách / cuộn / Esc / deep link
node scripts/contrast.mjs --port 4173 --out verify-v4                       # tương phản WCAG mọi khối chữ → verify-v4/contrast.json
```

Thêm `--gpu` (Windows) để Chromium headless dùng GPU thật thay cho SwiftShader: số đo thời gian (preloader, lật trang) đại diện hơn; `report.json` có mục `preloader` (tải xong → preloader biến mất, lần đầu và lần mở lại trong phiên).

## Bảng màu — muốn đổi màu chỉ sửa ở đây

Palette hiện tại: **A · Indigo Wafer**. Nguồn duy nhất là khối `BẢNG MÀU` đầu `src/styles/tokens.css`; shader nền, con trỏ, biển neon, hạt hero đọc lại token lúc chạy (`src/stage/palette.ts`), không có mã màu thứ hai trong code.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--primary` | `#8B7BFF` | màu chủ đạo: nút chính, thanh tiến độ, chữ nhấn, loading screen |
| `--primary-2` | `#C9C0FF` | bản sáng: glow, hover, viền dissolve, mép trang sách khi lật |
| `--signal` | `#2EE6C5` | màu phụ (≤ 15% diện tích): trạng thái live/pass, số liệu |
| `--ink` | `#07060D` | nền trang |
| `--panel` | `#100E1C` | nền panel/card/giấy sách — luôn đặt sau đoạn chữ dài |
| `--bone` | `#F1F0F8` | chữ chính |
| `--mute` | `#A9A6BF` | chữ phụ (≥ 4.5:1 trên `--panel`) |
| `--copper` | `#F0A061` | chỉ chi tiết vật liệu (dây bond, chân chip) |
| `--on-primary` | `#07060D` | chữ trên nền primary (đen 6.4:1, trắng chỉ 3.3:1) |

Accent theo section (tween khi cuộn sang section mới): `data-accent` / `data-accent2` của từng `<section>` trong `index.html` — hero `#8B7BFF/#C9C0FF`, profile `#B48CFF/#E3D2FF`, flow `#6F8BFF/#BFCBFF`, projects `#5EC8FF/#2EE6C5`, CV `#D08CFF/#F0D2FF`, end of line `#8B7BFF/#2EE6C5`.

Đổi palette: (1) sửa khối token trong `tokens.css`, (2) sửa `initial-value` của `@property --accent / --accent-2` ngay trên khối đó (= accent hero), (3) sửa `data-accent*` trong `index.html` (xoay hue của primary trong OKLCH theo cùng nhịp bảng trên), (4) `public/favicon.svg` và `<meta name="theme-color">` là file tĩnh — sửa tay. Hai phương án có sẵn:
- **B · Copper Fab:** primary `#FF8A4C` · primary-2 `#FFC9A3` · signal `#5CC8FF` · ink `#0A0706` · panel `#17100C` · bone `#F7F1EC` · mute `#B8A99E` · copper `#E8C26A`
- **C · Emerald Lab:** primary `#34E0A1` · primary-2 `#B5FFE1` · signal `#A78BFA` · ink `#050A08` · panel `#0C1612` · bone `#EEF7F2` · mute `#9FB5AA` · copper `#F0A061`

Sau khi đổi, chạy `node scripts/contrast.mjs` — mọi khối chữ phải đạt 4.5:1 (chữ lớn 3:1).

## Sửa nội dung — chỉ một file: `src/content/profile.ts`

Mọi thông tin cá nhân nằm ở đây; hero, Profile, Projects, CV và footer đều đọc từ file này. Trường để trống (`""` / `[]`) hiện dạng ô skeleton trên web và **bị ẩn khi in CV** — trang không bao giờ hiện chữ bịa.

| Trường | Hiện trạng | Cần làm |
|---|---|---|
| `fullName`, `dateOfBirth`, `education`, `ielts`, `toeic` | đã điền (thông tin đã xác nhận) | — |
| `portrait` | trống → khung package chip hiện "Portrait — to be added" | chép ảnh thật vào `public/img/portrait.webp`, đặt `portrait: "/img/portrait.webp"` |
| `cvFile` | trống → chỉ có nút **Print / Save as PDF** | nếu có PDF thật: chép vào `public/cv/…pdf`, đặt đường dẫn → nút **Download PDF** tự hiện |
| `summary` | bản nháp trung tính, chỉ dùng thông tin đã có | viết lại bằng giọng của bạn |
| `educationEntries[0].program / period / notes` | trống | ngành học, năm học, GPA / môn tiêu biểu (nếu muốn) |
| `highSchool`, `educationEntries[1]` (Le Quy Don High School for the Gifted, Lai Chau) | đã điền tên trường; `level` hiện nhãn "High school" trên timeline CV | `period` (năm học), `program` (lớp chuyên) nếu muốn |
| `projects[]` | 3 ô trống (`emptyProject()`) | card: `title, objective, tools[], role, outcome, period, link`; trang chi tiết: `slug, cover, summary, problem, approach[], metrics[], gallery[], lessons[], links[]` — xem mục dưới |
| `skills[]` | trống | nhóm kỹ năng thật, vd `{ group: "HDL", items: ["Verilog"] }` |
| `languages[]` | English: IELTS 6.0, TOEIC 750 | thêm ngôn ngữ khác nếu muốn |
| `contact[]` | đã điền: Email, LinkedIn, GitHub — hiện ở footer (End of line, email có nút Copy), đầu CV và mục "Contact" trong menu | thêm số điện thoại (`tel:+84…`) nếu muốn; icon tự chọn theo href |

### Dự án — trang chi tiết (sách / cuộn)

Bấm một card (hoặc Enter / Space) mở trang chi tiết: desktop ≥ 900px là **cuốn sách** lật trang (kéo góc trang, bấm nửa trái/phải, phím ← →, cuộn chuột — một cử chỉ một trang), mobile / reduced-motion là **chế độ cuộn**; nút "Scroll view / Book view" đổi qua lại và được nhớ. URL `#project/<slug>` mở thẳng đúng dự án; Back của trình duyệt hoặc Esc để đóng. Thứ tự trang: Bìa → Tổng quan & bài toán → Cách làm (mỗi bước một trang) → Kết quả → Hình ảnh → Bài học → Link.

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `slug` | `string` | đoạn URL; rỗng → `die-01`, `die-02`… |
| `cover` | `string` | ảnh bìa trong `public/` (webp, ngang ~1600px) |
| `summary`, `problem` | `string` | 2–3 câu tóm tắt; bài toán / bối cảnh |
| `approach` | `{ title, text, image? }[]` | mỗi bước một trang sách |
| `metrics` | `{ label, value }[]` | số trong `value` tự đếm lên; giá trị có `%` vẽ thanh theo %, còn lại so với số lớn nhất |
| `gallery` | `{ src, caption }[]` | ảnh webp + chú thích |
| `lessons` | `string[]` | mỗi ý một dòng |
| `links` | `{ label, href }[]` | link thật (repo, báo cáo…) |

Trường rỗng hiện khối skeleton có nhãn "to be added"; dự án rỗng vẫn mở được để xem bố cục. Ảnh đặt trong `public/img/projects/`.

Ví dụ điền đầy đủ (**chỉ để minh hoạ định dạng — không phải dự án thật, không có trên web**; thay bằng dự án của bạn):

```ts
{
  slug: "mini-ic-tester",
  title: "Mini IC tester on FPGA",
  objective: "Check 74-series logic chips against their truth tables automatically.",
  tools: ["SystemVerilog", "Vivado", "Basys 3"],
  role: "RTL design & verification (individual)",
  outcome: "Detects stuck-at faults on 12 chip types; one test run < 2 s.",
  period: "Sep – Dec 2025",
  link: "https://github.com/<user>/mini-ic-tester",
  cover: "/img/projects/tester-cover.webp",
  summary: "A small FPGA board that drives every input pattern of a DIP logic chip and compares the outputs with a reference table.",
  problem: "Manual testing of salvaged chips with a breadboard and LEDs was slow and error-prone.",
  approach: [
    { title: "Pattern generator", text: "A counter walks all 2^n input combinations; a ROM holds the expected outputs.", image: "/img/projects/tester-rtl.webp" },
    { title: "Testbench", text: "SystemVerilog assertions compare DUT outputs with a behavioural model in simulation." },
    { title: "Board bring-up", text: "Level shifting for 5 V parts, debounce, result shown on the 7-segment display." },
  ],
  metrics: [
    { label: "Chip types supported", value: "12" },
    { label: "Functional coverage", value: "100 %" },
    { label: "Test time per chip", value: "1.8 s" },
  ],
  gallery: [
    { src: "/img/projects/tester-board.webp", caption: "Board with a 74HC00 under test" },
    { src: "/img/projects/tester-wave.webp", caption: "Simulation waveform of the pattern generator" },
  ],
  lessons: [
    "Write the reference model before the RTL.",
    "Plan voltage levels before ordering parts.",
  ],
  links: [{ label: "Report (PDF)", href: "/cv/tester-report.pdf" }],
},
```

Thông tin xác nhận cũng được viết cố định trong `index.html` ở hero (tên, FPT University Hanoi), preloader và footer — nếu đổi tên hiển thị, sửa cả ở đó. Readout hero (góc dưới) = Education + LinkedIn / GitHub lấy từ `contact[]`; điểm IELTS / TOEIC chỉ hiện ở Profile và CV.

## Cấu trúc trang

| # | Section (`index.html`) | Nền stage (shader) | Hiệu ứng chính | Code |
|---|---|---|---|---|
| 00 | Preloader "POWER-ON" | — | màu PRIMARY; bộ đếm 000→100 nhấp nháy neon, log terminal decode + con trỏ khối, thanh 16 ô, nhãn "POWER-ON" chạy sóng ký tự, tên tách 3 kênh PRIMARY/SIGNAL/PRIMARY_2 hội tụ thành chữ BONE, iris có viền sáng; sau khi tải xong ≤ 2.2 s, mở lại trong phiên ≤ 0.8 s | `sections/preloader.ts`, `fx/ui/characterWave.ts`, `styles/sections/preloader.css` |
| 01 | Power-on (hero) | `wafer` (custom) | wafer 300 mm óng ánh màng mỏng theo chuột, die "probe" loé sáng, chấm mực die hỏng; pin 140% zoom vào một die. Tên: hạt WebGL hội tụ đúng lên từng ký tự rồi nhường cho chữ DOM; sau đó kinetic type + sóng độ đậm (font variable) theo con trỏ; precision frame, readout decode, CTA magnetic | `sections/hero.ts`, `shaders/wafer.ts` |
| 02 | Profile | `circuit` (custom) | đi dây metal 2 lớp parallax, xung tín hiệu chạy dọc dây; khung chân dung là package QFN (40 chân có tín hiệu chạy vòng, dây bond vàng vẽ dần, tia quét die), tilt + spotlight; tiêu đề lật ký tự 3D từ tâm + vệt gradient quét chữ nghiêng; cột chữ trên panel kính, shader tự tối vùng chữ (`u_textRect`); chữ sáng theo cuộn (mute → bone, em PRIMARY → SIGNAL); datasheet decode; vòng điểm IELTS/TOEIC | `sections/about.ts`, `shaders/circuit.ts` |
| 03 | Design flow | `stream` | 7 headline ngành (Specification → Signoff & tape-out); desktop: pin + cuộn ngang, parallax trong thẻ, bộ đếm giai đoạn; visual: PPA morph, block diagram, RTL gõ từng dòng, waveform viewer (canvas), netlist có dòng tín hiệu, place & route + clock H-tree (canvas), chồng lớp layout tách 3D + checklist; marquee thuật ngữ theo vận tốc cuộn; tiêu đề stage scramble khi active | `sections/designFlow.ts`, `canvas/Waveform.ts`, `canvas/PlaceRoute.ts` |
| 04 | Projects | `dotmatrix` | tiêu đề trượt từng từ (Sliding Text + bố cục Gallery Heading); card "die" bấm được: cắt ra từ tâm, tiêu đề decode, tilt 3D + spotlight + chữ thập probe, viền beam + vệt quét chéo khi hover, "Open die →"; mở trang chi tiết bằng Flip → sách lật cong giấy / chế độ cuộn (Lenis riêng, gallery ngang khi pin) | `sections/projects.ts`, `projectView.ts`, `projectBook.ts`, `projectScroll.ts`, `projectPages.ts` |
| 05 | CV | `topo` | tài liệu nổi lên + tia quét, tiêu đề mục decode lần lượt kiểu Article Headings, khối reveal, timeline vẽ theo cuộn, thanh điểm đầy dần; in A4 sạch | `sections/cv.ts`, `styles/print.css` |
| 06 | End of line | `ribbon` | biển neon "THANKS" (canvas, bật đèn từng chữ), tên outline khổng lồ tô màu theo con trỏ, session uptime, "Back to power-on" tua ngược qua mọi dissolve | `sections/eol.ts` |

Lớp toàn cục (`fx/ui/*`): đường mạch SVG mép trái vẽ theo tiến độ cuộn (nấc 45° + via ở mỗi section, `trace.ts`), top dock kính có hạt (WebGL), rail chấm, thanh progress, menu fullscreen preview scene, con trỏ hệ thống dạng chuẩn (mũi tên / bàn tay / I-beam) tô màu accent theo section, grain, starfield mờ. "Shield": khối `[data-shield]` làm tối shader ngay sau chữ (composite, tối đa 6 vùng) để chữ đạt tương phản. RGB split của composite tăng khi cuộn nhanh.

## Hiệu năng & khả năng truy cập

- Một RAF (`gsap.ticker`) cho mọi thứ; canvas 2D chỉ render khi đang hiện; không cấp phát trong tick ở các vòng lặp nóng.
- WebGL context đồng thời: **2** thường trực (stage + dock), **3** trong ~2 s intro hero (hạt tên, trả context ngay sau đó) — đo bằng `scripts/verify.mjs`, ngân sách ≤ 4. Shader của dock và hạt hero được biên dịch trong pha tải của preloader.
- Overlay project: Lenis thứ hai chạy chung `gsap.ticker`; lật trang dựng N dải bản sao DOM chỉ trong lúc lật (đo ~2–3 ms), trang ngoài tầm nhìn `content-visibility: hidden`.
- Quality tự hạ độ phân giải stage khi fps < 48.
- `prefers-reduced-motion` (hoặc `?reduced`): Lenis không làm mượt, shader chậm 4×, reveal = fade, không marquee/skew/scrub, Design flow thành danh sách dọc — nội dung hiện đủ.
- Bàn phím: skip link, focus ring accent, link `#…` cuộn tới đích rồi chuyển focus, menu đóng bằng Esc. Canvas trang trí `aria-hidden`; tên tách ký tự vẫn đọc đúng (SplitText aria); điểm số có chữ sr-only.
- Tương phản: `scripts/contrast.mjs` đo mọi khối chữ trên nền shader thật (3 vị trí × 3 khung, desktop + mobile) — chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1.
- Mobile < 900px: Design flow dọc, trang project ở chế độ cuộn; < 768px: không cursor/tilt/magnetic, bố cục 375px không tràn ngang.

## Giấy phép

Hiệu ứng nền, nút, dock, decode… chuyển thể từ **ThreeUI** (MIT) — xem `licenses/`. Font: Unbounded, Geist, JetBrains Mono (Google Fonts, OFL); Instrument Serif, Newsreader, Fragment Mono (OFL, tự host trong `public/fonts`). Shader `wafer` và `circuit`, canvas waveform / place & route là code mới của dự án này.
