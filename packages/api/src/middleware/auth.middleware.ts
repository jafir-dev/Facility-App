import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    propertyId?: string;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // In a real implementation, verify JWT token here
      // For now, we'll use a mock implementation
      const user = this.verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private verifyToken(token: string): any {
    // Mock token verification - replace with real JWT verification
    if (token === 'mock-valid-token') {
      return {
        id: 'mock-user-id',
        email: 'user@example.com',
        role: 'user',
        propertyId: 'mock-property-id'
      };
    }
    throw new Error('Invalid token');
  }
}

@Injectable()
export class AuthorizationMiddleware {
  static requireRole(roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new UnauthorizedException('User not authenticated');
      }

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenException('Insufficient permissions');
      }

      next();
    };
  }

  static requireOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const resourceUserId = req.params.userId || req.body.userId;

    if (resourceUserId && resourceUserId !== req.user.id) {
      throw new ForbiddenException('You can only access your own resources');
    }

    next();
  }

  static requirePropertyAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const propertyId = req.params.propertyId || req.body.propertyId;

    if (propertyId && propertyId !== req.user.propertyId) {
      throw new ForbiddenException('You can only access notifications for your property');
    }

    next();
  }
}