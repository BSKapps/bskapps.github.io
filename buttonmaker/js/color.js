function clampByte(n) {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r, g, b) {
  return '#' + ((1 << 24) + (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b)).toString(16).slice(1);
}

export function invertHex(hex) {
  const c = parseHex(hex);
  return c ? toHex(255 - c[0], 255 - c[1], 255 - c[2]) : hex;
}

export function mixHex(hex, target, t) {
  const a = parseHex(hex);
  const b = parseHex(target);
  if (!a || !b) return hex;
  return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}
