import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class SignedUrlsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  paths: string[];
}
