import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drawly — Sketch, note, and share ideas effortlessly',
  description:
    'Papan tulis virtual interaktif tanpa login dengan gaya coretan tangan bebas, ekspor multi-format (PNG, SVG, JSON), dan sinkronisasi link cepat.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}

