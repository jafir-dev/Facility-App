import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './controllers/media.controller';
import { FileUploadService } from './services/file-upload.service';
import { ThumbnailService } from './services/thumbnail.service';
import { FileCleanupService } from './services/file-cleanup.service';
import { MediaEntity } from './entities/media.entity';
import { MediaRepository } from './repositories/media.repository';
import { SecurityConfig } from './config/security.config';
import { AppConfigModule } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'zariya',
      entities: [MediaEntity],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([MediaEntity]),
  ],
  controllers: [MediaController],
  providers: [
    MediaRepository,
    FileUploadService,
    ThumbnailService,
    FileCleanupService,
    SecurityConfig,
    VirusScannerService,
  ],
  exports: [
    MediaRepository,
    FileUploadService,
    ThumbnailService,
    FileCleanupService,
    SecurityConfig,
    VirusScannerService,
  ],
})
export class AppModule {}