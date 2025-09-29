"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const media_controller_1 = require("./controllers/media.controller");
const file_upload_service_1 = require("./services/file-upload.service");
const thumbnail_service_1 = require("./services/thumbnail.service");
const file_cleanup_service_1 = require("./services/file-cleanup.service");
const media_entity_1 = require("./entities/media.entity");
const media_repository_1 = require("./repositories/media.repository");
const security_config_1 = require("./config/security.config");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                username: process.env.DB_USERNAME || 'postgres',
                password: process.env.DB_PASSWORD || 'password',
                database: process.env.DB_DATABASE || 'zariya',
                entities: [media_entity_1.MediaEntity],
                synchronize: process.env.NODE_ENV !== 'production',
                logging: process.env.NODE_ENV === 'development',
            }),
            typeorm_1.TypeOrmModule.forFeature([media_entity_1.MediaEntity]),
        ],
        controllers: [media_controller_1.MediaController],
        providers: [
            media_repository_1.MediaRepository,
            file_upload_service_1.FileUploadService,
            thumbnail_service_1.ThumbnailService,
            file_cleanup_service_1.FileCleanupService,
            security_config_1.SecurityConfig,
            VirusScannerService,
        ],
        exports: [
            media_repository_1.MediaRepository,
            file_upload_service_1.FileUploadService,
            thumbnail_service_1.ThumbnailService,
            file_cleanup_service_1.FileCleanupService,
            security_config_1.SecurityConfig,
            VirusScannerService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map