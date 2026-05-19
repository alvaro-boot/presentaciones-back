import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { ProposalStatus } from '../common/enums';
import { Proposal } from '../entities/proposal.entity';
import { Slide } from '../entities/slide.entity';
import { User } from '../entities/user.entity';
import { LEGACY_SLIDES, SLIDE_SCRIPTS } from './system-slides.config';
import { CreateTemplateDto } from './dto/create-template.dto';

const SYSTEM_TEMPLATE_SLUG = 'plantilla-maestra';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Proposal)
    private proposalsRepo: Repository<Proposal>,
    @InjectRepository(Slide)
    private slidesRepo: Repository<Slide>,
  ) {}

  /** Ruta empaquetada con el backend (assets/system-template). */
  private resolveSystemAssetsPath(): string {
    const candidates = [
      path.join(process.cwd(), 'assets', 'system-template'),
      path.join(__dirname, '..', '..', 'assets', 'system-template'),
      path.join(__dirname, '..', '..', '..', 'assets', 'system-template'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(path.join(p, 'html'))) return p;
    }
    throw new Error(
      'No se encontraron assets del sistema. Ejecute npm run build en el backend.',
    );
  }

  private extractBodyContent(html: string): string {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return bodyMatch ? bodyMatch[1].trim() : html;
  }

  private extractStyles(html: string): string | null {
    const styles: string[] = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let m: RegExpExecArray | null;
    while ((m = styleRegex.exec(html)) !== null) {
      styles.push(m[1].trim());
    }
    return styles.length ? styles.join('\n') : null;
  }

  private rewriteAssetPaths(html: string): string {
    return html
      .replace(/src="images\//g, 'src="/legacy/images/')
      .replace(/data-cert-src="images\//g, 'data-cert-src="/legacy/images/')
      .replace(/href="slides-theme\.css"/g, 'href="/legacy/slides-theme.css"')
      .replace(/src="page_4-3d\.js"/g, 'src="/legacy/page_4-3d.js"')
      .replace(/src="js\//g, 'src="/legacy/js/')
      .replace(/fetch\(['"]data\//g, "fetch('/legacy/data/");
  }

  private loadMapConfig(assetsPath: string): Record<string, unknown> | null {
    try {
      const configPath = path.join(assetsPath, 'data', 'config-mapa.json');
      const puntosPath = path.join(assetsPath, 'data', 'puntos-pereira.json');
      const rutasPath = path.join(assetsPath, 'data', 'rutas-supervision.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const puntos = JSON.parse(fs.readFileSync(puntosPath, 'utf-8'));
      const rutas = JSON.parse(fs.readFileSync(rutasPath, 'utf-8'));
      return {
        estilos: config.estilos ?? config,
        puntos,
        rutas,
        supervision: config.supervision,
      };
    } catch {
      return null;
    }
  }

  findAll() {
    return this.proposalsRepo.find({
      where: { isTemplate: true },
      order: { updatedAt: 'DESC' },
      relations: { slides: true },
    });
  }

  async findOne(id: string) {
    const t = await this.proposalsRepo.findOne({
      where: { id, isTemplate: true },
      relations: { slides: true },
    });
    if (!t) throw new NotFoundException('Plantilla no encontrada');
    t.slides.sort((a, b) => a.order - b.order);
    return t;
  }

  /** Crea la plantilla maestra COOTRAVIR desde assets internos si no existe. */
  async ensureSystemTemplate(user?: User) {
    const existing = await this.proposalsRepo.findOne({
      where: { slug: SYSTEM_TEMPLATE_SLUG, isTemplate: true },
    });
    if (existing) return existing;

    const legacyRow = await this.proposalsRepo.findOne({
      where: { slug: SYSTEM_TEMPLATE_SLUG },
    });
    if (legacyRow) {
      legacyRow.isTemplate = true;
      return this.proposalsRepo.save(legacyRow);
    }

    const assetsPath = this.resolveSystemAssetsPath();
    const creatorId =
      user?.id ??
      (
        await this.proposalsRepo.manager
          .getRepository(User)
          .findOne({ where: {}, order: { createdAt: 'ASC' } })
      )?.id;

    if (!creatorId) {
      throw new Error('No hay usuarios; espere a que se cree el administrador.');
    }

    const proposal = this.proposalsRepo.create({
      slug: SYSTEM_TEMPLATE_SLUG,
      clientName: 'COOTRAVIR',
      title: 'Plantilla maestra — Propuesta de seguridad',
      status: ProposalStatus.DRAFT,
      isTemplate: true,
      mapConfig: this.loadMapConfig(assetsPath),
      createdById: creatorId,
    });
    const saved = await this.proposalsRepo.save(proposal);

    const slides: Slide[] = [];
    for (let i = 0; i < LEGACY_SLIDES.length; i++) {
      const def = LEGACY_SLIDES[i];
      const filePath = path.join(assetsPath, 'html', def.file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      let bodyHtml = this.extractBodyContent(raw);
      bodyHtml = this.rewriteAssetPaths(bodyHtml);

      slides.push(
        this.slidesRepo.create({
          proposalId: saved.id,
          order: i,
          key: def.key,
          title: def.title,
          html: bodyHtml,
          css: this.extractStyles(raw),
          scripts: SLIDE_SCRIPTS[def.key] ?? null,
          enabled: true,
        }),
      );
    }
    await this.slidesRepo.save(slides);

    return this.proposalsRepo.findOne({
      where: { id: saved.id },
      relations: { slides: true },
    });
  }

  /** Reinstala la plantilla maestra desde assets (solo si no hay copias dependientes críticas). */
  async reseedSystemTemplate(user: User) {
    const existing = await this.proposalsRepo.findOne({
      where: { slug: SYSTEM_TEMPLATE_SLUG, isTemplate: true },
      relations: { slides: true },
    });
    if (existing) {
      await this.slidesRepo.delete({ proposalId: existing.id });
      await this.proposalsRepo.remove(existing);
    }
    return this.ensureSystemTemplate(user);
  }

  async createBlank(dto: CreateTemplateDto, user: User) {
    const exists = await this.proposalsRepo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('El slug ya existe');

    const proposal = this.proposalsRepo.create({
      slug: dto.slug,
      clientName: 'Plantilla',
      title: dto.title,
      status: ProposalStatus.DRAFT,
      isTemplate: true,
      mapConfig: dto.includeMap
        ? this.loadMapConfig(this.resolveSystemAssetsPath())
        : null,
      createdById: user.id,
    });
    const saved = await this.proposalsRepo.save(proposal);

    const starterSlides = dto.includeStarterSlides
      ? await this.buildStarterSlides(saved.id)
      : [
          this.slidesRepo.create({
            proposalId: saved.id,
            order: 0,
            key: 'slide_1',
            title: 'Diapositiva 1',
            html: '<div class="slide p-8"><h1 class="text-3xl font-bold text-white">Nueva diapositiva</h1></div>',
            css: null,
            enabled: true,
          }),
        ];

    await this.slidesRepo.save(starterSlides);
    return this.findOne(saved.id);
  }

  private async buildStarterSlides(proposalId: string): Promise<Slide[]> {
    await this.ensureSystemTemplate();
    const master = await this.proposalsRepo.findOne({
      where: { slug: SYSTEM_TEMPLATE_SLUG, isTemplate: true },
      relations: { slides: true },
    });
    if (!master?.slides?.length) {
      throw new NotFoundException('Plantilla maestra no disponible');
    }
    return master.slides.map((s) =>
      this.slidesRepo.create({
        proposalId,
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
  }
}
