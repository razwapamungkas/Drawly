export type ToolType =
  | 'select'
  | 'pencil'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'text'
  | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: Exclude<ToolType, 'select' | 'eraser'>;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  roughness: number;
  points?: Point[]; // Koordinat untuk coretan pencil/freehand
  text?: string;    // Isi teks untuk tool 'text'
  fontSize?: number;
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

