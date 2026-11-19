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
    if (element.type === 'text') {
      if (element.text) {
        ctx.save();
        ctx.font = `${element.fontSize || 22}px Caveat, cursive, sans-serif`;
        ctx.fillStyle = element.stroke || '#1e293b';
        ctx.textBaseline = 'top';

        const lines = element.text.split('\n');
        const lineHeight = (element.fontSize || 22) * 1.35;
        lines.forEach((line, index) => {
          ctx.fillText(line, element.x1, element.y1 + index * lineHeight);
        });
        ctx.restore();
      }
    } else if (element.roughElement) {
      if (Array.isArray(element.roughElement)) {
        element.roughElement.forEach((drawable) => rc.draw(drawable));
      } else {
        rc.draw(element.roughElement);
      }
    }
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
    if (element.type === 'text') {
      if (element.text) {
        const textNode = document.createElementNS(svgNS, 'text');
        textNode.setAttribute('x', `${element.x1}`);
        textNode.setAttribute('y', `${element.y1 + (element.fontSize || 22)}`);
        textNode.setAttribute('font-family', 'Caveat, cursive, sans-serif');
        textNode.setAttribute('font-size', `${element.fontSize || 22}px`);
        textNode.setAttribute('fill', element.stroke || '#1e293b');
        textNode.textContent = element.text;
        g.appendChild(textNode);
      }
    } else if (element.roughElement) {
      if (Array.isArray(element.roughElement)) {
        element.roughElement.forEach((drawable) => {
          const node = rc.draw(drawable);
          g.appendChild(node);
        });
      } else {
        const node = rc.draw(element.roughElement);
        g.appendChild(node);
      }
    }
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

