import { ConfigService } from '@nestjs/config';
export interface VirusScanResult {
    isClean: boolean;
    threatsFound: string[];
    scanTime: Date;
}
export declare class VirusScannerService {
    private readonly configService;
    private readonly logger;
    private readonly enabled;
    constructor(configService: ConfigService);
    scanFile(buffer: Buffer, filename: string): Promise<VirusScanResult>;
    isEnabled(): boolean;
}
