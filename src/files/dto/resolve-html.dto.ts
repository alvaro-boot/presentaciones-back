import { IsString, MinLength } from 'class-validator';

export class ResolveHtmlDto {
  @IsString()
  @MinLength(1)
  html: string;
}
