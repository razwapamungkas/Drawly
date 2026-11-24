import rough from 'roughjs';
import { CanvasElement, FillStyle, Point, StrokeStyle, ToolType } from '@/types/canvas';
import { calculateArrowHeads, distanceToSegment } from './math';

const generator = rough.generator();

export interface ElementStyleOptions {
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  roughness?: number;
  fillStyle?: FillStyle;
  strokeStyle?: StrokeStyle;
  opacity?: number;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  text?: string;
  points?: Point[];
}

/**
 * Menghasilkan objek Rough.js Drawable untuk elemen
 */
export function generateRoughElement(element: CanvasElement): any {
  const { x1, y1, x2, y2, stroke, fill, strokeWidth, roughness, fillStyle, strokeStyle } = element;

  const roughOptions: any = {
    stroke,
    strokeWidth,
    roughness,
    bowing: 1,
    seed: 12345, // Konsistensi random generator agar tidak flicker saat render
  };

  // Pengaturan Stroke Style (Solid, Dashed, Dotted)
  if (strokeStyle === 'dashed') {
    roughOptions.strokeLineDash = [10, 8];
  } else if (strokeStyle === 'dotted') {
    roughOptions.strokeLineDash = [3, 6];
  }

  // Pengaturan Fill & Fill Style (Solid, Hachure, Cross-hatch)
  if (fill && fill !== 'transparent') {
    roughOptions.fill = fill;
    roughOptions.fillStyle = fillStyle || 'solid';
    if (fillStyle === 'hachure' || fillStyle === 'cross-hatch') {
      roughOptions.hachureGap = 5;
      roughOptions.hachureAngle = 60;
      roughOptions.fillWeight = Math.max(1, strokeWidth / 2);
    }
  }

  switch (element.type) {
    case 'rectangle': {
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return generator.rectangle(minX, minY, width, height, roughOptions);
    }

    case 'diamond': {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const points: [number, number][] = [
        [midX, y1],
        [x2, midY],
        [midX, y2],
        [x1, midY],
      ];
      return generator.polygon(points, roughOptions);
    }

    case 'circle': {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return generator.ellipse(cx, cy, width, height, roughOptions);
    }

    case 'line': {
      return generator.line(x1, y1, x2, y2, roughOptions);
    }

    case 'arrow': {
      const line = generator.line(x1, y1, x2, y2, roughOptions);
      const { left, right } = calculateArrowHeads(x1, y1, x2, y2, 16 + strokeWidth * 2);
      const head1 = generator.line(x2, y2, left.x, left.y, roughOptions);
      const head2 = generator.line(x2, y2, right.x, right.y, roughOptions);
      return [line, head1, head2];
    }

    case 'pencil': {
      if (!element.points || element.points.length < 2) return null;
      const strokePoints = element.points.map((p) => [p.x, p.y] as [number, number]);
      return generator.linearPath(strokePoints, roughOptions);
    }

    case 'text':
      // Teks di-render langsung oleh HTML5 Canvas 2D Context
      return null;

    default:
      return null;
  }
}

/**
 * Membuat elemen baru
 */
export function createElement(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: Exclude<ToolType, 'select' | 'hand' | 'eraser'>,
  options: ElementStyleOptions = {},
): CanvasElement {
  const element: CanvasElement = {
    id,
    type,
    x1,
    y1,
    x2,
    y2,
    stroke: options.stroke || '#1e293b',
    fill: options.fill || 'transparent',
    strokeWidth: options.strokeWidth || 2,
    roughness: options.roughness ?? 1.2,
    fillStyle: options.fillStyle || 'solid',
    strokeStyle: options.strokeStyle || 'solid',
    opacity: options.opacity ?? 100,
    fontSize: options.fontSize || 24,
    textAlign: options.textAlign || 'left',
    text: options.text || '',
    points: options.points,
  };

  element.roughElement = generateRoughElement(element);
  return element;
}

/**
 * Menghitung bounding box akurat untuk elemen
 */
export function getElementBounds(element: CanvasElement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (element.type === 'pencil' && element.points && element.points.length > 0) {
    const xs = element.points.map((p) => p.x);
    const ys = element.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  if (element.type === 'text') {
    const minX = Math.min(element.x1, element.x2);
    const minY = Math.min(element.y1, element.y2);
    const fontSize = element.fontSize || 24;
    const textLines = (element.text || '').split('\n');
    const longestLine = textLines.reduce((max, line) => Math.max(max, line.length), 0);
    const textWidth = Math.max(60, longestLine * (fontSize * 0.6) + 16);
    const textHeight = Math.max(30, textLines.length * (fontSize * 1.35) + 10);
    const width = Math.max(Math.abs(element.x2 - element.x1), textWidth);
    const height = Math.max(Math.abs(element.y2 - element.y1), textHeight);
    return {
      minX,
      minY,
      maxX: minX + width,
      maxY: minY + height,
      width,
      height,
    };
  }

  const minX = Math.min(element.x1, element.x2);
  const maxX = Math.max(element.x1, element.x2);
  const minY = Math.min(element.y1, element.y2);
  const maxY = Math.max(element.y1, element.y2);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Melakukan Hit-Testing: memeriksa apakah titik (point) mengenai elemen
 */
export function isPointOnElement(point: Point, element: CanvasElement): boolean {
  const threshold = 8 + element.strokeWidth;
  const { x1, y1, x2, y2 } = element;

  switch (element.type) {
    case 'rectangle': {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      if (element.fill && element.fill !== 'transparent') {
        return (
          point.x >= minX - threshold &&
          point.x <= maxX + threshold &&
          point.y >= minY - threshold &&
          point.y <= maxY + threshold
        );
      }

      const nearLeft = Math.abs(point.x - minX) <= threshold && point.y >= minY && point.y <= maxY;
      const nearRight = Math.abs(point.x - maxX) <= threshold && point.y >= minY && point.y <= maxY;
      const nearTop = Math.abs(point.y - minY) <= threshold && point.x >= minX && point.x <= maxX;
      const nearBottom = Math.abs(point.y - maxY) <= threshold && point.x >= minX && point.x <= maxX;

      return nearLeft || nearRight || nearTop || nearBottom;
    }

    case 'diamond': {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      if (rx === 0 || ry === 0) return false;

      const p1 = { x: midX, y: y1 };
      const p2 = { x: x2, y: midY };
      const p3 = { x: midX, y: y2 };
      const p4 = { x: x1, y: midY };

      if (element.fill && element.fill !== 'transparent') {
        const norm = Math.abs(point.x - midX) / rx + Math.abs(point.y - midY) / ry;
        return norm <= 1.05;
      }

      return (
        distanceToSegment(point, p1, p2) <= threshold ||
        distanceToSegment(point, p2, p3) <= threshold ||
        distanceToSegment(point, p3, p4) <= threshold ||
        distanceToSegment(point, p4, p1) <= threshold
      );
    }

    case 'circle': {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      if (rx === 0 || ry === 0) return false;

      const norm = ((point.x - cx) ** 2) / (rx ** 2) + ((point.y - cy) ** 2) / (ry ** 2);

      if (element.fill && element.fill !== 'transparent') {
        return norm <= 1.1;
      }
      return Math.abs(norm - 1) <= 0.3;
    }

    case 'line': {
      return distanceToSegment(point, { x: x1, y: y1 }, { x: x2, y: y2 }) <= threshold;
    }

    case 'arrow': {
      const onMainLine = distanceToSegment(point, { x: x1, y: y1 }, { x: x2, y: y2 }) <= threshold;
      if (onMainLine) return true;
      const { left, right } = calculateArrowHeads(x1, y1, x2, y2, 18);
      const onLeft = distanceToSegment(point, { x: x2, y: y2 }, left) <= threshold;
      const onRight = distanceToSegment(point, { x: x2, y: y2 }, right) <= threshold;
      return onLeft || onRight;
    }

    case 'pencil': {
      if (!element.points || element.points.length < 2) return false;
      for (let i = 0; i < element.points.length - 1; i++) {
        const pA = element.points[i];
        const pB = element.points[i + 1];
        if (distanceToSegment(point, pA, pB) <= threshold) {
          return true;
        }
      }
      return false;
    }

    case 'text': {
      const bounds = getElementBounds(element);
      return (
        point.x >= bounds.minX - 4 &&
        point.x <= bounds.maxX + 4 &&
        point.y >= bounds.minY - 4 &&
        point.y <= bounds.maxY + 4
      );
    }

    default:
      return false;
  }
}

/**
 * Memeriksa apakah sapuan/gesekan penghapus (dari titik p1 ke p2) mengenai elemen
 */
export function doesEraserStrokeHitElement(
  p1: Point,
  p2: Point,
  element: CanvasElement,
): boolean {
  if (isPointOnElement(p1, element) || isPointOnElement(p2, element)) {
    return true;
  }

  // Cek cepat bounding box dengan toleransi
  const bounds = getElementBounds(element);
  const pad = 16 + element.strokeWidth;
  const minX = Math.min(p1.x, p2.x) - pad;
  const maxX = Math.max(p1.x, p2.x) + pad;
  const minY = Math.min(p1.y, p2.y) - pad;
  const maxY = Math.max(p1.y, p2.y) + pad;

  if (
    bounds.maxX < minX ||
    bounds.minX > maxX ||
    bounds.maxY < minY ||
    bounds.minY > maxY
  ) {
    return false;
  }

  // Interpolasi titik-titik di antara p1 dan p2 untuk mendeteksi sapuan cepat
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const steps = Math.min(12, Math.max(2, Math.ceil(dist / 8)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const pt: Point = {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    };
    if (isPointOnElement(pt, element)) {
      return true;
    }
  }

  return false;
}

/**
 * Mencari elemen teratas di bawah kursor
 */
export function getElementAtPosition(
  point: Point,
  elements: CanvasElement[],
): CanvasElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (isPointOnElement(point, elements[i])) {
      return elements[i];
    }
  }
  return null;
}

export type ResizeHandleType =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'start'
  | 'end';

export interface ResizeHandleInfo {
  handle: ResizeHandleType;
  x: number;
  y: number;
  cursor: string;
}

/**
 * Menghasilkan posisi titik-titik kontrol pengubah ukuran (resize handles)
 */
export function getResizeHandles(element: CanvasElement, zoom = 1): ResizeHandleInfo[] {
  if (element.type === 'line' || element.type === 'arrow') {
    return [
      { handle: 'start', x: element.x1, y: element.y1, cursor: 'crosshair' },
      { handle: 'end', x: element.x2, y: element.y2, cursor: 'crosshair' },
    ];
  }

  const bounds = getElementBounds(element);
  const padding = 8;
  const bx = bounds.minX - padding;
  const by = bounds.minY - padding;
  const bw = bounds.width + padding * 2;
  const bh = bounds.height + padding * 2;

  return [
    { handle: 'nw', x: bx, y: by, cursor: 'nwse-resize' },
    { handle: 'n', x: bx + bw / 2, y: by, cursor: 'ns-resize' },
    { handle: 'ne', x: bx + bw, y: by, cursor: 'nesw-resize' },
    { handle: 'e', x: bx + bw, y: by + bh / 2, cursor: 'ew-resize' },
    { handle: 'se', x: bx + bw, y: by + bh, cursor: 'nwse-resize' },
    { handle: 's', x: bx + bw / 2, y: by + bh, cursor: 'ns-resize' },
    { handle: 'sw', x: bx, y: by + bh, cursor: 'nesw-resize' },
    { handle: 'w', x: bx, y: by + bh / 2, cursor: 'ew-resize' },
  ];
}

/**
 * Memeriksa apakah kursor berada di atas salah satu handle pengubah ukuran
 */
export function getHandleAtPosition(
  point: Point,
  element: CanvasElement,
  zoom = 1,
): ResizeHandleInfo | null {
  const handles = getResizeHandles(element, zoom);
  const hitRadius = Math.max(12 / zoom, 10);

  for (const h of handles) {
    const dist = Math.hypot(point.x - h.x, point.y - h.y);
    if (dist <= hitRadius) {
      return h;
    }
  }
  return null;
}

