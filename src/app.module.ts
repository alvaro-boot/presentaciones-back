import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { Asset } from './entities/asset.entity';
import { Proposal } from './entities/proposal.entity';
import { Slide } from './entities/slide.entity';
import { User } from './entities/user.entity';
import { FilesModule } from './files/files.module';
import { ProposalsModule } from './proposals/proposals.module';
import { SlidesModule } from './slides/slides.module';
import { TemplatesModule } from './templates/templates.module';
import { TemplatesService } from './templates/templates.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: parseInt(config.get('DATABASE_PORT', '3306'), 10),
        username: config.get('DATABASE_USER', 'cootravir'),
        password: config.get('DATABASE_PASSWORD', 'cootravir'),
        database: config.get('DATABASE_NAME', 'cootravir_propuestas'),
        entities: [User, Proposal, Slide, Asset],
        synchronize: config.get('NODE_ENV') !== 'production',
        charset: 'utf8mb4',
      }),
    }),
    AuthModule,
    UsersModule,
    ProposalsModule,
    SlidesModule,
    FilesModule,
    TemplatesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private authService: AuthService,
    private templatesService: TemplatesService,
  ) {}

  async onModuleInit() {
    try {
      await this.authService.seedAdmin();
    } catch (err) {
      console.warn('[AppModule] seedAdmin:', err);
    }
    try {
      await this.templatesService.ensureSystemTemplate();
    } catch (err) {
      console.warn('[AppModule] ensureSystemTemplate:', err);
    }
  }
}
