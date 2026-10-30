# Quy ước chung cho các chương (bắt buộc với mọi subagent)

Spec: `../threeui-main/PROMPT_SIGNAL_SCROLL_SITE.md` (mục 12 = kịch bản chương, mục 2.2 = file HTML nguồn).
Nguồn hiệu ứng: `../threeui-main/src/shaders/...` — **chỉ đọc**, không sửa gì trong `threeui-main/`.

## 1. Quyền sở hữu file

| Agent | Chương | Section file (`src/sections/`) | CSS (`src/styles/chapters/`) |
|---|---|---|---|
| A | 00 Preloader, 01 Origin, 02 Transit, 03 Manifesto | `preloader.ts`, `hero.ts`, `warp.ts`, `manifesto.ts` | `c00.css`…`c03.css` |
| B | 04 Form, 05 Amplify, 06 Resonance | `chrome.ts`, `lasers.ts`, `resonance.ts` | `c04.css`…`c06.css` |
| C | 07 Works, 08 Flow, 09 Clarity | `orbit.ts`, `flow.ts`, `glass.ts` | `c07.css`…`c09.css` |
| D | 10 Signal Lost, 11 Core, 12 Footer | `signal.ts`, `core.ts`, `footer.ts` | `c10.css`…`c12.css` |

**Được sửa**
- `index.html`: CHỈ phần nằm giữa `<!-- cXX:start -->` và `<!-- cXX:end -->` của chương mình (A thêm cả `c00`: nội dung bên trong `.preloader`). Được thêm thuộc tính vào thẻ `<section>` của mình (vd `data-cursor`) nhưng **không đổi** `id`, `class="chapter"`, `data-scene`, `data-preview`, `data-accent*`, `data-title`.
  - Chỉ dùng công cụ **Edit** (thay chuỗi chính xác) trên `index.html`, không bao giờ Write cả file — 4 agent cùng sửa file này. Nếu Edit báo file đã đổi, đọc lại rồi sửa tiếp.
- `src/sections/<file của mình>.ts`, `src/styles/chapters/cXX.css` của mình (xoá dòng `min-height: 200vh` tạm khi đã có chiều cao thật).
- File **mới** trong `src/canvas/`, `src/three/`, `src/fx/ui/`, `src/shaders/` dành riêng cho chương mình. Đặt tên rõ ràng (vd `canvas/FlowField.ts`, `fx/ui/gauges.ts`). Không trùng tên file của agent khác (xem danh sách gợi ý ở mục 6).
- Ảnh/asset mới: `public/img/<cXX>-*.{webp,png,jpg}` (chỉ copy từ `threeui-main`, ghi nguồn trong báo cáo).

**CẤM sửa**: `src/main.ts`, `src/core/*`, `src/stage/*`, `src/fx/text/*`, các file `src/fx/ui/*` đã có (accent, cursor, dock, magnetic, menu, rail, tilt, index), `src/canvas/Starfield.ts`, `src/styles/{tokens,base,buttons}.css`, `src/vendor/*` (chỉ được copy thêm vendor mới vào thư mục riêng `src/vendor/<cXX>/` nếu cần), `PROGRESS.md`, `DECISIONS.md`, `CONVENTIONS.md`, `package.json`, `vite.config.ts`, `scripts/*`. **Không `git commit`, không `npm install`.**
Cần thay đổi ở file cấm → ghi vào báo cáo cuối ("đề xuất cho điều phối"), tự làm cách khác trong phạm vi của mình.

## 2. Hợp đồng init

- Mỗi chương export `init<Tên>()` (sync hoặc async). `main.ts` gọi theo thứ tự trang **sau** preloader và lớp toàn cục; lỗi ném ra sẽ bị log `console.error` (verify tính là lỗi).
- Sau khi mọi section init: `main.ts` quét `[data-decode] [data-reveal] [data-scrub] [data-glitch] [data-skew] [data-marquee] svg[data-textpath] [data-magnetic] [data-tilt]` trên toàn trang → phần tử tạo động trong init cũng được áp. Không tự gọi lại `initTextFx()`.
- Sau đó `ScrollTrigger.refresh()` rồi `preloader.reveal()`.
- **Preloader (A)**: `initPreloader(): Promise<{ reveal(): Promise<void> }>` — khoá `lockScroll(true, "preloader")`, `await stage.prewarm(onStep)` + font + ảnh; `reveal()` chạy chromatic intro + iris, đặt `.preloader` `display:none`, `lockScroll(false, "preloader")`, phát `window.dispatchEvent(new CustomEvent("signal:intro"))`.
- **Hero (A)** nghe `"signal:intro"` để tween `u_assemble`.
- Sự kiện khác: `window` phát `"signal:chapter"` `{ id, index, title }` khi đổi chương; hoặc `onChapter(fn)` từ `fx/ui/accent`.

## 3. API dùng chung (import, không sửa)

| Module | API |
|---|---|
| `core/state` | `state.time/dt/w/h/mouse{x,y,sx,sy,nx,ny,speed,down}/scroll{y,velocity,smooth(-1..1),progress,direction}/quality/reduced/touch/mobile/debug` |
| `core/loop` | `onTick(fn(time, dt), "early"|"normal"|"late")` → hàm huỷ. **Không tự RAF vòng lặp riêng.** Đọc layout ở `"early"`. |
| `core/scroll` | `lenis`, `scrollTo(target, duration)`, `lockScroll(on, reason)` |
| `core/vendor` | `mountVendor(section, canvas, create(canvas) => {render, resize?, dispose?}, frame?)` → `{ r, canvas, active }`. Lazy mount (< 1 màn), unmount + **giải phóng context** (> 2 màn), chỉ gọi `frame` khi section giao viewport và `active`. **Mọi WebGL context ngoài stage phải đi qua đây.** Canvas bị thay sau unmount → style/opacity đặt trên wrapper, đọc `handle.canvas` mỗi lần. |
| `core/lazy` | `lazyMount(el, { mount, unmount })` cho renderer 2D nặng |
| `core/dom` | `$`, `$$`, `coverage(el)` → `{ cover, progress, rect }` |
| `core/math` | `clamp, lerp, damp, smoothstep, mapRange` |
| `stage/instance` | `stage.setWeight(id, w, progress?)`, `stage.set(id, uniform, v)`, `stage.force(id|null)`, `stage.glitch = 0..1`, `stage.last` |
| `fx/text/decode` | `decodeText(el, opts)`, `decodeTo(el, text, opts)`; attr `data-decode` (`="repeat"` / `="manual"`), `data-decode-delay` |
| `fx/text/reveal` | `splitReveal(el, "words"|"lines"|"chars", trigger = true | false | ScrollTrigger.Vars)` → tween; attr `data-reveal="words|lines|chars"`, `data-reveal-manual` để tự điều khiển |
| `fx/text/scrub` | `scrubWords(el)`; attr `data-scrub` (từ `<em>` nhận gradient accent) |
| `fx/text/glitch` | `addGlitch(el)`, `glitchOnce(el, strength)`, `setGlitchThreshold(px/s)`; attr `data-glitch` |
| `fx/text/velocitySkew` | `addSkew(el, k)`; attr `data-skew="1"` |
| `fx/text/marquee` | `marquee(track, base)`; `<div class="marquee"><div data-marquee data-speed="60" data-dir="left|right">…</div></div>` |
| `fx/text/textPath` | `initTextPath(svg)`; `<svg data-textpath class="path-text">` + `<path data-breathe d="M-100,420 C250,120 550,560 820,300 S1350,80 1700,320">` + `<textPath data-from="10%" data-to="-60%">` |
| `fx/ui/magnetic` / `tilt` | `magnetic(el, s)`, `tilt(el)`; attr `data-magnetic="0.35"`, `data-tilt` (dùng với `.card`) |
| `fx/ui/cursor` | `pulseCursor()`; attr `data-cursor="LABEL"`, `data-cursor-scale` |
| `fx/ui/accent` | `chapters`, `onChapter(fn)`, `currentChapter()`, `tweenAccent(a, b)` |
| `canvas/Starfield` | `createPortalStarfield(canvas, 45)` → `{ resize, render(boost), dispose }` (chương 11) |
| CSS sẵn có | `.wrap .layer .label .eyebrow .display .serif .serif-i .mono .h-hero .h2 .h3 .outline .muted .balance .neon .tube-off .card .marquee .path-text`, 8 nút `.btn .btn-spin/.btn-beam/.btn-glass/.btn-slide/.btn-comet/.btn-dots/.btn-pill/.btn-dotborder`, biến `--accent --accent-2 --ink --bone --mute --line --f-* --fs-* --ease-* --gutter --radius` |
| Lớp toàn cục | `.scanlines` (fixed, opacity 0 — **D** tween opacity trong chương 10), `#ambient` starfield, `.grain` |

## 4. Quy tắc kỹ thuật

1. **Một RAF**: mọi render trong `onTick`. Hiệu ứng ngắn (decode, tween GSAP) được phép. Vendor tự RAF (typography vortex) chỉ bọc lazy mount.
2. **WebGL**: luôn qua `mountVendor`. Ngân sách đồng thời toàn trang ≤ 6 (stage + dock = 2 luôn sống). Context riêng tối đa: A: c01 = 1, c02 = 2 · B: 0–1 · C: c08 = 1, c09 = 1 · D: c10 = 1, c11 ≤ 3, c12 = 0. Ưu tiên canvas 2D/CSS cho nút và trang trí nhỏ. DPR cap: Three 1.75, canvas 2D 2 — nhân `state.quality`.
3. **Không cấp phát trong tick** (không tạo mảng/object/chuỗi gradient mới mỗi frame nếu tránh được), không đọc layout trong `onUpdate` tween; chỉ animate `transform/opacity/filter`/CSS var.
4. **Pin**: trigger = `#cXX`, pin = `"#cXX .pin"`, `end: "+=N%"`; tạo ScrollTrigger theo thứ tự từ trên xuống trong chương. Chiều cao chương = tổng quãng pin (xoá `min-height` tạm).
5. **CSS scope**: mọi selector trong `cXX.css` bắt đầu bằng `#cXX` (hoặc `.preloader` cho c00); class mới tiền tố `cXX-` hoặc tên chương. Không selector toàn cục, không `!important` trừ reduced-motion.
6. **Chuyển cảnh**: chương có canvas phủ kín riêng (08, 10) phải tự fade/dissolve canvas ở đầu và cuối chương (mask noise hoặc opacity theo `coverage`) — không cut cứng.
7. **Reduced motion** (`state.reduced`, `html.reduced`): tắt glitch/skew/marquee/parallax mạnh, reveal = fade, render tĩnh hoặc chậm 4×; vẫn hiện đủ nội dung.
8. **Mobile** (`state.mobile` / `< 768px`, `state.touch`): không cursor/magnetic/tilt (API đã tự bỏ), giảm hạt (spec mục 14), layout 375px không tràn ngang (`overflow: hidden/clip` trong chương nếu cần), chữ không cắt.
9. **Không mạng ngoài** ngoài Google Fonts: không CDN (port script từ HTML sang module TS, import `three128`/`gsap`), không ảnh supabase (thay bằng ảnh local hoặc gradient), form không gửi dữ liệu.
10. **Accessibility**: canvas trang trí `aria-hidden="true"`; nút là `<button>`/`<a>`; chữ quan trọng là text thật (không chỉ vẽ canvas) — nếu vẽ chữ bằng canvas, có bản text `.sr-only`.

## 5. Kiểm chứng của mỗi agent

```bash
cd "c:/Users/sonco/Downloads/build/web 2/signal-site"
npx tsc --noEmit                                   # phải sạch
VITE_CACHE_DIR=node_modules/.vite-A npx vite --port 5174 --strictPort   # chạy nền (A 5174, B 5175, C 5176, D 5177)
node scripts/verify.mjs --port 5174 --out verify-A --chapters c00,c01,c02,c03 --steps 3 --boundaries
node scripts/sheet.mjs verify-A desktop 4 && node scripts/sheet.mjs verify-A mobile 6   # rồi Read 2 ảnh sheet
```
- Tiêu chí: tsc sạch, verify **0 lỗi** (console error, pageerror, cảnh báo WebGL, HTTP 4xx, tràn ngang), mọi screenshot của chương có hình (không đen/trắng trơn), chữ đọc được, mobile không tràn. Xem `report.json` → `contexts`.
- Tắt dev server của mình khi xong (PowerShell: `Get-NetTCPConnection -LocalPort 5174 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`).
- Chương của agent khác vẫn là stub trong lúc làm: bỏ qua screenshot của họ. Lỗi console phát sinh từ chương của agent khác (nếu họ đang sửa dở) thì ghi lại, không sửa.

## 6. Tên file gợi ý (tránh trùng)

- A: `three/ParticleWordmark.ts`, `canvas/ParticleNetwork.ts`, `canvas/KineticLathe.ts`, `fx/ui/precisionFrame.ts`
- B: `canvas/WireframeForms.ts`, `fx/ui/gauges.ts`, `canvas/AudioWordmark.ts`
- C: `canvas/simplex.ts`, `canvas/FlowField.ts`, `canvas/Grainient.ts`, `three/WovenCloth.ts`, `fx/ui/toggle.ts`, `fx/ui/sparkBadge.ts`, `fx/ui/liquidMetal.ts`, `canvas/CharacterWave.ts`
- D: `canvas/NeonSign.ts`, `canvas/EmberStorm.ts`, `fx/ui/lumen.ts`, `fx/ui/newsletter.ts`

## 7. Báo cáo cuối của agent

1. Danh sách file đã tạo/sửa (đường dẫn).
2. Hiệu ứng ThreeUI đã dùng trong mỗi chương → file nguồn gốc.
3. Số WebGL context mỗi chương dùng (và đỉnh đo được trong `report.json`).
4. Kết quả tsc + verify (số lỗi, tên thư mục screenshot).
5. Quyết định không hiển nhiên (dạng `- [cXX] quyết định — lý do`) để điều phối chép vào DECISIONS.md.
6. Đề xuất thay đổi file cấm (nếu có).
