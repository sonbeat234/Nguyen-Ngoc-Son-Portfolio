// Ghép screenshot của verify thành 1 contact sheet để xem nhanh: node scripts/sheet.mjs verify desktop
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const dir = process.argv[2] ?? "verify", prefix = process.argv[3] ?? "desktop", cols = Number(process.argv[4] ?? 4);
const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix + "-") && f.endsWith(".png")).sort();
const w = prefix === "mobile" ? 188 : 360, h = prefix === "mobile" ? 406 : 225;
const cells = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}"><figcaption>${f}</figcaption></figure>`).join("");
const html = `<style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px;padding:4px;font:11px monospace;color:#ddd}figure{margin:0}img{width:${w}px;height:${h}px;display:block;object-fit:cover}</style>${cells}`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: cols * (w + 4) + 4, height: 400 } });
await p.setContent(html); const out = path.join(dir, `sheet-${prefix}.png`);
await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log(out, files.length);
