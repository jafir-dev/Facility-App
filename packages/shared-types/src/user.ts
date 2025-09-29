export type UserRole = 'Tenant' | 'Supervisor' | 'Technician' | 'FMCHead' | 'Owner' | 'Procurement' | 'Vendor';

export interface User {
  id: string; // Firebase UID
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
}