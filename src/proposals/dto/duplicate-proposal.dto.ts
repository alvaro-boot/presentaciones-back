import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class DuplicateProposalDto {
  @IsString()
  @MinLength(2)
  clientName: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @IsOptional()
  @IsString()
  title?: string;
}
