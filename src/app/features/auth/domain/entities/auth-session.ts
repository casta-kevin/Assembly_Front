export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}
