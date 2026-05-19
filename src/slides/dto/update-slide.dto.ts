import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSlideDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsString()
  css?: string;

  @IsOptional()
  @IsObject()
  grapesData?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  scripts?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
