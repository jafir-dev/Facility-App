# Story: API Gateway & Security

**Story ID**: Story 2-4
**Branch**: `feature/story-2-4`
**Dependencies**: Stories 1-2, 1-3
**Parallel-safe**: true
**Module**: API infrastructure
**Epic**: Foundation & Core Ticketing Workflow

## User Story
**As a** developer, **I want** a secure API gateway with proper security measures, **so that** the application is protected against common security threats and performs well under load.

## Acceptance Criteria
1. API gateway pattern implementation with Nginx reverse proxy
2. Rate limiting for API endpoints
3. Input validation and sanitization
4. Security middleware implementation
5. CORS configuration
6. Request/response logging
7. API documentation generation
8. Performance monitoring

## Technical Implementation Details

### Nginx Configuration

```nginx
# infrastructure/nginx/nginx.conf
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    # Logging Settings
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip Settings
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # Upstream Node.js API
    upstream api {
        server 127.0.0.1:3000;
        keepalive 64;
    }

    # Upstream Next.js Web App
    upstream web {
        server 127.0.0.1:3001;
        keepalive 64;
    }

    # Main API Server Block
    server {
        listen 80;
        server_name api.zariya.app;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss: https:;" always;

        # CORS
        add_header Access-Control-Allow-Origin "https://zariya.app" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;

        # Rate limiting for API endpoints
        limit_req zone=api burst=20 nodelay;

        # Authentication endpoints have stricter rate limiting
        location ~ ^/api/auth/ {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # File serving with authorization check
        location /api/media/ {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # General API endpoints
        location /api/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }

    # Web Application Server Block
    server {
        listen 80;
        server_name zariya.app www.zariya.app;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Rate limiting
        limit_req zone=api burst=30 nodelay;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files caching
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|webp)$ {
            proxy_pass http://web;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Security Middleware

```typescript
// packages/api/src/middleware/security.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import * as cors from 'cors';
import * as compression from 'compression';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  private readonly authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: 'Too many authentication attempts from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  use(req: Request, res: Response, next: NextFunction) {
    // Apply security headers
    helmet()(req, res, next);
  }

  useCors(req: Request, res: Response, next: NextFunction) {
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })(req, res, next);
  }

  useRateLimit(req: Request, res: Response, next: NextFunction) {
    this.rateLimiter(req, res, next);
  }

  useAuthRateLimit(req: Request, res: Response, next: NextFunction) {
    this.authRateLimiter(req, res, next);
  }

  useCompression(req: Request, res: Response, next: NextFunction) {
    compression()(req, res, next);
  }
}
```

### Input Validation

```typescript
// packages/api/src/pipes/validation.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): string {
    return errors
      .map(error => {
        return Object.values(error.constraints).join(', ');
      })
      .join(', ');
  }
}
```

### Authentication Guard

```typescript
// packages/api/src/guards/firebase-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../services/firebase.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decodedToken = await this.firebaseService.verifyToken(token);
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Role-based Access Control

```typescript
// packages/api/src/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// packages/api/src/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### Error Handling

```typescript
// packages/api/src/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Send standardized error response
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }
}
```

### API Documentation Setup

```typescript
// packages/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from './pipes/validation.pipe';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipes
  app.useGlobalPipes(new ValidationPipe());

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Zariya API')
    .setDescription('Zariya Facility Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
```

### Request Logging Middleware

```typescript
// packages/api/src/middleware/logging.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `${req.method} ${req.url} - ${req.ip} - ${req.headers['user-agent']}`,
    );

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime;
      this.logger.log(
        `${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms`,
      );
      originalEnd.call(this, chunk, encoding);
    };

    next();
  }
}
```

### Performance Monitoring

```typescript
// packages/api/src/middleware/performance.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;

      // Log slow requests
      if (responseTime > 1000) {
        console.warn(`Slow request: ${req.method} ${req.url} took ${responseTime}ms`);
      }

      // Send metrics to monitoring system
      this.sendMetrics(req, res, responseTime);
    });

    next();
  }

  private sendMetrics(req: Request, res: Response, responseTime: number) {
    // Implement sending metrics to Prometheus or similar
    const metrics = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      timestamp: Date.now(),
    };

    // Send to monitoring system
    // monitoringService.recordRequest(metrics);
  }
}
```

## Success Metrics
- ✅ API gateway routes traffic correctly
- ✅ Rate limiting prevents abuse
- ✅ Input validation blocks malicious input
- ✅ Authentication and authorization work correctly
- ✅ Security headers are properly set
- ✅ API documentation is accessible
- ✅ Performance monitoring captures metrics
- ✅ Error handling provides proper responses

## Notes for Developers
- Implement proper SSL/TLS configuration
- Add proper monitoring and alerting
- Consider implementing API versioning
- Add proper caching strategies
- Implement proper request tracing
- Consider adding API analytics
- Add proper health check endpoints
- Implement proper circuit breakers for external services
- Add proper request/response compression
- Consider implementing GraphQL for complex queries
- Add proper API key management for external integrations
- Implement proper audit logging for security events