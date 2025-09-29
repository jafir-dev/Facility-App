import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

export interface ValidatedRequest extends Request {
  validatedBody?: any;
  validatedParams?: any;
  validatedQuery?: any;
}

@Injectable()
export class ValidationMiddleware {
  static validateBody(dtoClass: any) {
    return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
      try {
        const dto = plainToClass(dtoClass, req.body);
        const errors = await validate(dto);

        if (errors.length > 0) {
          const errorMessages = this.formatValidationErrors(errors);
          throw new BadRequestException({
            message: 'Validation failed',
            errors: errorMessages
          });
        }

        req.validatedBody = dto;
        next();
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Invalid request body');
      }
    };
  }

  static validateParams(dtoClass: any) {
    return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
      try {
        const dto = plainToClass(dtoClass, req.params);
        const errors = await validate(dto);

        if (errors.length > 0) {
          const errorMessages = this.formatValidationErrors(errors);
          throw new BadRequestException({
            message: 'Parameter validation failed',
            errors: errorMessages
          });
        }

        req.validatedParams = dto;
        next();
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Invalid request parameters');
      }
    };
  }

  static validateQuery(dtoClass: any) {
    return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
      try {
        const dto = plainToClass(dtoClass, req.query);
        const errors = await validate(dto);

        if (errors.length > 0) {
          const errorMessages = this.formatValidationErrors(errors);
          throw new BadRequestException({
            message: 'Query validation failed',
            errors: errorMessages
          });
        }

        req.validatedQuery = dto;
        next();
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Invalid query parameters');
      }
    };
  }

  private static formatValidationErrors(errors: ValidationError[]): string[] {
    return errors.map(error => {
      const constraints = Object.values(error.constraints || {});
      return `${error.property}: ${constraints.join(', ')}`;
    });
  }
}

// Common validation DTOs
export class NotificationIdParam {
  id: string;
}

export class UserIdParam {
  userId: string;
}

export class UserIdBody {
  userId: string;
}

export class NotificationChannelParam {
  channel: 'push' | 'email' | 'inApp';
}

export class NotificationStatsQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export class FailedDeliveriesQuery {
  limit?: number;
  offset?: number;
  type?: string;
  channel?: string;
}

export class InAppNotificationsQuery {
  userId: string;
  limit?: number;
  offset?: number;
}

// Sanitization utilities
export class SanitizationMiddleware {
  static sanitizeString(value: string): string {
    if (!value) return value;

    // Remove potentially dangerous characters
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  static sanitize(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }

    next();
  }
}