import { invertHex } from './color.js?v=119';

const imageCache = new Map();
const CACHE_MAX = 80;

function loadImage(src) {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src);
    imageCache.delete(src);
    imageCache.set(src, cached);
    return cached;
  }
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  imageCache.set(src, p);
  if (imageCache.size > CACHE_MAX) {
    imageCache.delete(imageCache.keys().next().value);
  }
  return p;
}

function svgToDataUrl(svg, color) {
  const colored = svg
    .replaceAll('currentColor', color)
    .replace('<svg', '<svg color="' + color + '"');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(colored);
}

const boundsCache = new Map();

function contentCentre(img, key) {
  if (boundsCache.has(key)) return boundsCache.get(key);
  let res = null;
  try {
    const iw = img.width || img.naturalWidth || 64;
    const ih = img.height || img.naturalHeight || 64;
    const scale = 64 / Math.max(iw, ih);
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, w, h);
    const data = cx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= minX && maxY >= minY) {
      res = { cx: (minX + maxX + 1) / 2 / w, cy: (minY + maxY + 1) / 2 / h };
    }
  } catch (e) {}
  boundsCache.set(key, res);
  if (boundsCache.size > CACHE_MAX) {
    boundsCache.delete(boundsCache.keys().next().value);
  }
  return res;
}

function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function squirclePath(ctx, cx, cy, rx, ry) {
  const n = 5;
  const steps = 256;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const x = cx + Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n) * rx;
    const y = cy + Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * ry;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export async function renderDesign(canvas, design, opts = {}) {
  const size = canvas.width;
  const u = size / 72;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.save();

  const radius = (design.shape.radius / 100) * size;
  if (design.shape.squircle) {
    squirclePath(ctx, size / 2, size / 2, size / 2, size / 2);
    ctx.clip();
  } else if (radius > 0) {
    roundedPath(ctx, 0, 0, size, size, radius);
    ctx.clip();
  }

  const faceRot = (((design.shape.rotation || 0) % 360) * Math.PI) / 180;
  const pad = faceRot ? size * 0.21 : 0;
  ctx.save();
  if (faceRot) {
    ctx.translate(size / 2, size / 2);
    ctx.rotate(faceRot);
    ctx.translate(-size / 2, -size / 2);
  }

  const bg = design.bg;
  const bgInv = bg.invert ? invertHex : (h) => h;
  const bgAlpha = (bg.opacity === undefined ? 100 : bg.opacity) / 100;
  if (bg.mode === 'gradient') {
    const a = ((bg.angle - 90) * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const len = size * 0.75;
    const g = ctx.createLinearGradient(
      cx - Math.cos(a) * len,
      cy - Math.sin(a) * len,
      cx + Math.cos(a) * len,
      cy + Math.sin(a) * len
    );
    const blend = bg.blend === undefined ? 100 : bg.blend;
    g.addColorStop(Math.max(0, 0.5 - blend / 200), bgInv(bg.gradFrom));
    g.addColorStop(Math.min(1, 0.5 + blend / 200), bgInv(bg.gradTo));
    ctx.globalAlpha = bgAlpha;
    ctx.fillStyle = g;
    ctx.fillRect(-pad, -pad, size + pad * 2, size + pad * 2);
    ctx.globalAlpha = 1;
  } else if (bg.mode === 'image' && bg.imageData) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(-pad, -pad, size + pad * 2, size + pad * 2);
    try {
      const img = await loadImage(bg.imageData);
      const imgRot = ((bg.imageRotation || 0) * Math.PI) / 180;
      const ipad = imgRot || faceRot ? size * 0.21 : 0;
      ctx.save();
      if (bg.invert) ctx.filter = 'invert(1)';
      if (imgRot) {
        ctx.translate(size / 2, size / 2);
        ctx.rotate(imgRot);
        ctx.translate(-size / 2, -size / 2);
      }
      if (bg.imageFit === 'contain') drawFitted(ctx, img, 0, size, bg.imageFit);
      else drawFitted(ctx, img, -ipad, size + ipad * 2, bg.imageFit);
      ctx.restore();
    } catch (e) {}
    if (bg.imageDim > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + bg.imageDim / 100 + ')';
      ctx.fillRect(-pad, -pad, size + pad * 2, size + pad * 2);
    }
  } else {
    ctx.globalAlpha = bgAlpha;
    ctx.fillStyle = bgInv(bg.color);
    ctx.fillRect(-pad, -pad, size + pad * 2, size + pad * 2);
    ctx.globalAlpha = 1;
  }

  const zoom = (design.shape.zoom === undefined ? 100 : design.shape.zoom) / 100;
  ctx.save();
  if (zoom !== 1) {
    ctx.translate(size / 2, size / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-size / 2, -size / 2);
  }

  const icons = design.icons || (design.icon ? [design.icon] : []);
  for (const icon of icons) {
    if (!icon.svg) continue;
    try {
      const isSvg = icon.svg.trim().startsWith('<');
      const hasCC = isSvg && icon.svg.includes('currentColor');
      const iconColor = icon.invert ? invertHex(icon.color) : icon.color;
      const src = !isSvg ? icon.svg : hasCC ? svgToDataUrl(icon.svg, iconColor) : svgToDataUrl(icon.svg, '#000000');
      let img = await loadImage(src);
      if (!hasCC && icon.tint) {
        const off = document.createElement('canvas');
        off.width = img.width || size;
        off.height = img.height || size;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0, off.width, off.height);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = iconColor;
        octx.fillRect(0, 0, off.width, off.height);
        img = off;
      }
      const s = (icon.size / 100) * size;
      const ratio = img.width && img.height ? img.width / img.height : 1;
      let w = s;
      let h = s;
      if (ratio > 1) h = s / ratio;
      else w = s * ratio;
      const [iah, iav] = (icon.align || 'center:center').split(':');
      const room = 50 - icon.size / 2;
      const iaoff = Math.min(40, room >= 0 ? room : -room);
      const iax = iah === 'left' ? -iaoff : iah === 'right' ? iaoff : 0;
      const iay = iav === 'top' ? -iaoff : iav === 'bottom' ? iaoff : 0;
      let x = size / 2 - w / 2 + ((iax + (icon.x || 0)) / 100) * size;
      let y = size / 2 - h / 2 + ((iay + (icon.y || 0)) / 100) * size;
      if (icon.contentCenter) {
        const cc = contentCentre(img, src);
        if (cc) {
          const ccx = icon.reverse ? 1 - cc.cx : cc.cx;
          x -= (ccx - 0.5) * w;
          y -= (cc.cy - 0.5) * h;
        }
      }
      ctx.globalAlpha = (icon.opacity === undefined ? 100 : icon.opacity) / 100;
      const rot = ((icon.rotation || 0) * Math.PI) / 180;
      if (rot || icon.reverse) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        if (rot) ctx.rotate(rot);
        if (icon.reverse) ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
      ctx.globalAlpha = 1;
    } catch (e) {}
  }

  if (opts.bakeText !== false) {
    for (const text of design.texts || []) {
      if (!text.value) continue;
      try {
        await document.fonts.load(text.weight + ' 16px "' + text.font + '"', text.value);
      } catch (e) {}
      ctx.globalAlpha = (text.opacity === undefined ? 100 : text.opacity) / 100;
      ctx.fillStyle = text.invert ? invertHex(text.color) : text.color;
      ctx.font = text.weight + ' ' + text.size * u + 'px "' + text.font + '", sans-serif';
      const [h, v] = text.align.split(':');
      ctx.textAlign = h === 'left' ? 'left' : h === 'right' ? 'right' : 'center';
      const pad = 5 * u;
      const x = h === 'left' ? pad : h === 'right' ? size - pad : size / 2;
      const lines = text.value.split('\n');
      const lineHeight = text.size * u * 1.15;
      let startY;
      if (v === 'top') {
        ctx.textBaseline = 'top';
        startY = pad;
      } else if (v === 'center') {
        ctx.textBaseline = 'middle';
        startY = size / 2 - ((lines.length - 1) * lineHeight) / 2;
        if (lines.length === 1) {
          ctx.textBaseline = 'alphabetic';
          const m = ctx.measureText(lines[0]);
          if (m.actualBoundingBoxAscent !== undefined) {
            startY = size / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
          } else {
            ctx.textBaseline = 'middle';
          }
        }
      } else {
        ctx.textBaseline = 'bottom';
        startY = size - pad - (lines.length - 1) * lineHeight;
      }
      const ox = ((text.x || 0) / 100) * size;
      const oy = ((text.y || 0) / 100) * size;
      const rot = ((text.rotation || 0) * Math.PI) / 180;
      if (rot) {
        let maxW = 0;
        for (const line of lines) maxW = Math.max(maxW, ctx.measureText(line).width);
        const px = (h === 'left' ? pad + maxW / 2 : h === 'right' ? size - pad - maxW / 2 : size / 2) + ox;
        let py;
        if (v === 'center') {
          py = size / 2 + oy;
        } else {
          py = startY + ((lines.length - 1) * lineHeight) / 2 + oy;
          if (v === 'top') py += (text.size * u) / 2;
          else py -= (text.size * u) / 2;
        }
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.translate(-px, -py);
      }
      const bend = text.bend || 0;
      if (bend && lines.length === 1) {
        const line = lines[0];
        const lineW = ctx.measureText(line).width;
        const ax = (h === 'left' ? pad + lineW / 2 : h === 'right' ? size - pad - lineW / 2 : size / 2) + ox;
        const ay = (v === 'top' ? pad + (text.size * u) / 2 : v === 'bottom' ? size - pad - (text.size * u) / 2 : size / 2) + oy;
        drawArcText(ctx, line, bend, ax, ay);
      } else {
        lines.forEach((line, i) => {
          let dx = 0;
          if (h === 'center') {
            const m = ctx.measureText(line);
            if (m.actualBoundingBoxLeft !== undefined) {
              dx = (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
            }
          }
          ctx.fillText(line, x + dx + ox, startY + i * lineHeight + oy);
        });
      }
      if (rot) ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
  ctx.restore();

  if (design.shape.border > 0) {
    const bw = design.shape.border * u;
    const e = design.shape.edges || { top: true, bottom: true, left: true, right: true };
    const allEdges = e.top && e.bottom && e.left && e.right;
    ctx.strokeStyle = design.shape.borderColor;
    ctx.lineWidth = bw;
    if (allEdges && design.shape.squircle) {
      squirclePath(ctx, size / 2, size / 2, (size - bw) / 2, (size - bw) / 2);
      ctx.stroke();
    } else if (allEdges && radius > 0) {
      roundedPath(ctx, bw / 2, bw / 2, size - bw, size - bw, Math.max(0, radius - bw / 2));
      ctx.stroke();
    } else if (allEdges) {
      ctx.strokeRect(bw / 2, bw / 2, size - bw, size - bw);
    } else {
      const o = bw / 2;
      ctx.beginPath();
      if (e.top) { ctx.moveTo(0, o); ctx.lineTo(size, o); }
      if (e.bottom) { ctx.moveTo(0, size - o); ctx.lineTo(size, size - o); }
      if (e.left) { ctx.moveTo(o, 0); ctx.lineTo(o, size); }
      if (e.right) { ctx.moveTo(size - o, 0); ctx.lineTo(size - o, size); }
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawArcText(ctx, line, bend, ax, ay) {
  const chars = [...line];
  const W = ctx.measureText(line).width;
  if (!W) return;
  const theta = (bend / 100) * Math.PI;
  const R = W / Math.abs(theta);
  const sign = Math.sign(theta);
  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(ax, ay + sign * R);
  let acc = -W / 2;
  for (const ch of chars) {
    const cw = ctx.measureText(ch).width;
    const phi = sign * ((acc + cw / 2) / R);
    ctx.save();
    ctx.rotate(phi);
    ctx.translate(0, -sign * R);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    acc += cw;
  }
  ctx.restore();
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
}

function drawFitted(ctx, img, off, size, fit) {
  if (fit === 'stretch') {
    ctx.drawImage(img, off, off, size, size);
    return;
  }
  const ratio = img.width / img.height;
  let w = size;
  let h = size;
  if (fit === 'cover') {
    if (ratio > 1) w = size * ratio;
    else h = size / ratio;
  } else {
    if (ratio > 1) h = size / ratio;
    else w = size * ratio;
  }
  ctx.drawImage(img, off + (size - w) / 2, off + (size - h) / 2, w, h);
}

export async function renderToDataUrl(design, size, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  await renderDesign(canvas, design, opts);
  return canvas.toDataURL('image/png');
}
