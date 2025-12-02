import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '../db';
import type { User, Session, AuthContext, UserRole, CloudflareEnv } from '../../types/auth';

export class AuthService {
  private db: Database;
  private jwtSecret: string;
  private allowedDomain: string;

  constructor(env: CloudflareEnv) {
    this.db = new Database(env.DB);
    this.jwtSecret = env.JWT_SECRET;
    this.allowedDomain = env.ALLOWED_EMAIL_DOMAIN;
  }

  // Email validation
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    const domain = email.split('@')[1];
    return domain === this.allowedDomain;
  }

  // Password hashing
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // User registration
  async register(
    email: string,
    password: string,
    role: UserRole = 'viewer'
  ): Promise<{ user: User; error?: string }> {
    try {
      // Validate email domain
      if (!this.validateEmail(email)) {
        return {
          user: null as any,
          error: `Only ${this.allowedDomain} email addresses are allowed`,
        };
      }

      // Check if user already exists
      const existingUser = await this.db.getUserByEmail(email);
      if (existingUser) {
        return {
          user: null as any,
          error: 'User already exists',
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const user = await this.db.createUser(email, passwordHash, role);

      return { user };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        user: null as any,
        error: 'Registration failed',
      };
    }
  }

  // User login
  async login(email: string, password: string): Promise<{ token?: string; user?: User; error?: string }> {
    try {
      // Get user
      const userWithHash = await this.db.getUserByEmail(email);
      if (!userWithHash) {
        return { error: 'Invalid credentials' };
      }

      // Verify password
      const isValid = await this.verifyPassword(password, userWithHash.password_hash);
      if (!isValid) {
        return { error: 'Invalid credentials' };
      }

      // Update last login
      await this.db.updateLastLogin(userWithHash.id);

      // Generate JWT
      const token = this.generateToken(userWithHash.id);

      // Create session
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      await this.db.createSession(userWithHash.id, token, expiresAt);

      // Remove password_hash from response
      const { password_hash, ...user } = userWithHash;

      return { token, user };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed' };
    }
  }

  // Generate JWT token
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: '7d' });
  }

  // Verify JWT token
  private verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, this.jwtSecret) as { userId: string };
    } catch {
      return null;
    }
  }

  // Get auth context from request
  async getAuthContext(token: string | null): Promise<AuthContext> {
    if (!token) {
      return this.createUnauthenticatedContext();
    }

    const session = await this.db.getSessionByToken(token);
    if (!session) {
      return this.createUnauthenticatedContext();
    }

    const user = await this.db.getUserById(session.user_id);
    if (!user) {
      return this.createUnauthenticatedContext();
    }

    return {
      user,
      session,
      isAuthenticated: true,
      hasRole: (roles: UserRole | UserRole[]) => {
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },
      canExecuteTool: async (toolSlug: string) => {
        const perms = await this.db.getToolPermissions(toolSlug, user.id, user.role);
        return perms.can_execute;
      },
      canEditTool: async (toolSlug: string) => {
        const perms = await this.db.getToolPermissions(toolSlug, user.id, user.role);
        return perms.can_edit;
      },
    };
  }

  private createUnauthenticatedContext(): AuthContext {
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      hasRole: () => false,
      canExecuteTool: async () => false,
      canEditTool: async () => false,
    };
  }

  // Logout
  async logout(token: string): Promise<void> {
    await this.db.deleteSession(token);
  }

  // Admin operations
  async updateUserRole(adminUserId: string, targetUserId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
    try {
      const admin = await this.db.getUserById(adminUserId);
      if (!admin || admin.role !== 'super_user') {
        return { success: false, error: 'Unauthorized' };
      }

      await this.db.updateUserRole(targetUserId, newRole);
      return { success: true };
    } catch (error) {
      console.error('Update role error:', error);
      return { success: false, error: 'Failed to update role' };
    }
  }

  async deactivateUser(adminUserId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const admin = await this.db.getUserById(adminUserId);
      if (!admin || admin.role !== 'super_user') {
        return { success: false, error: 'Unauthorized' };
      }

      await this.db.deactivateUser(targetUserId);
      await this.db.deleteUserSessions(targetUserId);
      return { success: true };
    } catch (error) {
      console.error('Deactivate user error:', error);
      return { success: false, error: 'Failed to deactivate user' };
    }
  }

  async getAllUsers(requestingUserId: string): Promise<{ users?: User[]; error?: string }> {
    try {
      const user = await this.db.getUserById(requestingUserId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_user')) {
        return { error: 'Unauthorized' };
      }

      const users = await this.db.getAllUsers();
      return { users };
    } catch (error) {
      console.error('Get all users error:', error);
      return { error: 'Failed to fetch users' };
    }
  }

  // Audit logging
  async createAuditLog(
    userId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    request: Request
  ): Promise<void> {
    const ipAddress = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For');
    const userAgent = request.headers.get('User-Agent');

    await this.db.createAuditLog(
      userId,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      null
    );
  }
}

// Helper function to extract token from request
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check cookies
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('auth_token='));
    if (authCookie) {
      return authCookie.split('=')[1];
    }
  }

  return null;
}
