import { invertHex } from './color.js?v=150';
import { isWide } from './state.js?v=150';

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

function rotationPad(W, H) {
  return W === H ? W * 0.21 : (Math.hypot(W, H) - Math.min(W, H)) / 2;
}

function newLayer(ctx, W, H) {
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lctx = layer.getContext('2d');
  lctx.setTransform(ctx.getTransform());
  return { layer, lctx };
}

function shadowOnly(source, blur, dx, dy, color) {
  const w = source.width;
  const out = document.createElement('canvas');
  out.width = w * 2;
  out.height = source.height;
  const o = out.getContext('2d');
  o.shadowColor = color;
  o.shadowBlur = blur;
  o.shadowOffsetX = dx - w;
  o.shadowOffsetY = dy;
  o.drawImage(source, w, 0);
  return out;
}

function compositeWithShadow(ctx, layer, kind, color, px, alpha) {
  const glow = kind === 'glow';
  const shadow = glow ? shadowOnly(layer, px * 0.3, 0, 0, color) : shadowOnly(layer, px * 0.1, px * 0.07, px * 0.07, color);
  const w = layer.width;
  const h = layer.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(shadow, 0, 0, w, h, 0, 0, w, h);
  if (glow) ctx.drawImage(shadow, 0, 0, w, h, 0, 0, w, h);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

function drawFinish(ctx, finish, W, H, radius, squircle) {
  if (!finish || finish === 'none') return;
  ctx.save();
  if (finish === 'gloss') {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.34)');
    g.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H * 0.4);
    ctx.quadraticCurveTo(W / 2, H * 0.58, 0, H * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (finish === 'vignette') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (finish === 'spotlight') {
    const g = ctx.createRadialGradient(W / 2, H * 0.12, 0, W / 2, H * 0.12, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,255,255,0.38)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (finish === 'inner') {
    const m = Math.ceil(H * 0.5);
    const frame = document.createElement('canvas');
    frame.width = W + m * 2;
    frame.height = H + m * 2;
    const f = frame.getContext('2d');
    f.fillStyle = '#000000';
    f.fillRect(0, 0, frame.width, frame.height);
    f.globalCompositeOperation = 'destination-out';
    f.translate(m, m);
    if (squircle) {
      squirclePath(f, W / 2, H / 2, W / 2, H / 2);
    } else if (radius > 0) {
      roundedPath(f, 0, 0, W, H, radius);
    } else {
      f.beginPath();
      f.rect(0, 0, W, H);
    }
    f.fill();
    ctx.drawImage(shadowOnly(frame, H * 0.16, 0, 0, 'rgba(0,0,0,0.75)'), 0, 0, frame.width, frame.height, -m, -m, frame.width, frame.height);
  }
  ctx.restore();
}

export async function renderDesign(canvas, design, opts = {}) {
  const W = canvas.width;
  const H = canvas.height;
  const size = H;
  const u = size / 72;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  const radius = (design.shape.radius / 100) * size;
  if (design.shape.squircle) {
    squirclePath(ctx, W / 2, H / 2, W / 2, H / 2);
    ctx.clip();
  } else if (radius > 0) {
    roundedPath(ctx, 0, 0, W, H, radius);
    ctx.clip();
  }

  const faceRot = (((design.shape.rotation || 0) % 360) * Math.PI) / 180;
  const pad = faceRot ? rotationPad(W, H) : 0;
  ctx.save();
  if (faceRot) {
    ctx.translate(W / 2, H / 2);
    ctx.rotate(faceRot);
    ctx.translate(-W / 2, -H / 2);
  }

  const bg = design.bg;
  const bgInv = bg.invert ? invertHex : (h) => h;
  const bgAlpha = (bg.opacity === undefined ? 100 : bg.opacity) / 100;
  if (bg.mode === 'gradient') {
    let g;
    if (bg.radial) {
      g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    } else {
      const a = ((bg.angle - 90) * Math.PI) / 180;
      const cx = W / 2;
      const cy = H / 2;
      const ac = Math.abs(Math.cos(a));
      const as = Math.abs(Math.sin(a));
      const len = W === H ? size * 0.75 : (0.75 * (W * ac + H * as)) / (ac + as);
      g = ctx.createLinearGradient(
        cx - Math.cos(a) * len,
        cy - Math.sin(a) * len,
        cx + Math.cos(a) * len,
        cy + Math.sin(a) * len
      );
    }
    const blend = bg.blend === undefined ? 100 : bg.blend;
    g.addColorStop(Math.max(0, 0.5 - blend / 200), bgInv(bg.gradFrom));
    g.addColorStop(Math.min(1, 0.5 + blend / 200), bgInv(bg.gradTo));
    ctx.globalAlpha = bgAlpha;
    ctx.fillStyle = g;
    ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    ctx.globalAlpha = 1;
  } else if (bg.mode === 'image' && bg.imageData) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    try {
      const img = await loadImage(bg.imageData);
      const imgRot = ((bg.imageRotation || 0) * Math.PI) / 180;
      const ipad = imgRot || faceRot ? rotationPad(W, H) : 0;
      ctx.save();
      if (bg.invert) ctx.filter = 'invert(1)';
      if (imgRot) {
        ctx.translate(W / 2, H / 2);
        ctx.rotate(imgRot);
        ctx.translate(-W / 2, -H / 2);
      }
      if (bg.imageFit === 'contain') drawFitted(ctx, img, 0, 0, W, H, bg.imageFit);
      else drawFitted(ctx, img, -ipad, -ipad, W + ipad * 2, H + ipad * 2, bg.imageFit);
      ctx.restore();
    } catch (e) {}
    if (bg.imageDim > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + bg.imageDim / 100 + ')';
      ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    }
  } else {
    ctx.globalAlpha = bgAlpha;
    ctx.fillStyle = bgInv(bg.color);
    ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    ctx.globalAlpha = 1;
  }

  const zoom = (design.shape.zoom === undefined ? 100 : design.shape.zoom) / 100;
  ctx.save();
  if (zoom !== 1) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
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
      const roomX = 50 - (icon.size * (H / W)) / 2;
      const iaoffX = Math.min(50 - 10 * (H / W), roomX >= 0 ? roomX : -roomX);
      const iax = iah === 'left' ? -iaoffX : iah === 'right' ? iaoffX : 0;
      const iay = iav === 'top' ? -iaoff : iav === 'bottom' ? iaoff : 0;
      let x = W / 2 - w / 2 + ((iax + (icon.x || 0)) / 100) * W;
      let y = H / 2 - h / 2 + ((iay + (icon.y || 0)) / 100) * H;
      if (icon.contentCenter) {
        const cc = contentCentre(img, src);
        if (cc) {
          const ccx = icon.reverse ? 1 - cc.cx : cc.cx;
          x -= (ccx - 0.5) * w;
          y -= (cc.cy - 0.5) * h;
        }
      }
      const iconAlpha = (icon.opacity === undefined ? 100 : icon.opacity) / 100;
      const ishadow = icon.shadow && icon.shadow !== 'none' ? icon.shadow : null;
      let ic = ctx;
      let ilayer = null;
      if (ishadow) {
        ({ layer: ilayer, lctx: ic } = newLayer(ctx, W, H));
      } else {
        ctx.globalAlpha = iconAlpha;
      }
      const rot = ((icon.rotation || 0) * Math.PI) / 180;
      if (rot || icon.reverse) {
        ic.save();
        ic.translate(x + w / 2, y + h / 2);
        if (rot) ic.rotate(rot);
        if (icon.reverse) ic.scale(-1, 1);
        ic.drawImage(img, -w / 2, -h / 2, w, h);
        ic.restore();
      } else {
        ic.drawImage(img, x, y, w, h);
      }
      if (ishadow) compositeWithShadow(ctx, ilayer, ishadow, icon.shadowColor || '#000000', s * zoom * 0.6, iconAlpha);
      else ctx.globalAlpha = 1;
    } catch (e) {}
  }

  if (opts.bakeText !== false) {
    for (const text of design.texts || []) {
      if (!text.value) continue;
      try {
        await document.fonts.load(text.weight + ' 16px "' + text.font + '"', text.value);
      } catch (e) {}
      const textAlpha = (text.opacity === undefined ? 100 : text.opacity) / 100;
      const tshadow = text.shadow && text.shadow !== 'none' ? text.shadow : null;
      let tc = ctx;
      let tlayer = null;
      if (tshadow) ({ layer: tlayer, lctx: tc } = newLayer(ctx, W, H));
      tc.globalAlpha = tshadow ? 1 : textAlpha;
      tc.fillStyle = text.invert ? invertHex(text.color) : text.color;
      const ow = (text.outline || 0) * u;
      if (ow) {
        tc.strokeStyle = text.invert ? invertHex(text.outlineColor || '#000000') : (text.outlineColor || '#000000');
        tc.lineWidth = ow * 2;
        tc.lineJoin = 'round';
      }
      tc.font = text.weight + ' ' + text.size * u + 'px "' + text.font + '", sans-serif';
      const [h, v] = text.align.split(':');
      tc.textAlign = h === 'left' ? 'left' : h === 'right' ? 'right' : 'center';
      const pad = 5 * u;
      const x = h === 'left' ? pad : h === 'right' ? W - pad : W / 2;
      const lines = text.value.split('\n');
      const lineHeight = text.size * u * 1.15;
      let startY;
      if (v === 'top') {
        tc.textBaseline = 'top';
        startY = pad;
      } else if (v === 'center') {
        tc.textBaseline = 'middle';
        startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;
        if (lines.length === 1) {
          tc.textBaseline = 'alphabetic';
          const m = tc.measureText(lines[0]);
          if (m.actualBoundingBoxAscent !== undefined) {
            startY = H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
          } else {
            tc.textBaseline = 'middle';
          }
        }
      } else {
        tc.textBaseline = 'bottom';
        startY = H - pad - (lines.length - 1) * lineHeight;
      }
      const ox = ((text.x || 0) / 100) * W;
      const oy = ((text.y || 0) / 100) * H;
      const rot = ((text.rotation || 0) * Math.PI) / 180;
      if (rot) {
        let maxW = 0;
        for (const line of lines) maxW = Math.max(maxW, tc.measureText(line).width);
        const px = (h === 'left' ? pad + maxW / 2 : h === 'right' ? W - pad - maxW / 2 : W / 2) + ox;
        let py;
        if (v === 'center') {
          py = H / 2 + oy;
        } else {
          py = startY + ((lines.length - 1) * lineHeight) / 2 + oy;
          if (v === 'top') py += (text.size * u) / 2;
          else py -= (text.size * u) / 2;
        }
        tc.save();
        tc.translate(px, py);
        tc.rotate(rot);
        tc.translate(-px, -py);
      }
      const bend = text.bend || 0;
      if (bend && lines.length === 1) {
        const line = lines[0];
        const lineW = tc.measureText(line).width;
        const ax = (h === 'left' ? pad + lineW / 2 : h === 'right' ? W - pad - lineW / 2 : W / 2) + ox;
        const ay = (v === 'top' ? pad + (text.size * u) / 2 : v === 'bottom' ? H - pad - (text.size * u) / 2 : H / 2) + oy;
        drawArcText(tc, line, bend, ax, ay, ow);
      } else {
        lines.forEach((line, i) => {
          let dx = 0;
          if (h === 'center') {
            const m = tc.measureText(line);
            if (m.actualBoundingBoxLeft !== undefined) {
              dx = (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
            }
          }
          if (ow) tc.strokeText(line, x + dx + ox, startY + i * lineHeight + oy);
          tc.fillText(line, x + dx + ox, startY + i * lineHeight + oy);
        });
      }
      if (rot) tc.restore();
      if (tshadow) compositeWithShadow(ctx, tlayer, tshadow, text.shadowColor || '#000000', text.size * u * zoom, textAlpha);
      else ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
  ctx.restore();

  drawFinish(ctx, design.bg.finish, W, H, radius, design.shape.squircle);

  if (design.shape.border > 0) {
    const bw = design.shape.border * u;
    const e = design.shape.edges || { top: true, bottom: true, left: true, right: true };
    const allEdges = e.top && e.bottom && e.left && e.right;
    ctx.strokeStyle = design.shape.borderColor;
    ctx.lineWidth = bw;
    const borderAlpha = (design.shape.borderOpacity === undefined ? 100 : design.shape.borderOpacity) / 100;
    const strokeBorder = () => {
      if (allEdges && design.shape.squircle) {
        squirclePath(ctx, W / 2, H / 2, (W - bw) / 2, (H - bw) / 2);
        ctx.stroke();
      } else if (allEdges && radius > 0) {
        roundedPath(ctx, bw / 2, bw / 2, W - bw, H - bw, Math.max(0, radius - bw / 2));
        ctx.stroke();
      } else if (allEdges) {
        ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
      } else {
        ctx.save();
        if (design.shape.squircle) {
          squirclePath(ctx, W / 2, H / 2, W / 2, H / 2);
          ctx.clip();
        } else if (radius > 0) {
          roundedPath(ctx, 0, 0, W, H, radius);
          ctx.clip();
        }
        const o = bw / 2;
        ctx.beginPath();
        if (e.top) { ctx.moveTo(0, o); ctx.lineTo(W, o); }
        if (e.bottom) { ctx.moveTo(0, H - o); ctx.lineTo(W, H - o); }
        if (e.left) { ctx.moveTo(o, 0); ctx.lineTo(o, H); }
        if (e.right) { ctx.moveTo(W - o, 0); ctx.lineTo(W - o, H); }
        ctx.stroke();
        ctx.restore();
      }
    };
    if (borderAlpha < 1) {
      ctx.globalCompositeOperation = 'destination-out';
      strokeBorder();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (borderAlpha > 0) {
      ctx.globalAlpha = borderAlpha;
      strokeBorder();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

function drawArcText(ctx, line, bend, ax, ay, ow) {
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
    if (ow) ctx.strokeText(ch, 0, 0);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    acc += cw;
  }
  ctx.restore();
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
}

function drawFitted(ctx, img, x, y, w, h, fit) {
  if (fit === 'stretch') {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  const ratio = img.width / img.height;
  let dw = w;
  let dh = h;
  if (fit === 'cover') {
    if (ratio > w / h) dw = h * ratio;
    else dh = w / ratio;
  } else {
    if (ratio > w / h) dh = w / ratio;
    else dw = h * ratio;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export async function renderToDataUrl(design, size, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = isWide(design) ? size * 2 : size;
  canvas.height = size;
  await renderDesign(canvas, design, opts);
  return canvas.toDataURL('image/png');
}
