import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug: solo minúsculas, números y guiones',
  })
  slug: string;

  @IsOptional()
  @IsBoolean()
  includeStarterSlides?: boolean;

  @IsOptional()
  @IsBoolean()
  includeMap?: boolean;
}
