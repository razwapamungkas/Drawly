'use client';

import React, { useState } from 'react';
import {
  Trash2,
  Slash,
  Palette,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CanvasElement, FillStyle, StrokeStyle, ToolType } from '@/types/canvas';

interface PropertiesPanelProps {
  selectedElement: CanvasElement | null;
  onUpdateElement: (updatedProps: Partial<CanvasElement>) => void;
  onDeleteElement: () => void;
  // Default values saat tidak ada elemen yang dipilih
  defaultStrokeColor?: string;
  defaultFillColor?: string;
  defaultFillStyle?: FillStyle;
  defaultStrokeStyle?: StrokeStyle;
  defaultStrokeWidth?: number;
  defaultRoughness?: number;
  defaultOpacity?: number;
  activeTool?: ToolType;
}

const STROKE_COLORS = [
  { name: 'Slate', value: '#1e293b' },
  { name: 'Red', value: '#e11d48' },
  { name: 'Green', value: '#059669' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Orange', value: '#d97706' },
  { name: 'Purple', value: '#7c3aed' },
];

const FILL_COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Pastel Slate', value: '#e2e8f0' },
  { name: 'Pastel Red', value: '#fecdd3' },
  { name: 'Pastel Green', value: '#a7f3d0' },
  { name: 'Pastel Blue', value: '#bae6fd' },
  { name: 'Pastel Amber', value: '#fde68a' },
  { name: 'Pastel Violet', value: '#ddd6fe' },
];

const STROKE_WIDTHS = [
  { label: 'Tipis', value: 1.5, barH: 'h-0.5' },
  { label: 'Sedang', value: 2.5, barH: 'h-1' },
  { label: 'Tebal', value: 4.5, barH: 'h-1.5' },
];

const STROKE_STYLES: {
  label: string;
  sub: string;
  value: StrokeStyle;
  dashClass: string;
}[] = [
  { label: 'Lurus', sub: 'Solid', value: 'solid', dashClass: 'border-solid' },
  { label: 'Putus-putus', sub: 'Dashed', value: 'dashed', dashClass: 'border-dashed' },
  { label: 'Titik-titik', sub: 'Dotted', value: 'dotted', dashClass: 'border-dotted' },
];

const FILL_STYLES: { label: string; value: FillStyle; desc: string }[] = [
  { label: 'Arsir', value: 'hachure', desc: 'Garis Arsir' },
  { label: 'Silang', value: 'cross-hatch', desc: 'Arsir Silang' },
  { label: 'Penuh', value: 'solid', desc: 'Warna Solid' },
];

const ROUGHNESS_LEVELS = [
  { label: 'Arsitek', value: 0 },
  { label: 'Sketsa', value: 1.2 },
  { label: 'Kartun', value: 2.2 },
];

const FONT_SIZES = [
  { label: 'S', value: 18 },
  { label: 'M', value: 24 },
  { label: 'L', value: 32 },
  { label: 'XL', value: 42 },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  defaultStrokeColor = '#1e293b',
  defaultFillColor = 'transparent',
  defaultFillStyle = 'solid',
  defaultStrokeStyle = 'solid',
  defaultStrokeWidth = 2,
  defaultRoughness = 1.2,
  defaultOpacity = 100,
  activeTool = 'select',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Nilai aktif diambil dari elemen yang dipilih, atau fallback ke default
  const currentStroke = selectedElement?.stroke || defaultStrokeColor;
  const currentFill = selectedElement?.fill || defaultFillColor;
  const currentFillStyle = selectedElement?.fillStyle || defaultFillStyle;
  const currentWidth = selectedElement?.strokeWidth || defaultStrokeWidth;
  const currentStrokeStyle = selectedElement?.strokeStyle || defaultStrokeStyle;
  const currentRoughness = selectedElement?.roughness ?? defaultRoughness;
  const currentOpacity = selectedElement?.opacity ?? defaultOpacity;
  const currentFontSize = selectedElement?.fontSize || 24;
  const currentTextAlign = selectedElement?.textAlign || 'left';

  const isText = selectedElement?.type === 'text' || (!selectedElement && activeTool === 'text');

  const isShape = selectedElement
    ? selectedElement.type === 'rectangle' ||
      selectedElement.type === 'diamond' ||
      selectedElement.type === 'circle'
    : activeTool === 'rectangle' ||
      activeTool === 'diamond' ||
      activeTool === 'circle' ||
      activeTool === 'select';

  // Jika di-minimize dan tidak ada elemen yang dipilih, tampilkan tombol pill kecil
  if (isCollapsed && !selectedElement) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed top-20 left-5 z-30 glass-panel px-3.5 py-2 rounded-2xl shadow-xl border border-white/60 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:scale-105 transition-all"
        title="Buka Pengaturan Gaya Gambar"
      >
        <Palette className="w-4 h-4 text-blue-600" />
        <span>Gaya Garis & Warna</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Element Properties"
      className="fixed top-20 left-5 z-30 w-72 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar glass-panel rounded-2xl p-4 shadow-2xl border border-white/50 dark:border-zinc-800 animate-fade-in flex flex-col gap-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl"
    >
      {/* Header Inspector */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
          <Palette className="w-4 h-4 text-blue-600" />
          <span>{selectedElement ? 'Pengaturan Bentuk' : 'Gaya Gambar (Default)'}</span>
        </div>

        <div className="flex items-center gap-1">
          {selectedElement ? (
            <button
              onClick={onDeleteElement}
              title="Hapus Elemen (Delete / Backspace)"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsCollapsed(true)}
              title="Sembunyikan Panel"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Stroke Color */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
          {isText ? 'Warna Teks' : 'Warna Garis'}
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {STROKE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdateElement({ stroke: c.value })}
              style={{ backgroundColor: c.value }}
              title={c.name}
              className={`w-6 h-6 rounded-full transition-transform ${
                currentStroke.toLowerCase() === c.value.toLowerCase()
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

      {/* 2. Gaya Garis (Solid / Lurus, Putus-putus / Dashed, Titik-titik / Dotted) - SELALU TERSEDIA */}
      {!isText && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
              Gaya Garis
            </label>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              {currentStrokeStyle === 'solid'
                ? 'Garis Lurus'
                : currentStrokeStyle === 'dashed'
                ? 'Putus-putus'
                : 'Titik-titik'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
            {STROKE_STYLES.map((ss) => {
              const isSelected = currentStrokeStyle === ss.value;
              return (
                <button
                  key={ss.value}
                  onClick={() => onUpdateElement({ strokeStyle: ss.value })}
                  title={`Pilih Garis ${ss.label} (${ss.sub})`}
                  className={`py-2 px-1 rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold ring-1 ring-blue-500/40'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`w-7 border-t-2 ${ss.dashClass} border-current my-0.5`}
                  />
                  <span className="text-[11px]">{ss.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Fill Color (Khusus Bentuk Persegi, Diamond, Lingkaran) */}
      {isShape && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
            Warna Isian (Background)
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {FILL_COLORS.map((c) => {
              const isSelected =
                currentFill.toLowerCase() === c.value.toLowerCase();
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
            {/* Custom Fill Color Picker */}
            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-zinc-700 cursor-pointer">
              <input
                type="color"
                value={currentFill === 'transparent' ? '#ffffff' : currentFill}
                onChange={(e) => onUpdateElement({ fill: e.target.value })}
                className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                title="Pilih warna bebas isian"
              />
              <div
                className="w-full h-full"
                style={{
                  backgroundColor:
                    currentFill === 'transparent' ? '#ffffff' : currentFill,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Fill Style (Arsir / Hachure, Silang, Solid) */}
      {isShape && currentFill !== 'transparent' && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
            Pola Isian (Fill Style)
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
            {FILL_STYLES.map((fs) => {
              const isSelected = currentFillStyle === fs.value;
              return (
                <button
                  key={fs.value}
                  onClick={() => onUpdateElement({ fillStyle: fs.value })}
                  title={fs.desc}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  {fs.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Stroke Width */}
      {!isText && (
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
                  <div className={`w-5 ${sw.barH} rounded-full bg-current`} />
                  <span>{sw.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Roughness / Sloppiness */}
      {!isText && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1">
            <Sliders className="w-3 h-3" />
            <span>Karakter Garis (Sloppiness)</span>
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

      {/* 7. Text Properties (Font Size & Align) */}
      {isText && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
              Ukuran Huruf
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
              {FONT_SIZES.map((fs) => {
                const isSelected = currentFontSize === fs.value;
                return (
                  <button
                    key={fs.label}
                    onClick={() => onUpdateElement({ fontSize: fs.value })}
                    className={`py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                    }`}
                  >
                    {fs.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
              Perataan Teks
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
              {[
                { align: 'left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                { align: 'center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                { align: 'right', icon: <AlignRight className="w-3.5 h-3.5" /> },
              ].map((item) => (
                <button
                  key={item.align}
                  onClick={() =>
                    onUpdateElement({ textAlign: item.align as 'left' | 'center' | 'right' })
                  }
                  className={`py-1.5 flex items-center justify-center rounded-lg text-xs transition-all ${
                    currentTextAlign === item.align
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 8. Opacity Slider (0 - 100%) */}
      <div className="flex flex-col gap-2 border-t border-slate-200/80 dark:border-zinc-800 pt-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>Transparansi (Opacity)</span>
          </label>
          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-zinc-300">
            {currentOpacity}%
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={currentOpacity}
          onChange={(e) => onUpdateElement({ opacity: parseInt(e.target.value, 10) })}
          className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg"
        />
      </div>

      {/* Free & Unlimited Badge */}
      <div className="mt-1 p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2 text-[10px] text-blue-700 dark:text-blue-300">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>Drawly Studio — 100% Gratis & Fitur Bebas Tanpa Batas</span>
      </div>
    </aside>
  );
};
