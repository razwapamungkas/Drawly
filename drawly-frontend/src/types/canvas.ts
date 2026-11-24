export type ToolType =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'rectangle'
  | 'diamond'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'text'
  | 'eraser';

export type FillStyle = 'solid' | 'hachure' | 'cross-hatch';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: Exclude<ToolType, 'select' | 'hand' | 'eraser'>;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  roughness: number;
  fillStyle?: FillStyle;
  strokeStyle?: StrokeStyle;
  opacity?: number; // 0 sampai 100
  points?: Point[]; // Koordinat untuk coretan pencil/freehand
  text?: string; // Isi teks untuk tool 'text'
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  roughElement?: any; // Objek drawable dari Rough.js yang dicache
}

export interface AppState {
  zoom: number;
  panOffset: Point;
  theme: 'light' | 'dark';
}

export interface CanvasData {
  id?: string;
  shareId?: string;
  title: string;
  elements: CanvasElement[];
  appState?: AppState;
  createdAt?: string;
  updatedAt?: string;
}
