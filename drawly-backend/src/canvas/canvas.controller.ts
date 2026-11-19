import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CanvasService } from './canvas.service';
import { CreateCanvasDto } from './dto/create-canvas.dto';
import { UpdateCanvasDto } from './dto/update-canvas.dto';

@Controller('api/canvas')
export class CanvasController {
  constructor(private readonly canvasService: CanvasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCanvasDto: CreateCanvasDto) {
    return this.canvasService.create(createCanvasDto);
  }

  @Get(':shareId')
  async findOne(@Param('shareId') shareId: string) {
    return this.canvasService.findByShareId(shareId);
  }

  @Patch(':shareId')
  async update(
    @Param('shareId') shareId: string,
    @Body() updateCanvasDto: UpdateCanvasDto,
  ) {
    return this.canvasService.updateByShareId(shareId, updateCanvasDto);
  }
}

