export interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
  refreshTokenExpiration: string;
  firebaseProjectId: string;
}

export interface JwtPayload {
  uid: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  disabled: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}