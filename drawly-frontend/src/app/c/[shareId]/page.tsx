'use client';

import React, { useEffect, useState, use, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DrawlyCanvas } from '@/components/canvas/DrawlyCanvas';
import { Header } from '@/components/ui/Header';
import { FloatingDock } from '@/components/ui/FloatingDock';
import { PropertiesPanel } from '@/components/ui/PropertiesPanel';
import { ShareModal } from '@/components/ui/ShareModal';
import { CanvasElement, ToolType } from '@/types/canvas';
import { exportToPng, exportToSvg, exportToJson } from '@/lib/canvas/export';
import { fetchCanvasByShareId, saveCanvasToCloud, updateCanvasInCloud } from '@/lib/api';
import { generateRoughElement } from '@/lib/canvas/element';
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
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [roughness, setRoughness] = useState<number>(1.2);
  const [title, setTitle] = useState<string>('Memuat...');

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Loading & Error State
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

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
          setElements(hydrated);
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
  }, [shareId]);

  // Selected element memo
  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedElementId) || null,
    [elements, selectedElementId],
  );

  const handleUpdateSelectedElement = useCallback(
    (updatedProps: Partial<CanvasElement>) => {
      if (!selectedElementId) return;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          const updated = { ...el, ...updatedProps };
          updated.roughElement = generateRoughElement(updated);
          return updated;
        }),
      );

      if (updatedProps.stroke) setStrokeColor(updatedProps.stroke);
      if (updatedProps.fill) setFillColor(updatedProps.fill);
      if (updatedProps.strokeWidth) setStrokeWidth(updatedProps.strokeWidth);
      if (updatedProps.roughness !== undefined) setRoughness(updatedProps.roughness);
    },
    [selectedElementId],
  );

  const handleDeleteSelectedElement = useCallback(() => {
    if (!selectedElementId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
  }, [selectedElementId]);

  const handleClearCanvas = useCallback(() => {
    if (elements.length === 0) return;
    if (window.confirm('Apakah Anda yakin ingin mengosongkan kanvas ini?')) {
      setElements([]);
      setSelectedElementId(null);
    }
  }, [elements.length]);

  const handleShare = async () => {
    setIsShareModalOpen(true);
    setIsSharing(true);
    setShareError(null);

    try {
      // Update data di server jika ada perubahan
      await updateCanvasInCloud(shareId, {
        title,
        elements,
      });
    } catch {
      // Jika update gagal (misal canvas baru), buat baru
      try {
        await saveCanvasToCloud({
          title,
          elements,
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
        onUpdateElement={handleUpdateSelectedElement}
        onDeleteElement={handleDeleteSelectedElement}
      />

      <DrawlyCanvas
        tool={tool}
        setTool={setTool}
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        roughness={roughness}
        title={title}
        selectedElementId={selectedElementId}
        setSelectedElementId={setSelectedElementId}
        onElementsChange={setElements}
        initialElements={elements}
        onUndoRedoAvailable={(undoAvailable, redoAvailable) => {
          setCanUndo(undoAvailable);
          setCanRedo(redoAvailable);
        }}
      />

      <FloatingDock
        tool={tool}
        setTool={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
          );
        }}
        onRedo={() => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }),
          );
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareId={shareId}
        isLoading={isSharing}
        error={shareError}
      />
    </main>
  );
}

