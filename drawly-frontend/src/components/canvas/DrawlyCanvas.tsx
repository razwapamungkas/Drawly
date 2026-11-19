'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import rough from 'roughjs';
import {
  CanvasElement,
  Point,
  ToolType,
  AppState,
} from '@/types/canvas';
import {
  createElement,
  generateRoughElement,
  getElementAtPosition,
  getElementBounds,
} from '@/lib/canvas/element';
import { canvasToScreen, screenToCanvas } from '@/lib/canvas/math';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';

interface DrawlyCanvasProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  roughness: number;
  title: string;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  onElementsChange?: (elements: CanvasElement[]) => void;
  initialElements?: CanvasElement[];
  onUndoRedoAvailable?: (canUndo: boolean, canRedo: boolean) => void;
}

export const DrawlyCanvas: React.FC<DrawlyCanvasProps> = ({
  tool,
  setTool,
  strokeColor,
  fillColor,
  strokeWidth,
  roughness,
  title,
  selectedElementId,
  setSelectedElementId,
  onElementsChange,
  initialElements = [],
  onUndoRedoAvailable,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Riwayat dan Elemen Kanvas
  const {
    elements,
    setElements,
    recordSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useCanvasHistory(initialElements);

  // App State: Pan & Zoom
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);

  // Mouse & Action State
  const [action, setAction] = useState<
    'none' | 'drawing' | 'moving' | 'panning' | 'typing'
  >('none');
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentDrawingElement, setCurrentDrawingElement] =
    useState<CanvasElement | null>(null);

  // Text Inline Editor State
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sinkronisasi status Undo/Redo ke parent
  useEffect(() => {
    onUndoRedoAvailable?.(canUndo, canRedo);
  }, [canUndo, canRedo, onUndoRedoAvailable]);

  // Sinkronisasi perubahan elements ke callback parent dan LocalStorage
  useEffect(() => {
    onElementsChange?.(elements);
    try {
      localStorage.setItem('drawly_elements', JSON.stringify(elements));
      localStorage.setItem('drawly_title', title);
      localStorage.setItem('drawly_app_state', JSON.stringify({ pan, zoom }));
    } catch {
      // Abaikan jika storage kuota penuh
    }
  }, [elements, title, pan, zoom, onElementsChange]);

  // Memuat data dari LocalStorage saat pertama kali mount (jika initialElements kosong)
  useEffect(() => {
    if (initialElements.length === 0) {
      try {
        const saved = localStorage.getItem('drawly_elements');
        if (saved) {
          const parsed: CanvasElement[] = JSON.parse(saved);
          // Re-generate roughElement objects
          const hydrated = parsed.map((el) => ({
            ...el,
            roughElement: generateRoughElement(el),
          }));
          resetHistory(hydrated);
        }
        const savedState = localStorage.getItem('drawly_app_state');
        if (savedState) {
          const { pan: savedPan, zoom: savedZoom } = JSON.parse(savedState);
          if (savedPan) setPan(savedPan);
          if (savedZoom) setZoom(savedZoom);
        }
      } catch {
        // Fallback jika parse gagal
      }
    }
  }, [initialElements, resetHistory]);

  // Resize Canvas secara dinamis mengikuti jendela browser (dengan rasio retina display)
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
  }, []);

  /**
   * Fungsi Render Utama Kanvas (60 FPS, Rough.js + HTML5 Canvas)
   */
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rc = rough.canvas(canvas);

    ctx.save();
    // Reset transform dan bersihkan kanvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Terapkan DPR, pan dan zoom
    ctx.scale(dpr, dpr);
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Gambar semua elemen
    const allElements = currentDrawingElement
      ? [...elements, currentDrawingElement]
      : elements;

    for (const element of allElements) {
      if (element.type === 'text') {
        if (element.text) {
          ctx.save();
          ctx.font = `${element.fontSize || 22}px Caveat, cursive, sans-serif`;
          ctx.fillStyle = element.stroke || '#1e293b';
          ctx.textBaseline = 'top';

          const lines = element.text.split('\n');
          const lineHeight = (element.fontSize || 22) * 1.35;
          lines.forEach((line, index) => {
            ctx.fillText(
              line,
              element.x1,
              element.y1 + index * lineHeight,
            );
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

    // Gambar Bounding Box & Handles untuk elemen yang sedang dipilih
    if (selectedElementId && action !== 'drawing') {
      const selectedEl = elements.find((el) => el.id === selectedElementId);
      if (selectedEl) {
        const bounds = getElementBounds(selectedEl);
        const padding = 8;
        const bx = bounds.minX - padding;
        const by = bounds.minY - padding;
        const bw = bounds.width + padding * 2;
        const bh = bounds.height + padding * 2;

        ctx.save();
        ctx.strokeStyle = '#3b82f6'; // Modern Blue Accent
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.strokeRect(bx, by, bw, bh);

        // Corner handles
        const handleSize = 7 / zoom;
        ctx.fillStyle = '#ffffff';
        ctx.setLineDash([]);
        const handles = [
          { x: bx, y: by },
          { x: bx + bw, y: by },
          { x: bx, y: by + bh },
          { x: bx + bw, y: by + bh },
        ];
        for (const h of handles) {
          ctx.beginPath();
          ctx.rect(
            h.x - handleSize / 2,
            h.y - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }, [elements, currentDrawingElement, selectedElementId, action, pan, zoom]);

  // Re-render saat ada perubahan state
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  /**
   * Handle Mouse Down
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, pan, zoom);

    // Pan dengan tombol tengah mouse atau Spacebar ditekan
    if (e.button === 1 || isSpacePressed) {
      setAction('panning');
      setDragStartPoint({ x: screenX, y: screenY });
      return;
    }

    // Tool: Select
    if (tool === 'select') {
      const hitElement = getElementAtPosition(canvasPoint, elements);
      if (hitElement) {
        setSelectedElementId(hitElement.id);
        setAction('moving');
        setDragStartPoint(canvasPoint);
      } else {
        setSelectedElementId(null);
        setAction('none');
      }
      return;
    }

    // Tool: Eraser
    if (tool === 'eraser') {
      const hitElement = getElementAtPosition(canvasPoint, elements);
      if (hitElement) {
        const nextElements = elements.filter((el) => el.id !== hitElement.id);
        recordSnapshot(nextElements);
        if (selectedElementId === hitElement.id) {
          setSelectedElementId(null);
        }
      }
      return;
    }

    // Tool: Text
    if (tool === 'text') {
      setTextInput({
        x: canvasPoint.x,
        y: canvasPoint.y,
        text: '',
      });
      setAction('typing');
      return;
    }

    // Tool: Menggambar Bentuk / Pensil
    const newId = `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newElement = createElement(
      newId,
      canvasPoint.x,
      canvasPoint.y,
      canvasPoint.x,
      canvasPoint.y,
      tool,
      {
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
        roughness,
        points: tool === 'pencil' ? [canvasPoint] : undefined,
      },
    );

    setCurrentDrawingElement(newElement);
    setAction('drawing');
    setDragStartPoint(canvasPoint);
  };

  /**
   * Handle Mouse Move
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY, pan, zoom);

    // 1. Panning
    if (action === 'panning') {
      const dx = screenX - dragStartPoint.x;
      const dy = screenY - dragStartPoint.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStartPoint({ x: screenX, y: screenY });
      return;
    }

    // 2. Menggambar (Drawing)
    if (action === 'drawing' && currentDrawingElement) {
      if (currentDrawingElement.type === 'pencil') {
        const nextPoints = [
          ...(currentDrawingElement.points || []),
          canvasPoint,
        ];
        const updated = {
          ...currentDrawingElement,
          points: nextPoints,
        };
        updated.roughElement = generateRoughElement(updated);
        setCurrentDrawingElement(updated);
      } else {
        const updated = {
          ...currentDrawingElement,
          x2: canvasPoint.x,
          y2: canvasPoint.y,
        };
        updated.roughElement = generateRoughElement(updated);
        setCurrentDrawingElement(updated);
      }
      return;
    }

    // 3. Memindahkan Elemen (Moving)
    if (action === 'moving' && selectedElementId) {
      const dx = canvasPoint.x - dragStartPoint.x;
      const dy = canvasPoint.y - dragStartPoint.y;

      const nextElements = elements.map((el) => {
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

      setElements(nextElements);
      setDragStartPoint(canvasPoint);
      return;
    }

    // 4. Eraser saat tombol mouse ditahan
    if (tool === 'eraser' && e.buttons === 1) {
      const hitElement = getElementAtPosition(canvasPoint, elements);
      if (hitElement) {
        const nextElements = elements.filter((el) => el.id !== hitElement.id);
        recordSnapshot(nextElements);
        if (selectedElementId === hitElement.id) {
          setSelectedElementId(null);
        }
      }
    }
  };

  /**
   * Handle Mouse Up
   */
  const handleMouseUp = () => {
    if (action === 'drawing' && currentDrawingElement) {
      // Abaikan jika bentuk terlalu kecil (klik tanpa drag) kecuali tool pencil dengan minimal 2 titik
      const bounds = getElementBounds(currentDrawingElement);
      const isTooSmall =
        currentDrawingElement.type !== 'pencil' &&
        bounds.width < 3 &&
        bounds.height < 3;

      if (!isTooSmall) {
        const nextElements = [...elements, currentDrawingElement];
        recordSnapshot(nextElements);
      }
      setCurrentDrawingElement(null);
    } else if (action === 'moving') {
      // Catat posisi final elemen yang dipindahkan ke riwayat
      recordSnapshot(elements);
    }

    setAction('none');
  };

  /**
   * Handle Wheel (Zoom & Trackpad Pan)
   */
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom in / Zoom out relatif terhadap posisi kursor
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const nextZoom = Math.min(Math.max(0.15, zoom * zoomFactor), 4);

      // Hitung offset pan agar titik di bawah kursor tetap berada di tempat yang sama
      const newPanX = mouseScreenX - (mouseScreenX - pan.x) * (nextZoom / zoom);
      const newPanY = mouseScreenY - (mouseScreenY - pan.y) * (nextZoom / zoom);

      setZoom(nextZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Pan scrolling biasa
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  /**
   * Selesaikan input teks
   */
  const handleFinishText = () => {
    if (textInput && textInput.text.trim()) {
      const newId = `text_${Date.now()}`;
      const newElement = createElement(
        newId,
        textInput.x,
        textInput.y,
        textInput.x + 100,
        textInput.y + 40,
        'text',
        {
          stroke: strokeColor,
          text: textInput.text.trim(),
          fontSize: 24,
        },
      );
      recordSnapshot([...elements, newElement]);
      setSelectedElementId(newId);
    }
    setTextInput(null);
    setAction('none');
    setTool('select');
  };

  /**
   * Keyboard Shortcuts (Delete, Undo, Redo, Space Pan, dll)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Jangan tangani shortcut saat sedang mengetik teks
      if (action === 'typing' || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      // Spacebar untuk Pan
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y atau Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }

      // Delete: Menghapus elemen yang terpilih
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        const nextElements = elements.filter((el) => el.id !== selectedElementId);
        recordSnapshot(nextElements);
        setSelectedElementId(null);
      }

      // Tool Switch Shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setTool('select');
            break;
          case 'p':
            setTool('pencil');
            break;
          case 'r':
            setTool('rectangle');
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
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    action,
    isSpacePressed,
    selectedElementId,
    elements,
    undo,
    redo,
    recordSnapshot,
    setSelectedElementId,
    setTool,
  ]);

  // Dynamic Cursor
  const getCursor = () => {
    if (isSpacePressed || action === 'panning') {
      return action === 'panning' ? 'grabbing' : 'grab';
    }
    if (action === 'moving') return 'move';
    switch (tool) {
      case 'select':
        return 'default';
      case 'text':
        return 'text';
      case 'eraser':
        return 'cell';
      default:
        return 'crosshair';
    }
  };

  // Hitung posisi textarea di layar saat input teks
  const textScreenPos = textInput
    ? canvasToScreen(textInput.x, textInput.y, pan, zoom)
    : { x: 0, y: 0 };

  return (
    <div className="relative w-full h-full overflow-hidden canvas-bg-dots">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Inline Text Area saat tool 'text' aktif */}
      {action === 'typing' && textInput && (
        <textarea
          ref={textareaRef}
          autoFocus
          value={textInput.text}
          onChange={(e) =>
            setTextInput((prev) => (prev ? { ...prev, text: e.target.value } : null))
          }
          onBlur={handleFinishText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setTextInput(null);
              setAction('none');
            } else if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleFinishText();
            }
          }}
          style={{
            position: 'absolute',
            left: `${textScreenPos.x}px`,
            top: `${textScreenPos.y}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            font: '24px Caveat, cursive, sans-serif',
            color: strokeColor,
          }}
          className="bg-white/80 dark:bg-zinc-900/90 border border-blue-500 rounded-lg p-2 shadow-lg outline-none resize-none min-w-[140px] min-h-[48px]"
          placeholder="Tulis catatan..."
        />
      )}
    </div>
  );
};

