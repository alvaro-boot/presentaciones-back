import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProposalStatus } from '../common/enums';
import { Proposal } from '../entities/proposal.entity';
import { Slide } from '../entities/slide.entity';
import { User } from '../entities/user.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { DuplicateProposalDto } from './dto/duplicate-proposal.dto';
import { UpdateMapDto } from './dto/update-map.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { FilesService } from '../files/files.service';
import { toStorageRef } from '../files/storage.constants';

const SYSTEM_TEMPLATE_SLUG = 'plantilla-maestra';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private proposalsRepo: Repository<Proposal>,
    @InjectRepository(Slide)
    private slidesRepo: Repository<Slide>,
    private filesService: FilesService,
  ) {}

  async resolvePublicHtml(slug: string, html: string) {
    const proposal = await this.proposalsRepo.findOne({
      where: { slug, status: ProposalStatus.PUBLISHED, isTemplate: false },
    });
    if (!proposal) {
      throw new NotFoundException('Propuesta no publicada o no existe');
    }
    const resolved = await this.filesService.resolveHtmlStorageUrls(html);
    return { html: resolved };
  }

  findAll() {
    return this.proposalsRepo.find({
      where: { isTemplate: false },
      order: { updatedAt: 'DESC' },
      relations: { slides: true },
    });
  }

  async findOne(id: string) {
    const proposal = await this.proposalsRepo.findOne({
      where: { id },
      relations: { slides: true },
    });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada');
    proposal.slides.sort((a, b) => a.order - b.order);
    return proposal;
  }

  async findBySlug(slug: string) {
    const proposal = await this.proposalsRepo.findOne({
      where: { slug, status: ProposalStatus.PUBLISHED, isTemplate: false },
      relations: { slides: true },
    });
    if (!proposal) throw new NotFoundException('Propuesta no publicada o no existe');
    proposal.slides = proposal.slides
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);
    return proposal;
  }

  async create(dto: CreateProposalDto, user: User) {
    const exists = await this.proposalsRepo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('El slug ya existe');

    let slides: Partial<Slide>[] = [];
    let mapConfig: Record<string, unknown> | null = null;
    let themeConfig: Record<string, string> | null = null;

    if (dto.templateId) {
      const template = await this.proposalsRepo.findOne({
        where: { id: dto.templateId, isTemplate: true },
        relations: { slides: true },
      });
      if (!template) throw new NotFoundException('Plantilla no encontrada');
      template.slides.sort((a, b) => a.order - b.order);
      slides = template.slides.map((s) => ({
        order: s.order,
        key: s.key,
        title: s.title,
        html: s.html,
        css: s.css,
        grapesData: s.grapesData,
        scripts: s.scripts,
        enabled: s.enabled,
      }));
      mapConfig = await this.cloneMapConfigForNewClient(template.mapConfig);
      themeConfig = template.themeConfig
        ? JSON.parse(JSON.stringify(template.themeConfig))
        : null;
    }

    const proposal = this.proposalsRepo.create({
      slug: dto.slug,
      clientName: dto.clientName,
      title: dto.title,
      templateId: dto.templateId ?? null,
      mapConfig,
      themeConfig,
      createdById: user.id,
      status: ProposalStatus.DRAFT,
      isTemplate: false,
      slides: slides as Slide[],
    });

    return this.proposalsRepo.save(proposal);
  }

  async update(id: string, dto: UpdateProposalDto) {
    const proposal = await this.findOne(id);
    if (dto.slug && dto.slug !== proposal.slug) {
      const exists = await this.proposalsRepo.findOne({ where: { slug: dto.slug } });
      if (exists) throw new ConflictException('El slug ya existe');
    }
    Object.assign(proposal, dto);
    return this.proposalsRepo.save(proposal);
  }

  async publish(id: string) {
    return this.update(id, { status: ProposalStatus.PUBLISHED });
  }

  async archive(id: string) {
    return this.update(id, { status: ProposalStatus.ARCHIVED });
  }

  async duplicate(id: string, dto: DuplicateProposalDto, user: User) {
    const source = await this.findOne(id);
    const exists = await this.proposalsRepo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('El slug ya existe');

    const copy = this.proposalsRepo.create({
      slug: dto.slug,
      clientName: dto.clientName,
      title: dto.title ?? `${source.title} — ${dto.clientName}`,
      status: ProposalStatus.DRAFT,
      isTemplate: false,
      templateId: source.id,
      mapConfig: this.cloneMapConfigForProposal(source.mapConfig),
      themeConfig: source.themeConfig
        ? JSON.parse(JSON.stringify(source.themeConfig))
        : null,
      createdById: user.id,
    });
    const saved = await this.proposalsRepo.save(copy);

    const slideCopies = source.slides.map((s) =>
      this.slidesRepo.create({
        proposalId: saved.id,
        order: s.order,
        key: s.key,
        title: s.title,
        html: s.html,
        css: s.css,
        grapesData: s.grapesData,
        scripts: s.scripts,
        enabled: s.enabled,
      }),
    );
    await this.slidesRepo.save(slideCopies);

    return this.findOne(saved.id);
  }

  private mapStoragePath(proposalId: string): string {
    return `${proposalId}/mapa/config.json`;
  }

  /** Clona mapConfig sin metadatos de storage de otra propuesta. */
  private cloneMapConfigForProposal(
    source: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    if (!source) return null;
    const clone = JSON.parse(JSON.stringify(source)) as Record<string, unknown>;
    delete clone._storage;
    return clone;
  }

  /** Copia el mapa de la plantilla maestra si la fuente no tiene config propia. */
  private async cloneMapConfigForNewClient(
    source: Record<string, unknown> | null | undefined,
  ): Promise<Record<string, unknown> | null> {
    const fromSource = this.cloneMapConfigForProposal(source);
    if (fromSource) return fromSource;
    const master = await this.proposalsRepo.findOne({
      where: { slug: SYSTEM_TEMPLATE_SLUG, isTemplate: true },
    });
    return this.cloneMapConfigForProposal(master?.mapConfig);
  }

  /** Persiste map_config solo en la fila de esta propuesta (columna JSON en BD). */
  async updateMap(id: string, dto: UpdateMapDto) {
    const proposal = await this.findOne(id);
    const mapConfig: Record<string, unknown> = { ...dto.mapConfig };
    const storagePath = this.mapStoragePath(id);
    let storageRef: string | null = null;

    if (this.filesService.isStorageConfigured()) {
      try {
        await this.filesService.uploadJson(storagePath, mapConfig);
        storageRef = toStorageRef(storagePath);
        mapConfig._storage = {
          path: storagePath,
          ref: storageRef,
          updatedAt: new Date().toISOString(),
        };
      } catch (err) {
        console.warn('[updateMap] No se pudo subir mapa a Supabase:', err);
      }
    }

    proposal.mapConfig = mapConfig;
    await this.proposalsRepo.save(proposal);
    return {
      mapConfig: proposal.mapConfig,
      storagePath: storageRef ? storagePath : null,
      storageRef,
    };
  }

  async remove(id: string) {
    const proposal = await this.findOne(id);
    await this.proposalsRepo.remove(proposal);
    return { deleted: true };
  }
}
