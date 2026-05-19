import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../common/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSlideDto } from './dto/create-slide.dto';
import { ReorderSlidesDto } from './dto/reorder-slides.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { SlidesService } from './slides.service';

@Controller('proposals/:proposalId/slides')
@UseGuards(JwtAuthGuard)
export class SlidesController {
  constructor(private slidesService: SlidesService) {}

  @Get()
  findAll(@Param('proposalId') proposalId: string) {
    return this.slidesService.findByProposal(proposalId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  create(
    @Param('proposalId') proposalId: string,
    @Body() dto: CreateSlideDto,
  ) {
    return this.slidesService.create(proposalId, dto);
  }

  @Patch('reorder')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  reorder(
    @Param('proposalId') proposalId: string,
    @Body() dto: ReorderSlidesDto,
  ) {
    return this.slidesService.reorder(proposalId, dto);
  }

  @Get(':slideId')
  findOne(
    @Param('proposalId') proposalId: string,
    @Param('slideId') slideId: string,
  ) {
    return this.slidesService.findOne(proposalId, slideId);
  }

  @Delete(':slideId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  remove(
    @Param('proposalId') proposalId: string,
    @Param('slideId') slideId: string,
  ) {
    return this.slidesService.remove(proposalId, slideId);
  }

  @Put(':slideId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  update(
    @Param('proposalId') proposalId: string,
    @Param('slideId') slideId: string,
    @Body() dto: UpdateSlideDto,
  ) {
    return this.slidesService.update(proposalId, slideId, dto);
  }
}
