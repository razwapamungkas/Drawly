'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import rough from 'roughjs';
import {
  CanvasElement,
  FillStyle,
  Point,
  StrokeStyle,
  ToolType,
} from '@/types/canvas';
import {
  createElement,
  doesEraserStrokeHitElement,
  generateRoughElement,
  getElementAtPosition,
  getElementBounds,
  getHandleAtPosition,
  getResizeHandles,
  isPointOnElement,
  ResizeHandleType,
} from '@/lib/canvas/element';
import { canvasToScreen, screenToCanvas } from '@/lib/canvas/math';
import { Check, X } from 'lucide-react';

interface DrawlyCanvasProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  roughness: number;
  fillStyle?: FillStyle;
  strokeStyle?: StrokeStyle;
  opacity?: number;
  title: string;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  elements: CanvasElement[];
  onRecordSnapshot: (elements: CanvasElement[]) => void;
  onElementsLiveChange?: (elements: CanvasElement[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  pan: Point;
  setPan: React.Dispatch<React.SetStateAction<Point>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}

export const DrawlyCanvas: React.FC<DrawlyCanvasProps> = ({
  tool,
  setTool,
  strokeColor,
  fillColor,
  strokeWidth,
  roughness,
  fillStyle = 'solid',
  strokeStyle = 'solid',
  opacity = 100,
  selectedElementId,
  setSelectedElementId,
  elements,
  onRecordSnapshot,
  onUndo,
  onRedo,
  pan,
  setPan,
  zoom,
  setZoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Status aksi pointer/mouse
  const actionRef = useRef<'none' | 'drawing' | 'moving' | 'panning' | 'typing' | 'erasing' | 'resizing'>('none');
  const currentDrawingRef = useRef<CanvasElement | null>(null);
  const dragStartPointRef = useRef<Point>({ x: 0, y: 0 });
  const isSpacePressedRef = useRef<boolean>(false);
  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;
  const deletedIdsInStrokeRef = useRef<Set<string>>(new Set());

  // Ref untuk Resizing
  const activeResizeHandleRef = useRef<ResizeHandleType | null>(null);
  const resizeInitialElementRef = useRef<CanvasElement | null>(null);
  const resizeInitialBoundsRef = useRef<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  }>({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 });

  const [cursorStyle, setCursorStyle] = useState<string>('default');

  // Text Inline Editor State
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    text: string;
    editingId?: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textOpenedAtRef = useRef<number>(0);

  // Auto focus ke textarea saat textInput dibuka
  useEffect(() => {
    if (textInput) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [textInput]);

  /**
   * Fungsi Render Utama Kanvas (Rough.js + HTML5 Canvas API)
   */
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rc = rough.canvas(canvas);

    ctx.save();
    // Reset transform dan bersihkan viewport
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Terapkan DPR, pan dan zoom
    ctx.scale(dpr, dpr);
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Kumpulkan seluruh elemen yang ada + elemen yang sedang digambar aktif saat ini
    const currentDrawing = currentDrawingRef.current;
    const allElements = currentDrawing
      ? [...elementsRef.current, currentDrawing]
      : elementsRef.current;

    for (const element of allElements) {
      // Jika elemen teks ini sedang dalam mode inline editing, jangan render duplicate di canvas
      if (textInput?.editingId === element.id) {
        continue;
      }

      ctx.save();
      // Dukungan transparansi / Opacity (0 - 100%)
      ctx.globalAlpha = (element.opacity ?? 100) / 100;
      ctx.setLineDash([]);

      if (element.type === 'text') {
        if (element.text) {
          const fontSize = element.fontSize || 24;
          ctx.font = `${fontSize}px Caveat, cursive, sans-serif`;
          ctx.fillStyle = element.stroke || '#1e293b';
          ctx.textBaseline = 'top';

          const bounds = getElementBounds(element);
          const align = element.textAlign || 'left';
          ctx.textAlign = align;

          // Hitung titik koordinat X berdasarkan perataan relatif terhadap bounding box
          let targetX = bounds.minX;
          if (align === 'center') {
            targetX = bounds.minX + bounds.width / 2;
          } else if (align === 'right') {
            targetX = bounds.maxX;
          }

          const lines = element.text.split('\n');
          const lineHeight = fontSize * 1.35;
          lines.forEach((line, index) => {
            ctx.fillText(line, targetX, bounds.minY + index * lineHeight);
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

    // Gambar Bounding Box & Handles untuk elemen yang sedang dipilih
    if (selectedElementId && actionRef.current !== 'drawing' && actionRef.current !== 'erasing') {
      const selectedEl = elementsRef.current.find((el) => el.id === selectedElementId);
      if (selectedEl) {
        ctx.save();

        if (selectedEl.type === 'line' || selectedEl.type === 'arrow') {
          // Circular handles di kedua ujung garis/panah
          const handles = getResizeHandles(selectedEl, zoom);
          const handleRadius = 5 / zoom;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([]);
          for (const h of handles) {
            ctx.beginPath();
            ctx.arc(h.x, h.y, handleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else {
          const bounds = getElementBounds(selectedEl);
          const padding = 8;
          const bx = bounds.minX - padding;
          const by = bounds.minY - padding;
          const bw = bounds.width + padding * 2;
          const bh = bounds.height + padding * 2;

          // Bounding Box outline
          ctx.strokeStyle = '#3b82f6'; // Modern Blue Accent
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([5 / zoom, 5 / zoom]);
          ctx.strokeRect(bx, by, bw, bh);

          // 8 titik kontrol pengubah ukuran (resize handles)
          const handles = getResizeHandles(selectedEl, zoom);
          const handleSize = 8 / zoom;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([]);
          for (const h of handles) {
            ctx.beginPath();
            ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();
          }
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }, [pan, zoom, selectedElementId, textInput]);

  // Re-render setiap kali state elements / viewport berubah
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, elements]);

  // Dynamic Resize Canvas mengikuti jendela layar
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      renderCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Perbarui style kursor
  useEffect(() => {
    if (isSpacePressedRef.current || tool === 'hand') {
      setCursorStyle('grab');
    } else {
      switch (tool) {
        case 'select':
          setCursorStyle('default');
          break;
        case 'text':
          setCursorStyle('text');
          break;
        case 'eraser':
          setCursorStyle('cell');
          break;
        default:
          setCursorStyle('crosshair');
          break;
      }
    }
  }, [tool]);

  /**
   * Selesaikan atau simpan input teks ke kanvas
   */
  const handleFinishText = () => {
    if (textInput && textInput.text.trim()) {
      if (textInput.editingId) {
        // Edit teks yang sudah ada
        const nextElements = elementsRef.current.map((el) => {
          if (el.id !== textInput.editingId) return el;
          const fontSize = el.fontSize || 24;
          const textLines = textInput.text.trim().split('\n');
          const longestLine = textLines.reduce((max, line) => Math.max(max, line.length), 0);
          const textWidth = Math.max(60, longestLine * (fontSize * 0.6) + 16);
          const textHeight = Math.max(30, textLines.length * (fontSize * 1.35) + 10);
          return {
            ...el,
            text: textInput.text.trim(),
            stroke: strokeColor,
            x2: el.x1 + textWidth,
            y2: el.y1 + textHeight,
          };
        });
        onRecordSnapshot(nextElements);
        setSelectedElementId(textInput.editingId);
      } else {
        // Buat teks baru
        const fontSize = 24;
        const textLines = textInput.text.trim().split('\n');
        const longestLine = textLines.reduce((max, line) => Math.max(max, line.length), 0);
        const textWidth = Math.max(60, longestLine * (fontSize * 0.6) + 16);
        const textHeight = Math.max(30, textLines.length * (fontSize * 1.35) + 10);

        const newId = `text_${Date.now()}`;
        const newElement = createElement(
          newId,
          textInput.x,
          textInput.y,
          textInput.x + textWidth,
          textInput.y + textHeight,
          'text',
          {
            stroke: strokeColor,
            text: textInput.text.trim(),
            fontSize,
            opacity,
          },
        );
        onRecordSnapshot([...elementsRef.current, newElement]);
        setSelectedElementId(newId);
      }
    } else if (textInput && textInput.editingId && !textInput.text.trim()) {
      // Jika teks diedit menjadi kosong, hapus elemen
      const nextElements = elementsRef.current.filter((el) => el.id !== textInput.editingId);
      onRecordSnapshot(nextElements);
      setSelectedElementId(null);
    }

    setTextInput(null);
    actionRef.current = 'none';
  };

  /**
   * Pointer Down
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Jika sedang ada text input aktif, klik di luar akan menyelesaikannya
    if (textInput) {
      handleFinishText();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, pan, zoom);

    // Pan dengan tombol tengah mouse, Spacebar, ATAU tool 'hand'
    if (e.button === 1 || isSpacePressedRef.current || tool === 'hand') {
      actionRef.current = 'panning';
      dragStartPointRef.current = { x: screenX, y: screenY };
      setCursorStyle('grabbing');
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    // 1. Tool: Select
    if (tool === 'select') {
      // Cek apakah klik handle pengubah ukuran (resize handle) dari elemen terpilih
      if (selectedElementId) {
        const selectedEl = elementsRef.current.find((el) => el.id === selectedElementId);
        if (selectedEl) {
          const hitHandle = getHandleAtPosition(canvasPoint, selectedEl, zoom);
          if (hitHandle) {
            actionRef.current = 'resizing';
            activeResizeHandleRef.current = hitHandle.handle;
            resizeInitialElementRef.current = JSON.parse(JSON.stringify(selectedEl));
            resizeInitialBoundsRef.current = getElementBounds(selectedEl);
            dragStartPointRef.current = canvasPoint;
            setCursorStyle(hitHandle.cursor);
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      const hitElement = getElementAtPosition(canvasPoint, elementsRef.current);
      if (hitElement) {
        setSelectedElementId(hitElement.id);
        actionRef.current = 'moving';
        dragStartPointRef.current = canvasPoint;
        canvas.setPointerCapture(e.pointerId);
      } else {
        setSelectedElementId(null);
        actionRef.current = 'none';
      }
      renderCanvas();
      return;
    }

    // 2. Tool: Eraser (Mendukung Tap dan Geser/Swipe tanpa garis animasi)
    if (tool === 'eraser') {
      actionRef.current = 'erasing';
      deletedIdsInStrokeRef.current = new Set();
      dragStartPointRef.current = canvasPoint;
      canvas.setPointerCapture(e.pointerId);

      const hitElement = getElementAtPosition(canvasPoint, elementsRef.current);
      if (hitElement) {
        deletedIdsInStrokeRef.current.add(hitElement.id);
        const nextElements = elementsRef.current.filter((el) => el.id !== hitElement.id);
        elementsRef.current = nextElements;
        if (selectedElementId === hitElement.id) {
          setSelectedElementId(null);
        }
      }
      renderCanvas();
      return;
    }

    // 3. Tool: Text
    if (tool === 'text') {
      textOpenedAtRef.current = Date.now();
      const hitElement = getElementAtPosition(canvasPoint, elementsRef.current);
      if (hitElement && hitElement.type === 'text') {
        setTextInput({
          x: hitElement.x1,
          y: hitElement.y1,
          text: hitElement.text || '',
          editingId: hitElement.id,
        });
      } else {
        setTextInput({
          x: canvasPoint.x,
          y: canvasPoint.y,
          text: '',
        });
      }
      actionRef.current = 'typing';
      return;
    }

    // 4. Tool: Menggambar Bentuk (Kotak, Diamond, Lingkaran, Garis, Panah, Pensil)
    canvas.setPointerCapture(e.pointerId);
    const newId = `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newElement = createElement(
      newId,
      canvasPoint.x,
      canvasPoint.y,
      canvasPoint.x,
      canvasPoint.y,
      tool as Exclude<ToolType, 'select' | 'hand' | 'eraser'>,
      {
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
        roughness,
        fillStyle,
        strokeStyle,
        opacity,
        points: tool === 'pencil' ? [canvasPoint] : undefined,
      },
    );

    currentDrawingRef.current = newElement;
    actionRef.current = 'drawing';
    dragStartPointRef.current = canvasPoint;
    renderCanvas();
  };

  /**
   * Pointer Move
   */
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, pan, zoom);

    // 1. Panning Kanvas
    if (actionRef.current === 'panning') {
      const dx = screenX - dragStartPointRef.current.x;
      const dy = screenY - dragStartPointRef.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStartPointRef.current = { x: screenX, y: screenY };
      return;
    }

    // 2. Menggambar Aktif
    if (actionRef.current === 'drawing' && currentDrawingRef.current) {
      const drawing = currentDrawingRef.current;
      if (drawing.type === 'pencil') {
        const nextPoints = [...(drawing.points || []), canvasPoint];
        drawing.points = nextPoints;
        drawing.roughElement = generateRoughElement(drawing);
      } else {
        drawing.x2 = canvasPoint.x;
        drawing.y2 = canvasPoint.y;
        drawing.roughElement = generateRoughElement(drawing);
      }
      renderCanvas();
      return;
    }

    // 3. Mengubah Ukuran / Resizing Elemen Terpilih
    if (actionRef.current === 'resizing' && selectedElementId && resizeInitialElementRef.current) {
      const initialEl = resizeInitialElementRef.current;
      const initialBounds = resizeInitialBoundsRef.current;
      const handle = activeResizeHandleRef.current;
      if (!handle) return;

      const dx = canvasPoint.x - dragStartPointRef.current.x;
      const dy = canvasPoint.y - dragStartPointRef.current.y;

      let nextElements = elementsRef.current;

      if (initialEl.type === 'line' || initialEl.type === 'arrow') {
        nextElements = elementsRef.current.map((el) => {
          if (el.id !== selectedElementId) return el;
          const updated = { ...el };
          if (handle === 'start') {
            updated.x1 = initialEl.x1 + dx;
            updated.y1 = initialEl.y1 + dy;
          } else if (handle === 'end') {
            updated.x2 = initialEl.x2 + dx;
            updated.y2 = initialEl.y2 + dy;
          }
          updated.roughElement = generateRoughElement(updated);
          return updated;
        });
      } else if (initialEl.type === 'pencil' && initialEl.points) {
        let newMinX = initialBounds.minX;
        let newMaxX = initialBounds.maxX;
        let newMinY = initialBounds.minY;
        let newMaxY = initialBounds.maxY;

        if (handle.includes('w')) newMinX += dx;
        if (handle.includes('e')) newMaxX += dx;
        if (handle.includes('n')) newMinY += dy;
        if (handle.includes('s')) newMaxY += dy;

        const newW = Math.max(10, newMaxX - newMinX);
        const newH = Math.max(10, newMaxY - newMinY);
        const scaleX = initialBounds.width > 0 ? newW / initialBounds.width : 1;
        const scaleY = initialBounds.height > 0 ? newH / initialBounds.height : 1;

        nextElements = elementsRef.current.map((el) => {
          if (el.id !== selectedElementId) return el;
          const scaledPoints = (initialEl.points || []).map((p) => ({
            x: newMinX + (p.x - initialBounds.minX) * scaleX,
            y: newMinY + (p.y - initialBounds.minY) * scaleY,
          }));
          const updated = {
            ...el,
            x1: newMinX,
            y1: newMinY,
            x2: newMinX + newW,
            y2: newMinY + newH,
            points: scaledPoints,
          };
          updated.roughElement = generateRoughElement(updated);
          return updated;
        });
      } else if (initialEl.type === 'text') {
        let newMinX = initialBounds.minX;
        let newMaxX = initialBounds.maxX;
        let newMinY = initialBounds.minY;
        let newMaxY = initialBounds.maxY;

        if (handle.includes('w')) newMinX += dx;
        if (handle.includes('e')) newMaxX += dx;
        if (handle.includes('n')) newMinY += dy;
        if (handle.includes('s')) newMaxY += dy;

        const newW = Math.max(20, newMaxX - newMinX);
        const newH = Math.max(15, newMaxY - newMinY);
        const scale = Math.max(0.4, Math.min(newW / Math.max(1, initialBounds.width), newH / Math.max(1, initialBounds.height)));
        const newFontSize = Math.min(80, Math.max(12, Math.round((initialEl.fontSize || 24) * scale)));

        nextElements = elementsRef.current.map((el) => {
          if (el.id !== selectedElementId) return el;
          const updated = {
            ...el,
            x1: newMinX,
            y1: newMinY,
            x2: newMinX + newW,
            y2: newMinY + newH,
            fontSize: newFontSize,
          };
          return updated;
        });
      } else {
        // rectangle, diamond, circle
        let newMinX = initialBounds.minX;
        let newMaxX = initialBounds.maxX;
        let newMinY = initialBounds.minY;
        let newMaxY = initialBounds.maxY;

        if (handle.includes('w')) newMinX += dx;
        if (handle.includes('e')) newMaxX += dx;
        if (handle.includes('n')) newMinY += dy;
        if (handle.includes('s')) newMaxY += dy;

        const finalX1 = Math.min(newMinX, newMaxX);
        const finalX2 = Math.max(newMinX, newMaxX);
        const finalY1 = Math.min(newMinY, newMaxY);
        const finalY2 = Math.max(newMinY, newMaxY);

        nextElements = elementsRef.current.map((el) => {
          if (el.id !== selectedElementId) return el;
          const updated = {
            ...el,
            x1: finalX1,
            y1: finalY1,
            x2: finalX2,
            y2: finalY2,
          };
          updated.roughElement = generateRoughElement(updated);
          return updated;
        });
      }

      elementsRef.current = nextElements;
      renderCanvas();
      return;
    }

    // 4. Menggeser Elemen Terpilih
    if (actionRef.current === 'moving' && selectedElementId) {
      const dx = canvasPoint.x - dragStartPointRef.current.x;
      const dy = canvasPoint.y - dragStartPointRef.current.y;

      const nextElements = elementsRef.current.map((el) => {
        if (el.id !== selectedElementId) return el;

        if (el.type === 'pencil' && el.points) {
          const shiftedPoints = el.points.map((p) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));
          const updated = {
            ...el,
            x1: el.x1 + dx,
            y1: el.y1 + dy,
            x2: el.x2 + dx,
            y2: el.y2 + dy,
            points: shiftedPoints,
          };
          updated.roughElement = generateRoughElement(updated);
          return updated;
        }

        const updated = {
          ...el,
          x1: el.x1 + dx,
          y1: el.y1 + dy,
          x2: el.x2 + dx,
          y2: el.y2 + dy,
        };
        updated.roughElement = generateRoughElement(updated);
        return updated;
      });

      elementsRef.current = nextElements;
      dragStartPointRef.current = canvasPoint;
      renderCanvas();
      return;
    }

    // 5. Menghapus dengan Menggeser / Swipe (Drag to Erase)
    if (actionRef.current === 'erasing') {
      const prevPoint = dragStartPointRef.current;

      let hasErased = false;
      const nextElements = elementsRef.current.filter((el) => {
        const isHit = doesEraserStrokeHitElement(prevPoint, canvasPoint, el);
        if (isHit) {
          deletedIdsInStrokeRef.current.add(el.id);
          if (selectedElementId === el.id) {
            setSelectedElementId(null);
          }
          hasErased = true;
          return false;
        }
        return true;
      });

      if (hasErased) {
        elementsRef.current = nextElements;
      }

      dragStartPointRef.current = canvasPoint;
      renderCanvas();
      return;
    }

    // 6. Hover Cursor Effect
    if (tool === 'select' && actionRef.current === 'none') {
      if (selectedElementId) {
        const selectedEl = elementsRef.current.find((el) => el.id === selectedElementId);
        if (selectedEl) {
          const hitHandle = getHandleAtPosition(canvasPoint, selectedEl, zoom);
          if (hitHandle) {
            setCursorStyle(hitHandle.cursor);
            return;
          }
        }
      }

      const hitElement = getElementAtPosition(canvasPoint, elementsRef.current);
      setCursorStyle(hitElement ? 'move' : 'default');
    }
  };

  /**
   * Pointer Up
   */
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (actionRef.current === 'drawing' && currentDrawingRef.current) {
      const drawing = currentDrawingRef.current;
      const bounds = getElementBounds(drawing);

      const isValidSize =
        drawing.type === 'pencil'
          ? drawing.points && drawing.points.length >= 2
          : bounds.width >= 2 || bounds.height >= 2;

      if (isValidSize) {
        const nextElements = [...elementsRef.current, drawing];
        onRecordSnapshot(nextElements);
      }
      currentDrawingRef.current = null;
    } else if (actionRef.current === 'moving') {
      onRecordSnapshot(elementsRef.current);
    } else if (actionRef.current === 'resizing') {
      onRecordSnapshot(elementsRef.current);
      activeResizeHandleRef.current = null;
      resizeInitialElementRef.current = null;
    } else if (actionRef.current === 'erasing') {
      if (deletedIdsInStrokeRef.current.size > 0) {
        onRecordSnapshot(elementsRef.current);
      }
      deletedIdsInStrokeRef.current.clear();
    }

    actionRef.current = 'none';
    if (isSpacePressedRef.current || tool === 'hand') {
      setCursorStyle('grab');
    } else {
      setCursorStyle(tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair');
    }
    renderCanvas();
  };

  /**
   * Handle Double Click (Bisa double-click pada teks untuk langsung mengedit)
   */
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, pan, zoom);

    const hitElement = getElementAtPosition(canvasPoint, elementsRef.current);
    if (hitElement && hitElement.type === 'text') {
      textOpenedAtRef.current = Date.now();
      setTextInput({
        x: hitElement.x1,
        y: hitElement.y1,
        text: hitElement.text || '',
        editingId: hitElement.id,
      });
      actionRef.current = 'typing';
    }
  };

  /**
   * Handle Wheel (Zoom & Pan)
   */
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const nextZoom = Math.min(Math.max(0.15, zoom * zoomFactor), 4);

      const newPanX = mouseScreenX - (mouseScreenX - pan.x) * (nextZoom / zoom);
      const newPanY = mouseScreenY - (mouseScreenY - pan.y) * (nextZoom / zoom);

      setZoom(nextZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  /**
   * Keyboard Shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        textInput !== null ||
        actionRef.current === 'typing' ||
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space' && !isSpacePressedRef.current) {
        isSpacePressedRef.current = true;
        setCursorStyle('grab');
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        onRedo?.();
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        const nextElements = elementsRef.current.filter((el) => el.id !== selectedElementId);
        onRecordSnapshot(nextElements);
        setSelectedElementId(null);
      }

      // Hotkey alat
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            setTool('hand');
            break;
          case 'v':
            setTool('select');
            break;
          case 'p':
            setTool('pencil');
            break;
          case 'r':
            setTool('rectangle');
            break;
          case 'd':
            setTool('diamond');
            break;
          case 'c':
          case 'o':
            setTool('circle');
            break;
          case 'l':
            setTool('line');
            break;
          case 'a':
            setTool('arrow');
            break;
          case 't':
            setTool('text');
            break;
          case 'e':
            setTool('eraser');
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setCursorStyle(tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElementId, tool, onRecordSnapshot, setSelectedElementId, setTool, onUndo, onRedo, textInput]);

  // Posisi teks di layar sesuai pan & zoom
  const textScreenPos = textInput
    ? canvasToScreen(textInput.x, textInput.y, pan, zoom)
    : { x: 0, y: 0 };

  return (
    <div className="relative w-full h-full overflow-hidden canvas-bg-dots">
      <canvas
        ref={canvasRef}
        className="block touch-none select-none"
        style={{ cursor: cursorStyle }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {/* Floating Card Modal Input Teks (Bebas dari Pointer Capture Canvas) */}
      {textInput && (
        <div
          style={{
            position: 'absolute',
            left: `${textScreenPos.x}px`,
            top: `${textScreenPos.y}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
          className="z-50 flex flex-col gap-2 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-2 border-blue-500 rounded-2xl shadow-2xl animate-fade-in min-w-[260px] max-w-[420px]"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={textInput.text}
            onChange={(e) =>
              setTextInput((prev) => (prev ? { ...prev, text: e.target.value } : null))
            }
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setTextInput(null);
                actionRef.current = 'none';
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleFinishText();
              }
            }}
            rows={2}
            style={{
              font: '24px Caveat, cursive, sans-serif',
              color: strokeColor,
            }}
            className="w-full bg-transparent outline-none resize-none p-1 leading-snug text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 placeholder:text-sm placeholder:font-sans"
            placeholder="Tulis catatan di sini..."
          />

          <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-zinc-800 pt-2 px-0.5 text-xs">
            <span className="text-[10px] text-slate-400 font-mono">
              Enter: Simpan • Shift+Enter: Baris baru
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTextInput(null);
                  actionRef.current = 'none';
                }}
                className="px-2.5 py-1 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
              <button
                type="button"
                onClick={handleFinishText}
                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
