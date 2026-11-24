'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DrawlyCanvas } from '@/components/canvas/DrawlyCanvas';
import { Header } from '@/components/ui/Header';
import { FloatingDock } from '@/components/ui/FloatingDock';
import { PropertiesPanel } from '@/components/ui/PropertiesPanel';
import { ShareModal } from '@/components/ui/ShareModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CanvasElement, ToolType, Point, FillStyle, StrokeStyle } from '@/types/canvas';
import { exportToPng, exportToSvg, exportToJson } from '@/lib/canvas/export';
import { saveCanvasToCloud } from '@/lib/api';
import { generateRoughElement } from '@/lib/canvas/element';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';

export default function DrawlyStudioPage() {
  // Tool & Drawing Style State
  const [tool, setTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#1e293b');
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [fillStyle, setFillStyle] = useState<FillStyle>('solid');
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('solid');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [roughness, setRoughness] = useState<number>(1.2);
  const [opacity, setOpacity] = useState<number>(100);
  const [title, setTitle] = useState<string>('Untitled Canvas - Drawly');

  // Viewport Pan & Zoom State
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);

  // History & Elements Management (Single Source of Truth)
  const {
    elements,
    recordSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useCanvasHistory([]);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Cloud Share State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  // Clear Canvas Dialog State
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Memuat data dari LocalStorage saat pertama kali aplikasi dibuka
  useEffect(() => {
    try {
      const savedElements = localStorage.getItem('drawly_elements');
      if (savedElements) {
        const parsed: CanvasElement[] = JSON.parse(savedElements);
        const hydrated = parsed.map((el) => ({
          ...el,
          roughElement: generateRoughElement(el),
        }));
        resetHistory(hydrated);
      }

      const savedTitle = localStorage.getItem('drawly_title');
      if (savedTitle) {
        setTitle(savedTitle);
      }

      const savedState = localStorage.getItem('drawly_app_state');
      if (savedState) {
        const { pan: savedPan, zoom: savedZoom } = JSON.parse(savedState);
        if (savedPan) setPan(savedPan);
        if (savedZoom) setZoom(savedZoom);
      }
    } catch {
      // Abaikan jika storage kosong / parse gagal
    }
  }, [resetHistory]);

  // Simpan otomatis ke LocalStorage setiap kali ada perubahan elemen
  useEffect(() => {
    if (elements.length === 0) return;
    try {
      // Hapus cache roughElement agar payload JSON hemat memori dan tidak circular
      const cleanElements = elements.map(({ roughElement, ...rest }) => rest);
      localStorage.setItem('drawly_elements', JSON.stringify(cleanElements));
      localStorage.setItem('drawly_title', title);
      localStorage.setItem('drawly_app_state', JSON.stringify({ pan, zoom }));
    } catch {
      // Abaikan jika kuota storage browser penuh
    }
  }, [elements, title, pan, zoom]);

  // Temukan elemen aktif untuk Contextual Properties Panel
  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedElementId) || null,
    [elements, selectedElementId],
  );

  // Update properti elemen atau default tool style secara instan
  const handleUpdateElement = useCallback(
    (updatedProps: Partial<CanvasElement>) => {
      // Sinkronkan selalu style default agar alat gambar berikutnya langsung menggunakannya
      if (updatedProps.stroke) setStrokeColor(updatedProps.stroke);
      if (updatedProps.fill) setFillColor(updatedProps.fill);
      if (updatedProps.fillStyle) setFillStyle(updatedProps.fillStyle);
      if (updatedProps.strokeStyle) setStrokeStyle(updatedProps.strokeStyle);
      if (updatedProps.strokeWidth) setStrokeWidth(updatedProps.strokeWidth);
      if (updatedProps.roughness !== undefined) setRoughness(updatedProps.roughness);
      if (updatedProps.opacity !== undefined) setOpacity(updatedProps.opacity);

      if (!selectedElementId) return;

      const nextElements = elements.map((el) => {
        if (el.id !== selectedElementId) return el;
        const updated = { ...el, ...updatedProps };
        updated.roughElement = generateRoughElement(updated);
        return updated;
      });

      recordSnapshot(nextElements);
    },
    [elements, selectedElementId, recordSnapshot],
  );

  // Hapus elemen terpilih
  const handleDeleteSelectedElement = useCallback(() => {
    if (!selectedElementId) return;
    const nextElements = elements.filter((el) => el.id !== selectedElementId);
    recordSnapshot(nextElements);
    setSelectedElementId(null);
  }, [elements, selectedElementId, recordSnapshot]);

  // Bagikan Kanvas ke Cloud (NestJS API)
  const handleShare = useCallback(async () => {
    setIsSharing(true);
    setShareError(null);
    try {
      const cleanElements = elements.map(({ roughElement, ...rest }) => rest);
      const res = await saveCanvasToCloud({
        title,
        elements: cleanElements,
        appState: { pan, zoom },
      });
      if (res.data?.shareId) {
        setShareId(res.data.shareId);
      }
      setIsShareModalOpen(true);
    } catch {
      setShareError('Gagal membagikan kanvas ke server cloud. Pastikan server NestJS aktif.');
      setIsShareModalOpen(true);
    } finally {
      setIsSharing(false);
    }
  }, [elements, title, pan, zoom]);

  // Kosongkan Kanvas
  const handleConfirmClearCanvas = useCallback(() => {
    recordSnapshot([]);
    setSelectedElementId(null);
    localStorage.removeItem('drawly_elements');
    setIsClearDialogOpen(false);
  }, [recordSnapshot]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 select-none">
      {/* Top Header */}
      <Header
        title={title}
        setTitle={setTitle}
        onExportPng={() => exportToPng(elements, title)}
        onExportSvg={() => exportToSvg(elements, title)}
        onExportJson={() => exportToJson(elements, title)}
        onClearCanvas={() => setIsClearDialogOpen(true)}
        onShare={handleShare}
        isSharing={isSharing}
      />

      {/* Main Drawing Canvas */}
      <DrawlyCanvas
        tool={tool}
        setTool={setTool}
        strokeColor={strokeColor}
        fillColor={fillColor}
        fillStyle={fillStyle}
        strokeStyle={strokeStyle}
        strokeWidth={strokeWidth}
        roughness={roughness}
        opacity={opacity}
        title={title}
        selectedElementId={selectedElementId}
        setSelectedElementId={setSelectedElementId}
        elements={elements}
        onRecordSnapshot={recordSnapshot}
        onUndo={undo}
        onRedo={redo}
        pan={pan}
        setPan={setPan}
        zoom={zoom}
        setZoom={setZoom}
      />

      {/* Contextual Properties Inspector Panel */}
      <PropertiesPanel
        selectedElement={selectedElement}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteSelectedElement}
        defaultStrokeColor={strokeColor}
        defaultFillColor={fillColor}
        defaultFillStyle={fillStyle}
        defaultStrokeStyle={strokeStyle}
        defaultStrokeWidth={strokeWidth}
        defaultRoughness={roughness}
        defaultOpacity={opacity}
        activeTool={tool}
      />

      {/* Bottom Floating Drawing Tools Dock */}
      <FloatingDock
        tool={tool}
        setTool={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Cloud Share Link Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareId={shareId}
        error={shareError}
      />

      {/* Custom Confirm Dialog untuk Kosongkan Kanvas */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        title="Kosongkan Seluruh Kanvas?"
        description="Tindakan ini akan menghapus semua gambar dan catatan yang ada di lembar kerja saat ini. Anda masih dapat mengembalikannya dengan tombol Undo (Ctrl+Z)."
        confirmLabel="Kosongkan Kanvas"
        cancelLabel="Batal"
        onConfirm={handleConfirmClearCanvas}
        onClose={() => setIsClearDialogOpen(false)}
        variant="danger"
      />
    </main>
  );
}
