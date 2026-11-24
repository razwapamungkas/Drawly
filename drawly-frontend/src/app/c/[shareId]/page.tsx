'use client';

import React, { useEffect, useState, use, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DrawlyCanvas } from '@/components/canvas/DrawlyCanvas';
import { Header } from '@/components/ui/Header';
import { FloatingDock } from '@/components/ui/FloatingDock';
import { PropertiesPanel } from '@/components/ui/PropertiesPanel';
import { ShareModal } from '@/components/ui/ShareModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CanvasElement, ToolType, Point, FillStyle, StrokeStyle } from '@/types/canvas';
import { exportToPng, exportToSvg, exportToJson } from '@/lib/canvas/export';
import { fetchCanvasByShareId, saveCanvasToCloud, updateCanvasInCloud } from '@/lib/api';
import { generateRoughElement } from '@/lib/canvas/element';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';

interface SharedCanvasPageProps {
  params: Promise<{ shareId: string }>;
}

export default function SharedCanvasPage({ params }: SharedCanvasPageProps) {
  const resolvedParams = use(params);
  const shareId = resolvedParams.shareId;

  // Tool & State
  const [tool, setTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#1e293b');
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [fillStyle, setFillStyle] = useState<FillStyle>('solid');
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('solid');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [roughness, setRoughness] = useState<number>(1.2);
  const [opacity, setOpacity] = useState<number>(100);
  const [title, setTitle] = useState<string>('Memuat...');

  // Pan & Zoom
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);

  // History & Elements
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

  // Loading & Error State
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Clear Dialog State
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Load Canvas from Backend API
  useEffect(() => {
    async function loadCanvas() {
      if (!shareId) return;
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetchCanvasByShareId(shareId);
        if (response.success && response.data) {
          const data = response.data;
          setTitle(data.title || 'Shared Canvas - Drawly');

          const rawElements = (data.elements as CanvasElement[]) || [];
          const hydrated = rawElements.map((el) => ({
            ...el,
            roughElement: generateRoughElement(el),
          }));
          resetHistory(hydrated);

          if (data.appState?.pan) setPan(data.appState.pan);
          if (data.appState?.zoom) setZoom(data.appState.zoom);
        } else {
          throw new Error('Data canvas tidak ditemukan');
        }
      } catch (err: any) {
        setLoadError(
          err?.message ||
            'Kanvas tidak ditemukan atau terjadi kendala koneksi ke server backend.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCanvas();
  }, [shareId, resetHistory]);

  // Selected element memo
  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedElementId) || null,
    [elements, selectedElementId],
  );

  const handleUpdateElement = useCallback(
    (updatedProps: Partial<CanvasElement>) => {
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
    [selectedElementId, elements, recordSnapshot],
  );

  const handleDeleteSelectedElement = useCallback(() => {
    if (!selectedElementId) return;
    const nextElements = elements.filter((el) => el.id !== selectedElementId);
    recordSnapshot(nextElements);
    setSelectedElementId(null);
  }, [selectedElementId, elements, recordSnapshot]);

  const handleClearCanvas = useCallback(() => {
    if (elements.length === 0) return;
    setIsClearDialogOpen(true);
  }, [elements.length]);

  const handleConfirmClearCanvas = useCallback(() => {
    recordSnapshot([]);
    setSelectedElementId(null);
    setIsClearDialogOpen(false);
  }, [recordSnapshot]);

  const handleShare = async () => {
    setIsShareModalOpen(true);
    setIsSharing(true);
    setShareError(null);

    try {
      const cleanElements = elements.map(({ roughElement, ...rest }) => rest);
      await updateCanvasInCloud(shareId, {
        title,
        elements: cleanElements as CanvasElement[],
        appState: { pan, zoom },
      });
    } catch {
      try {
        const cleanElements = elements.map(({ roughElement, ...rest }) => rest);
        await saveCanvasToCloud({
          title,
          elements: cleanElements as CanvasElement[],
          appState: { pan, zoom },
        });
      } catch (err: any) {
        setShareError(err?.message || 'Gagal menyimpan perubahan kanvas');
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen canvas-bg-dots gap-4">
        <div className="glass-panel p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-200">
              Memuat Kanvas Drawly...
            </h2>
            <p className="text-xs text-slate-500">ID: {shareId}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen canvas-bg-dots p-6">
        <div className="glass-panel max-w-md p-8 rounded-3xl flex flex-col items-center text-center gap-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-200 mb-1">
              Kanvas Tidak Ditemukan
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">{loadError}</p>
          </div>
          <Link
            href="/"
            className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Buat Kanvas Baru</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      <Header
        title={title}
        setTitle={setTitle}
        onExportPng={() => exportToPng(elements, title)}
        onExportSvg={() => exportToSvg(elements, title)}
        onExportJson={() => exportToJson(elements, title)}
        onClearCanvas={handleClearCanvas}
        onShare={handleShare}
        isSharing={isSharing}
      />

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

      <FloatingDock
        tool={tool}
        setTool={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareId={shareId}
        error={shareError}
      />

      <ConfirmDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={handleConfirmClearCanvas}
        title="Kosongkan Kanvas?"
        description="Semua coretan dan elemen di kanvas publik ini akan dihapus. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Kosongkan Kanvas"
        cancelLabel="Batal"
        variant="danger"
      />
    </main>
  );
}
