import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Asset } from '../entities/asset.entity';
import {
  STORAGE_REF_PREFIX,
  extractStoragePaths,
  toStorageRef,
} from './storage.constants';

@Injectable()
export class FilesService {
  private supabase: SupabaseClient | null = null;
  private s3: S3Client | null = null;

  constructor(
    private config: ConfigService,
    @InjectRepository(Asset) private assetsRepo: Repository<Asset>,
  ) {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (url && serviceKey) {
      this.supabase = createClient(url, serviceKey);
    }

    const s3Key = this.config.get<string>('SUPABASE_S3_ACCESS_KEY_ID');
    const s3Secret = this.config.get<string>('SUPABASE_S3_SECRET_ACCESS_KEY');
    const s3Endpoint = this.config.get<string>('SUPABASE_S3_ENDPOINT');
    if (s3Key && s3Secret && s3Endpoint) {
      this.s3 = new S3Client({
        endpoint: s3Endpoint,
        region: this.config.get<string>('SUPABASE_S3_REGION', 'auto'),
        credentials: {
          accessKeyId: s3Key,
          secretAccessKey: s3Secret,
        },
        forcePathStyle: true,
      });
    } else if (s3Key && s3Secret && !s3Endpoint) {
      console.warn(
        '[FilesService] Faltan SUPABASE_S3_ENDPOINT. Cópielo en Storage → S3 del panel de Supabase.',
      );
    }

    if (!this.isStorageConfigured()) {
      console.warn(
        '[FilesService] Subidas deshabilitadas: configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ' +
          '(recomendado) o SUPABASE_S3_* completo en .env',
      );
    }
  }

  private get bucket() {
    return this.config.get<string>('SUPABASE_BUCKET', 'archivos');
  }

  private get signedUrlTtl(): number {
    return parseInt(
      this.config.get<string>('SIGNED_URL_EXPIRES_SECONDS', '3600'),
      10,
    );
  }

  isStorageConfigured(): boolean {
    return Boolean(this.s3 || this.supabase);
  }

  /** URL firmada nueva (no caduca en BD; se pide al vuelo). */
  async createSignedUrl(
    path: string,
    expiresInSeconds = this.signedUrlTtl,
  ): Promise<{ url: string; expiresAt: string }> {
    if (!path) {
      throw new ServiceUnavailableException('Ruta de archivo inválida');
    }

    if (this.s3) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });
      const url = await getSignedUrl(this.s3, command, {
        expiresIn: expiresInSeconds,
      });
      return {
        url,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      };
    }

    if (this.supabase) {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresInSeconds);
      if (error || !data?.signedUrl) {
        throw new ServiceUnavailableException(
          `No se pudo firmar URL: ${error?.message ?? 'desconocido'}`,
        );
      }
      return {
        url: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      };
    }

    throw new ServiceUnavailableException(
      'Almacenamiento no configurado (S3 o Supabase)',
    );
  }

  async createSignedUrls(paths: string[]) {
    const unique = [...new Set(paths)];
    const out: Record<string, { url: string; expiresAt: string }> = {};
    const results = await Promise.allSettled(
      unique.map(async (path) => {
        const signed = await this.createSignedUrl(path);
        return { path, signed };
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { path, signed } = result.value;
        out[path] = { url: signed.url, expiresAt: signed.expiresAt };
      } else {
        console.warn(
          '[FilesService] No se pudo firmar un archivo:',
          result.reason,
        );
      }
    }
    return out;
  }

  /** Sustituye __STORAGE__:ruta por URLs firmadas frescas. */
  async resolveHtmlStorageUrls(html: string): Promise<string> {
    const paths = extractStoragePaths(html);
    if (!paths.length) return html;

    const signedMap = await this.createSignedUrls(paths);
    let out = html;
    for (const path of paths) {
      const entry = signedMap[path];
      if (!entry) continue;
      const ref = `${STORAGE_REF_PREFIX}${path}`;
      const refEnc = `${STORAGE_REF_PREFIX}${encodeURIComponent(path)}`;
      out = out.split(ref).join(entry.url);
      out = out.split(refEnc).join(entry.url);
    }
    return out;
  }

  /** Sube JSON al bucket (p. ej. mapa por propuesta). Sobrescribe si ya existe. */
  async uploadJson(path: string, data: unknown): Promise<void> {
    if (!path) {
      throw new ServiceUnavailableException('Ruta de archivo inválida');
    }
    const body = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');

    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: body,
          ContentType: 'application/json',
        }),
      );
      return;
    }

    if (this.supabase) {
      const { error } = await this.supabase.storage.from(this.bucket).upload(path, body, {
        contentType: 'application/json',
        upsert: true,
      });
      if (error) {
        throw new ServiceUnavailableException(
          `Error al subir JSON: ${error.message}`,
        );
      }
      return;
    }

    throw new ServiceUnavailableException(
      'Configure SUPABASE_S3_* o SUPABASE_URL + SERVICE_ROLE_KEY en .env',
    );
  }

  async upload(
    file: Express.Multer.File,
    proposalId: string,
  ): Promise<{
    path: string;
    storageRef: string;
    signedUrl: string;
    expiresAt: string;
    assetId: string;
  }> {
    const path = `${proposalId}/${randomUUID()}-${file.originalname.replace(/[^\w.\-]+/g, '_')}`;

    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } else if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      if (error) {
        throw new ServiceUnavailableException(
          `Error al subir archivo: ${error.message}`,
        );
      }
    } else {
      throw new ServiceUnavailableException(
        'Configure SUPABASE_S3_* o SUPABASE_URL + SERVICE_ROLE_KEY en .env',
      );
    }

    const storageRef = toStorageRef(path);
    const { url: signedUrl, expiresAt } = await this.createSignedUrl(path);

    const asset = this.assetsRepo.create({
      proposalId,
      supabasePath: path,
      publicUrl: storageRef,
      mimeType: file.mimetype,
    });
    const saved = await this.assetsRepo.save(asset);

    return {
      path,
      storageRef,
      signedUrl,
      expiresAt,
      assetId: saved.id,
    };
  }

  async remove(assetId: string) {
    const asset = await this.assetsRepo.findOne({ where: { id: assetId } });
    if (!asset) return { deleted: false };

    if (this.s3) {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: asset.supabasePath }),
      );
    } else if (this.supabase) {
      await this.supabase.storage
        .from(this.bucket)
        .remove([asset.supabasePath]);
    }
    await this.assetsRepo.remove(asset);
    return { deleted: true };
  }
}
