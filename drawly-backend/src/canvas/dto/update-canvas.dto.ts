import { IsOptional, IsString } from 'class-validator';

export class UpdateCanvasDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  elements?: any;

  @IsOptional()
  appState?: any;
}

