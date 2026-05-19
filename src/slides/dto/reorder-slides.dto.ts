import { IsArray, IsUUID } from 'class-validator';

export class ReorderSlidesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  slideIds: string[];
}
