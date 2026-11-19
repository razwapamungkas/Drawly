'use client';

import React from 'react';
import { Trash2, Slash, Palette, Sliders } from 'lucide-react';
import { CanvasElement } from '@/types/canvas';

interface PropertiesPanelProps {
  selectedElement: CanvasElement | null;
  onUpdateElement: (updatedProps: Partial<CanvasElement>) => void;
  onDeleteElement: () => void;
}

const STROKE_COLORS = [
  { name: 'Slate', value: '#1e293b' },
  { name: 'Crimson', value: '#e11d48' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Cyan', value: '#0284c7' },
];

const FILL_COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Soft Slate', value: '#e2e8f0' },
  { name: 'Soft Rose', value: '#fecdd3' },
  { name: 'Soft Emerald', value: '#a7f3d0' },
  { name: 'Soft Amber', value: '#fde68a' },
  { name: 'Soft Violet', value: '#ddd6fe' },
  { name: 'Soft Cyan', value: '#bae6fd' },
];

const STROKE_WIDTHS = [
  { label: 'Tipis', value: 1.5, barH: 'h-0.5' },
  { label: 'Sedang', value: 2.5, barH: 'h-1' },
  { label: 'Tebal', value: 4.5, barH: 'h-1.5' },
];

const ROUGHNESS_LEVELS = [
  { label: 'Arsitek', value: 0 },
  { label: 'Sketsa', value: 1.2 },
  { label: 'Bebas', value: 2.2 },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
}) => {
  // Hanya muncul jika ada elemen yang aktif dipilih
  if (!selectedElement) return null;

  const currentStroke = selectedElement.stroke || '#1e293b';
  const currentFill = selectedElement.fill || 'transparent';
  const currentWidth = selectedElement.strokeWidth || 2;
  const currentRoughness = selectedElement.roughness ?? 1.2;

  return (
    <aside
      aria-label="Element Properties"
      className="fixed top-20 left-5 z-30 w-64 glass-panel rounded-2xl p-4 shadow-2xl border border-white/50 dark:border-zinc-800 animate-fade-in flex flex-col gap-4 bg-white/85 dark:bg-zinc-900/90 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
          <Palette className="w-4 h-4 text-blue-600" />
          <span>Pengaturan Bentuk</span>
        </div>
        <button
          onClick={onDeleteElement}
          title="Hapus Elemen (Delete)"
          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Stroke Color */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
          Warna Garis (Stroke)
        </label>
        <div className="flex items-center gap-2">
          {STROKE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdateElement({ stroke: c.value })}
              style={{ backgroundColor: c.value }}
              title={c.name}
              className={`w-6 h-6 rounded-full transition-transform ${
                currentStroke === c.value
                  ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 shadow-sm'
                  : 'hover:scale-105 opacity-90 hover:opacity-100'
              }`}
            />
          ))}
          {/* Custom color picker */}
          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-zinc-700 cursor-pointer">
            <input
              type="color"
              value={currentStroke}
              onChange={(e) => onUpdateElement({ stroke: e.target.value })}
              className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
              title="Pilih warna bebas"
            />
            <div
              className="w-full h-full"
              style={{ backgroundColor: currentStroke }}
            />
          </div>
        </div>
      </div>

      {/* 2. Fill Color (Hanya untuk bentuk non-garis) */}
      {selectedElement.type !== 'line' &&
        selectedElement.type !== 'arrow' &&
        selectedElement.type !== 'pencil' &&
        selectedElement.type !== 'text' && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
              Warna Isian (Fill)
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {FILL_COLORS.map((c) => {
                const isSelected = currentFill === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => onUpdateElement({ fill: c.value })}
                    title={c.name}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 shadow-sm border-blue-500'
                        : 'border-slate-300 dark:border-zinc-700 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor:
                        c.value === 'transparent' ? 'transparent' : c.value,
                    }}
                  >
                    {c.value === 'transparent' && (
                      <Slash className="w-3.5 h-3.5 text-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* 3. Stroke Width */}
      {selectedElement.type !== 'text' && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
            Ketebalan Garis
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
            {STROKE_WIDTHS.map((sw) => {
              const isSelected = Math.abs(currentWidth - sw.value) < 0.6;
              return (
                <button
                  key={sw.label}
                  onClick={() => onUpdateElement({ strokeWidth: sw.value })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`w-5 ${sw.barH} rounded-full bg-current`}
                  />
                  <span>{sw.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Roughness / Hand-drawn Style */}
      {selectedElement.type !== 'text' && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1">
            <Sliders className="w-3 h-3" />
            <span>Gaya Coretan</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
            {ROUGHNESS_LEVELS.map((rl) => {
              const isSelected = Math.abs(currentRoughness - rl.value) < 0.5;
              return (
                <button
                  key={rl.label}
                  onClick={() => onUpdateElement({ roughness: rl.value })}
                  className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  {rl.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

