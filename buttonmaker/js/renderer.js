const imageCache = new Map();

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

function svgToDataUrl(svg, color) {
  const colored = svg
    .replaceAll('currentColor', color)
    .replace('<svg', '<svg color="' + color + '"');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(colored);
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

export async function renderDesign(canvas, design, opts = {}) {
  const size = canvas.width;
  const u = size / 72;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.save();

  const radius = (design.shape.radius / 100) * size;
  if (radius > 0) {
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
    g.addColorStop(Math.max(0, 0.5 - blend / 200), bg.gradFrom);
    g.addColorStop(Math.min(1, 0.5 + blend / 200), bg.gradTo);
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
    ctx.fillStyle = bg.color;
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
      const src = !isSvg ? icon.svg : hasCC ? svgToDataUrl(icon.svg, icon.color) : svgToDataUrl(icon.svg, '#000000');
      let img = await loadImage(src);
      if (!hasCC && icon.tint) {
        const off = document.createElement('canvas');
        off.width = img.width || size;
        off.height = img.height || size;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0, off.width, off.height);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = icon.color;
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
      const iaoff = Math.max(0, Math.min(40, Math.round(50 - icon.size / 2)));
      const iax = iah === 'left' ? -iaoff : iah === 'right' ? iaoff : 0;
      const iay = iav === 'top' ? -iaoff : iav === 'bottom' ? iaoff : 0;
      const x = size / 2 - w / 2 + ((iax + (icon.x || 0)) / 100) * size;
      const y = size / 2 - h / 2 + ((iay + (icon.y || 0)) / 100) * size;
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
      ctx.globalAlpha = (text.opacity === undefined ? 100 : text.opacity) / 100;
      ctx.fillStyle = text.color;
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
      if (rot) ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
  ctx.restore();

  if (design.shape.border > 0) {
    const bw = design.shape.border * u;
    ctx.strokeStyle = design.shape.borderColor;
    ctx.lineWidth = bw;
    if (radius > 0) {
      roundedPath(ctx, bw / 2, bw / 2, size - bw, size - bw, Math.max(0, radius - bw / 2));
      ctx.stroke();
    } else {
      ctx.strokeRect(bw / 2, bw / 2, size - bw, size - bw);
    }
  }

  ctx.restore();
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
