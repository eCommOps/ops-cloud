export type UserRole = 'viewer' | 'admin' | 'super_user';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: number;
  updated_at: number;
  last_login: number | null;
  is_active: boolean;
  email_verified: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

export interface ToolPermission {
  tool_slug: string;
  can_view: boolean;
  can_execute: boolean;
  can_edit: boolean;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canExecuteTool: (toolSlug: string) => Promise<boolean>;
  canEditTool: (toolSlug: string) => Promise<boolean>;
}

export interface CloudflareEnv {
  DB: D1Database;
  SESSION: KVNamespace;
  JWT_SECRET: string;
  ALLOWED_EMAIL_DOMAIN: string;
}
