'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { DrawlyCanvas } from '@/components/canvas/DrawlyCanvas';
import { Header } from '@/components/ui/Header';
import { FloatingDock } from '@/components/ui/FloatingDock';
import { PropertiesPanel } from '@/components/ui/PropertiesPanel';
import { ShareModal } from '@/components/ui/ShareModal';
import { CanvasElement, ToolType } from '@/types/canvas';
import { exportToPng, exportToSvg, exportToJson } from '@/lib/canvas/export';
import { saveCanvasToCloud } from '@/lib/api';
import { generateRoughElement } from '@/lib/canvas/element';

export default function DrawlyStudioPage() {
  // Tool & Drawing Style State
  const [tool, setTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#1e293b');
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [roughness, setRoughness] = useState<number>(1.2);
  const [title, setTitle] = useState<string>('Untitled Canvas - Drawly');

  // Canvas Selection & History State
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Cloud Share State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  // Temukan elemen aktif untuk Contextual Properties Panel
  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedElementId) || null,
    [elements, selectedElementId],
  );

  // Update properti elemen yang sedang dipilih
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

      // Sinkronkan juga style default ke toolbar
      if (updatedProps.stroke) setStrokeColor(updatedProps.stroke);
      if (updatedProps.fill) setFillColor(updatedProps.fill);
      if (updatedProps.strokeWidth) setStrokeWidth(updatedProps.strokeWidth);
      if (updatedProps.roughness !== undefined) setRoughness(updatedProps.roughness);
    },
    [selectedElementId],
  );

  // Hapus elemen terpilih
  const handleDeleteSelectedElement = useCallback(() => {
    if (!selectedElementId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
  }, [selectedElementId]);

  // Bersihkan seluruh kanvas
  const handleClearCanvas = useCallback(() => {
    if (elements.length === 0) return;
    if (window.confirm('Apakah Anda yakin ingin mengosongkan seluruh kanvas?')) {
      setElements([]);
      setSelectedElementId(null);
      try {
        localStorage.removeItem('drawly_elements');
      } catch {
        // Fallback
      }
    }
  }, [elements.length]);

  // Trigger Share Link ke NestJS Backend
  const handleShare = async () => {
    setIsShareModalOpen(true);
    setIsSharing(true);
    setShareError(null);

    try {
      const response = await saveCanvasToCloud({
        title,
        elements,
        appState: { theme: 'light' },
      });

      if (response.success && response.data?.shareId) {
        setShareId(response.data.shareId);
      } else {
        throw new Error('Respons server tidak valid');
      }
    } catch (err: any) {
      setShareError(
        err?.message ||
          'Gagal menghubungkan ke backend NestJS. Pastikan server backend aktif di port 3001.',
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* 1. Top Workspace Bar */}
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

      {/* 2. Contextual Properties Panel (Hanya muncul jika ada elemen aktif dipilih) */}
      <PropertiesPanel
        selectedElement={selectedElement}
        onUpdateElement={handleUpdateSelectedElement}
        onDeleteElement={handleDeleteSelectedElement}
      />

      {/* 3. Core Rough.js Canvas Engine */}
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
        onUndoRedoAvailable={(undoAvailable, redoAvailable) => {
          setCanUndo(undoAvailable);
          setCanRedo(redoAvailable);
        }}
      />

      {/* 4. Floating Glassmorphism Toolbar Dock */}
      <FloatingDock
        tool={tool}
        setTool={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          // Trigger keyboard undo event
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
          );
        }}
        onRedo={() => {
          // Trigger keyboard redo event
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }),
          );
        }}
      />

      {/* 5. Share Modal */}
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
