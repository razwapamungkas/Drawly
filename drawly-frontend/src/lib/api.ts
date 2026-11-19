import { CanvasData, CanvasElement } from '@/types/canvas';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CreateCanvasPayload {
  title?: string;
  elements: CanvasElement[];
  appState?: any;
}

export interface CanvasResponse {
  success: boolean;
  message?: string;
  data: {
    id: string;
    shareId: string;
    title: string;
    elements: CanvasElement[];
    appState?: any;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Menyimpan data kanvas ke backend NestJS dan mendapatkan short shareId
 */
export async function saveCanvasToCloud(payload: CreateCanvasPayload): Promise<CanvasResponse> {
  const response = await fetch(`${BACKEND_URL}/api/canvas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Gagal menyimpan kanvas ke server');
  }

  return response.json();
}

/**
 * Mengambil kanvas dari backend NestJS menggunakan shareId
 */
export async function fetchCanvasByShareId(shareId: string): Promise<CanvasResponse> {
  const response = await fetch(`${BACKEND_URL}/api/canvas/${shareId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Kanvas tidak ditemukan atau terjadi kesalahan');
  }

  return response.json();
}

/**
 * Memperbarui data kanvas di cloud jika pengguna pemilik shareId
 */
export async function updateCanvasInCloud(
  shareId: string,
  payload: Partial<CreateCanvasPayload>,
): Promise<CanvasResponse> {
  const response = await fetch(`${BACKEND_URL}/api/canvas/${shareId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Gagal memperbarui kanvas di server');
  }

  return response.json();
}

