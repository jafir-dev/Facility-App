"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSizeMiddleware = void 0;
const common_1 = require("@nestjs/common");
let FileSizeMiddleware = class FileSizeMiddleware {
    constructor() {
        this.MAX_FILE_SIZE = 50 * 1024 * 1024;
    }
    use(req, res, next) {
        if (req.headers['content-length']) {
            const contentLength = parseInt(req.headers['content-length'], 10);
            if (contentLength > this.MAX_FILE_SIZE) {
                throw new common_1.BadRequestException(`File size exceeds maximum limit of ${this.formatBytes(this.MAX_FILE_SIZE)}`);
            }
        }
        next();
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
exports.FileSizeMiddleware = FileSizeMiddleware;
exports.FileSizeMiddleware = FileSizeMiddleware = __decorate([
    (0, common_1.Injectable)()
], FileSizeMiddleware);
//# sourceMappingURL=file-size.middleware.js.map