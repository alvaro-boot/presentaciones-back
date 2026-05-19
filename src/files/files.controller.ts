import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '../common/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ResolveHtmlDto } from './dto/resolve-html.dto';
import { SignedUrlsDto } from './dto/signed-urls.dto';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload/:proposalId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Param('proposalId') proposalId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.upload(file, proposalId);
  }

  /** URL firmada nueva para un archivo (no reutilizar URLs viejas). */
  @Get('signed-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  signedUrl(@Query('path') path: string) {
    return this.filesService.createSignedUrl(path);
  }

  @Post('signed-urls')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  signedUrls(@Body() dto: SignedUrlsDto) {
    return this.filesService.createSignedUrls(dto.paths);
  }

  /** HTML con __STORAGE__:ruta → URLs firmadas vigentes (~1 h). */
  @Post('resolve-html')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  async resolveHtml(@Body() dto: ResolveHtmlDto) {
    const html = await this.filesService.resolveHtmlStorageUrls(dto.html);
    return { html };
  }

  @Delete(':assetId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('assetId') assetId: string) {
    return this.filesService.remove(assetId);
  }
}
