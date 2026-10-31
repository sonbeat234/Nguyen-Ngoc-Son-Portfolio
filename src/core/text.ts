// Văn bản an toàn cho tiếng Việt (V5-vi F): chuẩn hoá NFC + tách theo GRAPHEME (Intl.Segmenter).
// Nội dung hiện là NFC, nhưng chữ dán từ macOS có thể là NFD (e + ◌̃ + ◌̂): tách theo index UTF-16 hay theo code point
// ([...s]) sẽ đặt chữ cái và dấu tổ hợp vào hai ô (span / ô decode / ô sóng) khác nhau → dấu rơi khỏi chữ.
// Mọi hiệu ứng tách chữ (decode, characterWave/waveLabel, NeonSign, tên hero) đi qua đây.
const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;

export const nfc = (s: string) => s.normalize("NFC");

/** các grapheme của s (đã NFC) */
export function graphemes(s: string): string[] {
  const t = nfc(s);
  return seg ? Array.from(seg.segment(t), (x) => x.segment) : Array.from(t);
}

/** grapheme kèm vị trí UTF-16 trong chuỗi (dùng cho Range) — s phải là chuỗi đang nằm trong text node */
export function graphemeSpans(s: string): { s: string; i: number }[] {
  if (seg) return Array.from(seg.segment(s), (x) => ({ s: x.segment, i: x.index }));
  const out: { s: string; i: number }[] = [];
  let i = 0;
  for (const ch of s) { out.push({ s: ch, i }); i += ch.length; }
  return out;
}
