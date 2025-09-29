"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VirusScannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirusScannerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let VirusScannerService = VirusScannerService_1 = class VirusScannerService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(VirusScannerService_1.name);
        this.enabled = this.configService.get('VIRUS_SCAN_ENABLED', false);
    }
    async scanFile(buffer, filename) {
        if (!this.enabled) {
            this.logger.log('Virus scanning is disabled. Skipping scan for file:', filename);
            return {
                isClean: true,
                threatsFound: [],
                scanTime: new Date(),
            };
        }
        try {
            this.logger.log('Virus scanning not yet implemented. File passed:', filename);
            return {
                isClean: true,
                threatsFound: [],
                scanTime: new Date(),
            };
        }
        catch (error) {
            this.logger.error('Virus scan failed for file:', filename, error);
            return {
                isClean: false,
                threatsFound: ['Scan failed - potential risk'],
                scanTime: new Date(),
            };
        }
    }
    isEnabled() {
        return this.enabled;
    }
};
exports.VirusScannerService = VirusScannerService;
exports.VirusScannerService = VirusScannerService = VirusScannerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VirusScannerService);
//# sourceMappingURL=virus-scanner.service.js.map