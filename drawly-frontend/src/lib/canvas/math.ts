import { Point } from '@/types/canvas';

/**
 * Menghitung jarak euclidean antara dua titik
 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Menghitung jarak terpendek dari sebuah titik ke segmen garis (a -> b)
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return distance(p, a);

  // Proyeksi titik p ke garis ab yang diklem ke rentang [0, 1]
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return distance(p, projection);
}

/**
 * Memeriksa apakah sebuah titik berada di dalam bounding box dengan margin threshold toleransi
 */
export function isPointInBox(
  p: Point,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold = 6,
): boolean {
  const minX = Math.min(x1, x2) - threshold;
  const maxX = Math.max(x1, x2) + threshold;
  const minY = Math.min(y1, y2) - threshold;
  const maxY = Math.max(y1, y2) + threshold;

  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

/**
 * Menghitung koordinat kepala panah (arrowhead wings)
 */
export function calculateArrowHeads(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  length = 16,
  angle = Math.PI / 6,
): { left: Point; right: Point } {
  const lineAngle = Math.atan2(y2 - y1, x2 - x1);

  const left: Point = {
    x: x2 - length * Math.cos(lineAngle - angle),
    y: y2 - length * Math.sin(lineAngle - angle),
  };

  const right: Point = {
    x: x2 - length * Math.cos(lineAngle + angle),
    y: y2 - length * Math.sin(lineAngle + angle),
  };

  return { left, right };
}

/**
 * Konversi koordinat layar (screen pixel relatif terhadap canvas) ke koordinat ruang canvas (pan & zoom)
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  pan: Point,
  zoom: number,
): Point {
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom,
  };
}

/**
 * Konversi koordinat canvas ke koordinat layar
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  pan: Point,
  zoom: number,
): Point {
  return {
    x: canvasX * zoom + pan.x,
    y: canvasY * zoom + pan.y,
  };
}

