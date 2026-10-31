// Ghép screenshot của verify thành 1 contact sheet để xem nhanh: node scripts/sheet.mjs verify desktop
// So sánh before/after (V4): node scripts/sheet.mjs --compare verify-v4-before verify-v4 verify-v4/compare.png "Loading=desktop-c00-1600ms.png" "Profile=desktop-about-2.png"
//   mỗi cặp "Nhãn=tên-file[|tên-file-after]" thành một hàng: ảnh trong thư mục before | ảnh trong thư mục after.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
if (process.argv[2] === "--compare") {
  const [, , , before, after, outFile, ...pairs] = process.argv;
  const img = (d, f) => fs.existsSync(path.join(d, f)) ? `<img src="data:image/png;base64,${fs.readFileSync(path.join(d, f)).toString("base64")}">` : `<div class="miss">missing ${f}</div>`;
  const rows = pairs.map((pair) => {
    const [label, files] = pair.split("=");
    const [fb, fa = fb] = files.split("|");
    return `<h2>${label}</h2><figure>${img(before, fb)}<figcaption>before · ${fb}</figcaption></figure><figure>${img(after, fa)}<figcaption>after · ${fa}</figcaption></figure>`;
  }).join("");
  const html = `<style>body{margin:0;background:#1a1a1a;display:grid;grid-template-columns:120px 640px 640px;gap:6px;padding:6px;font:12px monospace;color:#ddd;align-items:start}
    h2{margin:0;font:600 13px monospace;color:#c9c0ff;padding-top:8px}figure{margin:0}img{width:640px;height:auto;display:block}.miss{width:640px;height:120px;display:grid;place-items:center;background:#333}</style>${rows}`;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1420, height: 400 } });
  await p.setContent(html); await p.screenshot({ path: outFile, fullPage: true }); await b.close();
  console.log(outFile, pairs.length);
  process.exit(0);
}
const dir = process.argv[2] ?? "verify", prefix = process.argv[3] ?? "desktop", cols = Number(process.argv[4] ?? 4);
const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix + "-") && f.endsWith(".png")).sort();
const w = prefix === "mobile" ? 188 : 360, h = prefix === "mobile" ? 406 : 225;
const cells = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}"><figcaption>${f}</figcaption></figure>`).join("");
const html = `<style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px;padding:4px;font:11px monospace;color:#ddd}figure{margin:0}img{width:${w}px;height:${h}px;display:block;object-fit:cover}</style>${cells}`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: cols * (w + 4) + 4, height: 400 } });
await p.setContent(html); const out = path.join(dir, `sheet-${prefix}.png`);
await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log(out, files.length);
