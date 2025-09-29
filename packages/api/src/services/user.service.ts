import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

// Define a basic user entity interface - this would normally be imported from a user module
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  propertyId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository('User') // This would normally be a User entity
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserEmail(userId: string): Promise<string | null> {
    try {
      // In a real implementation, this would query the user table
      // For now, we'll use a mock implementation that could be easily replaced
      const user = await this.userRepository.findOne({
        where: { id: userId, isActive: true },
        select: ['email']
      });

      return user?.email || null;
    } catch (error) {
      this.logger.error(`Failed to get user email for ${userId}:`, error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId, isActive: true }
      });
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }

  async getUsersByProperty(propertyId: string): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { propertyId, isActive: true }
      });
    } catch (error) {
      this.logger.error(`Failed to get users for property ${propertyId}:`, error);
      return [];
    }
  }

  async isUserActive(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['isActive']
      });
      return user?.isActive || false;
    } catch (error) {
      this.logger.error(`Failed to check user status for ${userId}:`, error);
      return false;
    }
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { id: userIds, isActive: true }
      });
    } catch (error) {
      this.logger.error(`Failed to get users by IDs:`, error);
      return [];
    }
  }
}