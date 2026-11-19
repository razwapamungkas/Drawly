import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCanvasDto } from './dto/create-canvas.dto';
import { UpdateCanvasDto } from './dto/update-canvas.dto';
import { customAlphabet } from 'nanoid';

// Slug nanoid URL-friendly (8 karakter alfabet & angka lowercase)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

@Injectable()
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menyimpan kanvas baru dan mengembalikan shareId pendek
   */
  async create(createCanvasDto: CreateCanvasDto) {
    try {
      const shareId = nanoid();
      const canvas = await this.prisma.canvas.create({
        data: {
          shareId,
          title: createCanvasDto.title?.trim() || 'Untitled Canvas - Drawly',
          elements: createCanvasDto.elements,
          appState: createCanvasDto.appState ?? null,
        },
      });

      return {
        success: true,
        message: 'Canvas berhasil disimpan',
        data: {
          id: canvas.id,
          shareId: canvas.shareId,
          title: canvas.title,
          createdAt: canvas.createdAt,
          updatedAt: canvas.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('Gagal membuat canvas:', error);
      throw new InternalServerErrorException(
        error?.message || 'Terjadi kesalahan saat menyimpan canvas ke database',
      );
    }
  }

  /**
   * Mengambil data kanvas berdasarkan shareId publik
   */
  async findByShareId(shareId: string) {
    const canvas = await this.prisma.canvas.findUnique({
      where: { shareId },
    });

    if (!canvas) {
      throw new NotFoundException(`Canvas dengan shareId "${shareId}" tidak ditemukan`);
    }

    return {
      success: true,
      data: canvas,
    };
  }

  /**
   * Memperbarui kanvas yang sudah ada
   */
  async updateByShareId(shareId: string, updateCanvasDto: UpdateCanvasDto) {
    // Pastikan kanvas ada
    await this.findByShareId(shareId);

    try {
      const updated = await this.prisma.canvas.update({
        where: { shareId },
        data: {
          ...(updateCanvasDto.title && { title: updateCanvasDto.title.trim() }),
          ...(updateCanvasDto.elements !== undefined && { elements: updateCanvasDto.elements }),
          ...(updateCanvasDto.appState !== undefined && { appState: updateCanvasDto.appState }),
        },
      });

      return {
        success: true,
        message: 'Canvas berhasil diperbarui',
        data: updated,
      };
    } catch (error) {
      this.logger.error(`Gagal mengupdate canvas "${shareId}":`, error);
      throw new InternalServerErrorException(
        error?.message || 'Terjadi kesalahan saat memperbarui canvas',
      );
    }
  }
}

