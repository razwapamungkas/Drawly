import rough from 'roughjs';
import { CanvasElement, Point, ToolType } from '@/types/canvas';
import { calculateArrowHeads, distance, distanceToSegment, isPointInBox } from './math';

const generator = rough.generator();

export interface ElementStyleOptions {
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  roughness?: number;
  fontSize?: number;
  text?: string;
  points?: Point[];
}

/**
 * Menghasilkan objek Rough.js Drawable untuk elemen
 */
export function generateRoughElement(element: CanvasElement): any {
  const { x1, y1, x2, y2, stroke, fill, strokeWidth, roughness } = element;

  const roughOptions: any = {
    stroke,
    strokeWidth,
    roughness,
    bowing: 1,
    seed: 12345, // Konsistensi random generator agar tidak flicker saat render
  };

  if (fill && fill !== 'transparent') {
    roughOptions.fill = fill;
    roughOptions.fillStyle = 'solid'; // Isian warna bergaya solid studio
  }

  switch (element.type) {
    case 'rectangle': {
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return generator.rectangle(minX, minY, width, height, roughOptions);
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
  type: Exclude<ToolType, 'select' | 'eraser'>,
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
    fontSize: options.fontSize || 20,
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
    const fontSize = element.fontSize || 20;
    const textLines = (element.text || '').split('\n');
    const longestLine = textLines.reduce((max, line) => Math.max(max, line.length), 0);
    // Estimasi lebar dan tinggi teks
    const width = Math.max(Math.abs(element.x2 - element.x1), longestLine * (fontSize * 0.58) + 16);
    const height = Math.max(Math.abs(element.y2 - element.y1), textLines.length * (fontSize * 1.3) + 10);
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

      // Jika memiliki isian warna, hit jika berada di dalam area
      if (element.fill && element.fill !== 'transparent') {
        return (
          point.x >= minX - threshold &&
          point.x <= maxX + threshold &&
          point.y >= minY - threshold &&
          point.y <= maxY + threshold
        );
      }

      // Jika tidak diisi (transparan), hanya hit pada tepi garis persegi
      const nearLeft = Math.abs(point.x - minX) <= threshold && point.y >= minY && point.y <= maxY;
      const nearRight = Math.abs(point.x - maxX) <= threshold && point.y >= minY && point.y <= maxY;
      const nearTop = Math.abs(point.y - minY) <= threshold && point.x >= minX && point.x <= maxX;
      const nearBottom = Math.abs(point.y - maxY) <= threshold && point.x >= minX && point.x <= maxX;

      return nearLeft || nearRight || nearTop || nearBottom;
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
      // Perimeter hit
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
 * Mencari elemen teratas di bawah kursor
 */
export function getElementAtPosition(
  point: Point,
  elements: CanvasElement[],
): CanvasElement | null {
  // Iterasi dari elemen teratas (lapisan paling depan) ke belakang
  for (let i = elements.length - 1; i >= 0; i--) {
    if (isPointOnElement(point, elements[i])) {
      return elements[i];
    }
  }
  return null;
}

