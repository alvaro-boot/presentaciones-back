import { IsEnum, IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ProposalStatus } from '../../common/enums';

export class UpdateProposalDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  @IsOptional()
  @IsObject()
  themeConfig?: Record<string, string>;
}
