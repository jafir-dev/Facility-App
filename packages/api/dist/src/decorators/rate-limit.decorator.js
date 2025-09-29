"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimit = RateLimit;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
function RateLimit(limit, ttl) {
    return (0, common_1.applyDecorators)((0, common_1.UseGuards)(throttler_1.ThrottlerGuard), (0, throttler_1.Throttle)(limit, ttl));
}
//# sourceMappingURL=rate-limit.decorator.js.map