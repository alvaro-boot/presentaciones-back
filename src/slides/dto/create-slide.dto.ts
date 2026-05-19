import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSlideDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  @Matches(/^[a-z0-9_]+(-[a-z0-9_]+)*$/)
  key: string;

  @IsOptional()
  @IsString()
  template?: 'blank' | 'section' | 'portada';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
