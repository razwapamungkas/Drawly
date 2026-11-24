import { CanvasElement } from '@/types/canvas';
import { getElementBounds } from './element';
import rough from 'roughjs';

/**
 * Menghitung batas gabungan seluruh elemen kanvas
 */
function getCanvasBoundingBox(elements: CanvasElement[], padding = 40) {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  });

  return {
    minX: minX - padding,
    minY: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Ekspor kanvas ke gambar format PNG
 */
export function exportToPng(
  elements: CanvasElement[],
  title = 'Untitled Canvas - Drawly',
  backgroundColor = '#ffffff',
) {
  if (elements.length === 0) {
    alert('Kanvas masih kosong, tidak ada gambar untuk diekspor.');
    return;
  }

  const bounds = getCanvasBoundingBox(elements, 40);
  const canvas = document.createElement('canvas');
  const dpr = 2; // Kualitas tinggi (Retina 2x)
  canvas.width = bounds.width * dpr;
  canvas.height = bounds.height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);

  // Background
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, bounds.width, bounds.height);
  }

  // Geser titik koordinat agar seluruh elemen berada di dalam viewport canvas
  ctx.translate(-bounds.minX, -bounds.minY);

  const rc = rough.canvas(canvas);

  // Render elemen
  for (const element of elements) {
    ctx.save();
    ctx.globalAlpha = (element.opacity ?? 100) / 100;
    ctx.setLineDash([]);

    if (element.type === 'text') {
      if (element.text) {
        const fontSize = element.fontSize || 24;
        ctx.font = `${fontSize}px Caveat, cursive, sans-serif`;
        ctx.fillStyle = element.stroke || '#1e293b';
        ctx.textBaseline = 'top';

        const b = getElementBounds(element);
        const align = element.textAlign || 'left';
        ctx.textAlign = align;

        let targetX = b.minX;
        if (align === 'center') {
          targetX = b.minX + b.width / 2;
        } else if (align === 'right') {
          targetX = b.maxX;
        }

        const lines = element.text.split('\n');
        const lineHeight = fontSize * 1.35;
        lines.forEach((line, index) => {
          ctx.fillText(line, targetX, b.minY + index * lineHeight);
        });
      }
    } else if (element.roughElement) {
      if (Array.isArray(element.roughElement)) {
        element.roughElement.forEach((drawable) => rc.draw(drawable));
      } else {
        rc.draw(element.roughElement);
      }
    }
    ctx.restore();
  }

  // Download Trigger
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  link.download = `${cleanTitle}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Ekspor kanvas ke format file JSON Project (.drawly)
 */
export function exportToJson(
  elements: CanvasElement[],
  title = 'Untitled Canvas - Drawly',
) {
  const exportData = {
    app: 'Drawly',
    version: '1.0',
    title,
    elements: elements.map(({ roughElement, ...rest }) => rest), // Tidak menyertakan cache roughElement agar file ringan
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  link.download = `${cleanTitle}.drawly`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Ekspor kanvas ke format SVG Vector
 */
export function exportToSvg(
  elements: CanvasElement[],
  title = 'Untitled Canvas - Drawly',
) {
  if (elements.length === 0) {
    alert('Kanvas masih kosong, tidak ada gambar untuk diekspor.');
    return;
  }

  const bounds = getCanvasBoundingBox(elements, 40);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  svg.setAttribute('width', `${bounds.width}`);
  svg.setAttribute('height', `${bounds.height}`);
  svg.setAttribute('xmlns', svgNS);

  // Background rect
  const bg = document.createElementNS(svgNS, 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', '#ffffff');
  svg.appendChild(bg);

  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('transform', `translate(${-bounds.minX}, ${-bounds.minY})`);
  svg.appendChild(g);

  const rc = rough.svg(svg);

  for (const element of elements) {
    const elGroup = document.createElementNS(svgNS, 'g');
    if (element.opacity !== undefined && element.opacity < 100) {
      elGroup.setAttribute('opacity', `${element.opacity / 100}`);
    }

    if (element.type === 'text') {
      if (element.text) {
        const b = getElementBounds(element);
        const align = element.textAlign || 'left';
        let targetX = b.minX;
        let textAnchor = 'start';
        if (align === 'center') {
          targetX = b.minX + b.width / 2;
          textAnchor = 'middle';
        } else if (align === 'right') {
          targetX = b.maxX;
          textAnchor = 'end';
        }

        const fontSize = element.fontSize || 24;
        const lineHeight = fontSize * 1.35;
        const lines = element.text.split('\n');
        lines.forEach((line, index) => {
          const textNode = document.createElementNS(svgNS, 'text');
          textNode.setAttribute('x', `${targetX}`);
          textNode.setAttribute('y', `${b.minY + (index + 0.85) * lineHeight}`);
          textNode.setAttribute('font-family', 'Caveat, cursive, sans-serif');
          textNode.setAttribute('font-size', `${fontSize}px`);
          textNode.setAttribute('fill', element.stroke || '#1e293b');
          textNode.setAttribute('text-anchor', textAnchor);
          textNode.textContent = line;
          elGroup.appendChild(textNode);
        });
      }
    } else if (element.roughElement) {
      if (Array.isArray(element.roughElement)) {
        element.roughElement.forEach((drawable) => {
          const node = rc.draw(drawable);
          elGroup.appendChild(node);
        });
      } else {
        const node = rc.draw(element.roughElement);
        elGroup.appendChild(node);
      }
    }
    g.appendChild(elGroup);
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  link.download = `${cleanTitle}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
