import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Slide } from '../entities/slide.entity';
import { CreateSlideDto } from './dto/create-slide.dto';
import { ReorderSlidesDto } from './dto/reorder-slides.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { sanitizeHtmlForStorage } from '../files/storage.constants';

const SLIDE_TEMPLATES: Record<string, { html: string; css: string | null }> = {
  blank: {
    html: `<div class="slide flex flex-col justify-center p-8 min-h-[80vh]">
      <h1 class="text-3xl font-bold text-white m-0">Nueva diapositiva</h1>
      <p class="text-slate-300 mt-4 m-0">Edite textos e imágenes desde el panel visual.</p>
    </motion.div>`.replace(/motion\./g, ''),
    css: null,
  },
  portada: {
    html: `<motion.div class="slide cover-slide flex flex-col justify-between p-8 min-h-[80vh]">
      <header><span class="text-amber-400 text-sm font-semibold">COOTRAVIR C.T.A.</span></header>
      <main class="flex-1 flex flex-col justify-center">
        <h1 class="cover-main-title text-4xl font-bold text-white">Título de la propuesta</h1>
        <p class="cover-sub mt-4 text-slate-300">Presentado a: <span class="cover-client-name text-amber-300">NOMBRE DEL CLIENTE</span></p>
      </main>
    </motion.div>`.replace(/motion\./g, ''),
    css: null,
  },
  section: {
    html: `<motion.div class="slide soc-slide deck-tech flex flex-col min-h-[80vh]">
      <header class="soc-header"><h1>Título de sección</h1>
        <div class="soc-header-brand"><span>COOTRAVIR C.T.A.</span></div>
      </header>
      <div class="soc-body p-6"><p class="text-slate-300">Contenido de la sección.</p></div>
    </motion.div>`.replace(/motion\./g, ''),
    css: null,
  },
};

@Injectable()
export class SlidesService {
  constructor(
    @InjectRepository(Slide) private slidesRepo: Repository<Slide>,
  ) {}

  async findByProposal(proposalId: string) {
    return this.slidesRepo.find({
      where: { proposalId },
      order: { order: 'ASC' },
    });
  }

  async findOne(proposalId: string, slideId: string) {
    const slide = await this.slidesRepo.findOne({
      where: { id: slideId, proposalId },
    });
    if (!slide) throw new NotFoundException('Diapositiva no encontrada');
    return slide;
  }

  async update(proposalId: string, slideId: string, dto: UpdateSlideDto) {
    const slide = await this.findOne(proposalId, slideId);
    if (dto.html !== undefined) {
      dto = { ...dto, html: sanitizeHtmlForStorage(dto.html) };
    }
    Object.assign(slide, dto);
    return this.slidesRepo.save(slide);
  }

  async reorder(proposalId: string, dto: ReorderSlidesDto) {
    const slides = await this.findByProposal(proposalId);
    const map = new Map(slides.map((s) => [s.id, s]));
    for (let i = 0; i < dto.slideIds.length; i++) {
      const slide = map.get(dto.slideIds[i]);
      if (slide) slide.order = i;
    }
    await this.slidesRepo.save([...map.values()]);
    return this.findByProposal(proposalId);
  }

  async create(proposalId: string, dto: CreateSlideDto) {
    const existing = await this.slidesRepo.findOne({
      where: { proposalId, key: dto.key },
    });
    if (existing) {
      throw new ConflictException('Ya existe una diapositiva con esa clave');
    }
    const slides = await this.findByProposal(proposalId);
    const tpl = SLIDE_TEMPLATES[dto.template ?? 'blank'] ?? SLIDE_TEMPLATES.blank;
    const slide = this.slidesRepo.create({
      proposalId,
      order: slides.length,
      key: dto.key,
      title: dto.title,
      html: tpl.html,
      css: tpl.css,
      enabled: dto.enabled ?? true,
    });
    return this.slidesRepo.save(slide);
  }

  async remove(proposalId: string, slideId: string) {
    const slide = await this.findOne(proposalId, slideId);
    await this.slidesRepo.remove(slide);
    const rest = await this.findByProposal(proposalId);
    for (let i = 0; i < rest.length; i++) {
      rest[i].order = i;
    }
    await this.slidesRepo.save(rest);
    return { deleted: true };
  }
}
