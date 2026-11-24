'use client';

import React from 'react';
import {
  Hand,
  MousePointer2,
  Square,
  Diamond,
  Circle,
  MoveRight,
  Minus,
  Pencil,
  Type,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react';
import { ToolType } from '@/types/canvas';

interface FloatingDockProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

interface ToolButtonConfig {
  id: ToolType;
  name: string;
  icon: React.ReactNode;
  shortcut: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  tool,
  setTool,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const tools: ToolButtonConfig[] = [
    {
      id: 'hand',
      name: 'Hand (Pan)',
      icon: <Hand className="w-5 h-5" />,
      shortcut: 'H',
    },
    {
      id: 'select',
      name: 'Pilih & Geser',
      icon: <MousePointer2 className="w-5 h-5" />,
      shortcut: 'V',
    },
    {
      id: 'rectangle',
      name: 'Kotak (Persegi)',
      icon: <Square className="w-5 h-5" />,
      shortcut: 'R',
    },
    {
      id: 'diamond',
      name: 'Diamond (Belah Ketupat)',
      icon: <Diamond className="w-5 h-5" />,
      shortcut: 'D',
    },
    {
      id: 'circle',
      name: 'Lingkaran (Elips)',
      icon: <Circle className="w-5 h-5" />,
      shortcut: 'C',
    },
    {
      id: 'arrow',
      name: 'Panah',
      icon: <MoveRight className="w-5 h-5" />,
      shortcut: 'A',
    },
    {
      id: 'line',
      name: 'Garis',
      icon: <Minus className="w-5 h-5" />,
      shortcut: 'L',
    },
    {
      id: 'pencil',
      name: 'Pensil Sketsa',
      icon: <Pencil className="w-5 h-5" />,
      shortcut: 'P',
    },
    {
      id: 'text',
      name: 'Teks Catatan',
      icon: <Type className="w-5 h-5" />,
      shortcut: 'T',
    },
    {
      id: 'eraser',
      name: 'Penghapus',
      icon: <Eraser className="w-5 h-5" />,
      shortcut: 'E',
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <nav
        aria-label="Drawing Tools Dock"
        className="glass-panel p-2 rounded-2xl flex items-center gap-1 shadow-2xl border border-white/40 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xl"
      >
        {/* Tool Buttons */}
        {tools.map((item) => {
          const isActive = tool === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTool(item.id)}
              title={`${item.name} (${item.shortcut})`}
              className={`relative p-2.5 rounded-xl flex items-center justify-center transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80'
              }`}
            >
              {item.icon}

              {/* Shortcut Tooltip Badge */}
              <span className="absolute -top-8 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-medium tracking-wider opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                {item.name} ({item.shortcut})
              </span>
            </button>
          );
        })}

        {/* Separator Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1.5" />

        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2.5 rounded-xl flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Undo2 className="w-5 h-5" />
        </button>

        {/* Redo Button */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-2.5 rounded-xl flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Redo2 className="w-5 h-5" />
        </button>
      </nav>
    </div>
  );
};
