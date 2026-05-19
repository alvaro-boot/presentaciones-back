import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../common/enums';
import { User } from '../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { DuplicateProposalDto } from './dto/duplicate-proposal.dto';
import { UpdateMapDto } from './dto/update-map.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ResolveHtmlDto } from '../files/dto/resolve-html.dto';
import { ProposalsService } from './proposals.service';

@Controller('proposals')
export class ProposalsController {
  constructor(private proposalsService: ProposalsService) {}

  @Get('by-slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.proposalsService.findBySlug(slug);
  }

  /** URLs firmadas frescas para la presentación pública (sin login). */
  @Post('by-slug/:slug/resolve-html')
  resolvePublicHtml(
    @Param('slug') slug: string,
    @Body() dto: ResolveHtmlDto,
  ) {
    return this.proposalsService.resolvePublicHtml(slug, dto.html);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.proposalsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.proposalsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  create(@Body() dto: CreateProposalDto, @CurrentUser() user: User) {
    return this.proposalsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  update(@Param('id') id: string, @Body() dto: UpdateProposalDto) {
    return this.proposalsService.update(id, dto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  publish(@Param('id') id: string) {
    return this.proposalsService.publish(id);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  archive(@Param('id') id: string) {
    return this.proposalsService.archive(id);
  }

  @Patch(':id/map')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  updateMap(@Param('id') id: string, @Body() dto: UpdateMapDto) {
    return this.proposalsService.updateMap(id, dto);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  duplicate(
    @Param('id') id: string,
    @Body() dto: DuplicateProposalDto,
    @CurrentUser() user: User,
  ) {
    return this.proposalsService.duplicate(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.proposalsService.remove(id);
  }
}
