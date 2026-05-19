import { IsObject } from 'class-validator';

export class UpdateMapDto {
  @IsObject()
  mapConfig: Record<string, unknown>;
}
