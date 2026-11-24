'use client';

import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Globe } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareId: string | null;
  isLoading?: boolean;
  error?: string | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareId,
  isLoading = false,
  error,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl =
    typeof window !== 'undefined' && shareId
      ? `${window.location.origin}/c/${shareId}`
      : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md glass-panel bg-white/95 dark:bg-zinc-900/95 rounded-3xl p-6 shadow-2xl border border-white/60 dark:border-zinc-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              Bagikan Kanvas
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Link publik siap dibagikan ke siapa saja tanpa login.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-zinc-300">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">
              Menyimpan data kanvas ke cloud...
            </span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Success URL State */}
        {!isLoading && shareId && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-xs font-mono px-3 py-1.5 text-slate-700 dark:text-zinc-200 w-full outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-50'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Siapa pun yang memiliki link dapat melihat & mengedit.</span>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Buka</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

