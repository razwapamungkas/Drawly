import { useState, useCallback } from 'react';
import { CanvasElement } from '@/types/canvas';

const MAX_HISTORY = 50;

export function useCanvasHistory(initialElements: CanvasElement[] = []) {
  const [elements, setElementsState] = useState<CanvasElement[]>(initialElements);
  const [history, setHistory] = useState<CanvasElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  /**
   * Menyimpan snapshot perubahan baru ke riwayat
   */
  const recordSnapshot = useCallback(
    (newElements: CanvasElement[]) => {
      // Potong cabang redo jika pengguna melakukan aksi baru di tengah history
      const updatedHistory = history.slice(0, historyIndex + 1);
      const nextHistory = [...updatedHistory, newElements].slice(-MAX_HISTORY);

      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setElementsState(newElements);
    },
    [history, historyIndex],
  );

  /**
   * Mengatur elements tanpa mencatat ke history (misal saat mouse drag realtime)
   */
  const setElementsLive = useCallback((newElements: CanvasElement[]) => {
    setElementsState(newElements);
  }, []);

  /**
   * Membatalkan perubahan (Undo)
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setElementsState(history[nextIndex]);
      return history[nextIndex];
    }
    return null;
  }, [history, historyIndex]);

  /**
   * Mengulangi perubahan (Redo)
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElementsState(history[nextIndex]);
      return history[nextIndex];
    }
    return null;
  }, [history, historyIndex]);

  /**
   * Reset seluruh riwayat (misal saat membuka kanvas baru atau memuat data dari cloud)
   */
  const resetHistory = useCallback((freshElements: CanvasElement[]) => {
    setElementsState(freshElements);
    setHistory([freshElements]);
    setHistoryIndex(0);
  }, []);

  return {
    elements,
    setElements: setElementsLive,
    recordSnapshot,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    resetHistory,
  };
}

