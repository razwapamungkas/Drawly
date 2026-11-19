'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Share2,
  Trash2,
  CheckCircle2,
  FileJson,
  Image as ImageIcon,
  Code,
  Edit2,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  title: string;
  setTitle: (title: string) => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onClearCanvas: () => void;
  onShare: () => void;
  isSharing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  setTitle,
  onExportPng,
  onExportSvg,
  onExportJson,
  onClearCanvas,
  onShare,
  isSharing = false,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDownloadOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 px-4 flex items-center justify-between pointer-events-none">
      {/* Bagian Kiri: Logo, Title, Auto-save Badge */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Brand Logo */}
        <div className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2.5 shadow-sm hover:shadow transition-all">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              Drawly
            </span>
          </div>
        </div>

        {/* Editable Title */}
        <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center gap-2 max-w-[260px] sm:max-w-[340px]">
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false);
              }}
              autoFocus
              className="bg-transparent text-sm font-medium text-slate-800 dark:text-zinc-200 outline-none w-full"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group text-left truncate"
              title="Klik untuk mengganti judul kanvas"
            >
              <span className="truncate">{title}</span>
              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity flex-shrink-0" />
            </button>
          )}
        </div>

        {/* Badge Status Auto-save */}
        <div className="hidden md:flex glass-panel px-2.5 py-1 rounded-full items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tersimpan Otomatis</span>
        </div>
      </div>

      {/* Bagian Kanan: Download Dropdown, Clear, & Share Button */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* Dropdown Download */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDownloadOpen((prev) => !prev)}
            className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {isDownloadOpen && (
            <div className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl p-1.5 shadow-2xl border border-slate-200/80 dark:border-zinc-800 animate-fade-in flex flex-col gap-1 z-50">
              <button
                onClick={() => {
                  setIsDownloadOpen(false);
                  onExportPng();
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors text-left"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span>Export PNG</span>
                  <span className="text-[10px] text-slate-400 font-normal">Gambar resolusi tinggi</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsDownloadOpen(false);
                  onExportSvg();
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors text-left"
              >
                <Code className="w-4 h-4 text-indigo-600" />
                <div className="flex flex-col">
                  <span>Export SVG</span>
                  <span className="text-[10px] text-slate-400 font-normal">Vektor skalabel</span>
                </div>
              </button>

              <div className="h-px bg-slate-200/80 dark:bg-zinc-800 my-0.5" />

              <button
                onClick={() => {
                  setIsDownloadOpen(false);
                  onExportJson();
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors text-left"
              >
                <FileJson className="w-4 h-4 text-amber-600" />
                <div className="flex flex-col">
                  <span>Save Project (.drawly)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Bisa dibuka & diedit kembali</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Clear Canvas Button */}
        <button
          onClick={onClearCanvas}
          title="Bersihkan Kanvas"
          className="glass-panel p-2.5 rounded-2xl text-slate-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/30 transition-all shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Share Link Button */}
        <button
          onClick={onShare}
          disabled={isSharing}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
        >
          <Share2 className="w-4 h-4" />
          <span>{isSharing ? 'Menyimpan...' : 'Share Link'}</span>
        </button>
      </div>
    </header>
  );
};

