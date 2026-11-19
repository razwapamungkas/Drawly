import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCanvasDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsNotEmpty({ message: 'Elements canvas tidak boleh kosong' })
  elements: any;

  @IsOptional()
  appState?: any;
}

