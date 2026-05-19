import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  @MinLength(2)
  clientName: string;

  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug debe ser kebab-case (ej: tacuara-club-2026)',
  })
  slug: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}
