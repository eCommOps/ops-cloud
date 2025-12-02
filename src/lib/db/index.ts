import type { User, Session, ToolPermission, UserRole } from '../../types/auth';
import { nanoid } from 'nanoid';

export class Database {
  constructor(private db: D1Database) {}

  // User operations
  async createUser(email: string, passwordHash: string, role: UserRole = 'viewer'): Promise<User> {
    const id = nanoid();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0)`
      )
      .bind(id, email, passwordHash, role, now, now)
      .run();

    return {
      id,
      email,
      role,
      created_at: now,
      updated_at: now,
      last_login: null,
      is_active: true,
      email_verified: false,
    };
  }

  async getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
      .bind(email)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      password_hash: result.password_hash as string,
      role: result.role as UserRole,
      created_at: result.created_at as number,
      updated_at: result.updated_at as number,
      last_login: result.last_login as number | null,
      is_active: Boolean(result.is_active),
      email_verified: Boolean(result.email_verified),
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, email, role, created_at, updated_at, last_login, is_active, email_verified FROM users WHERE id = ? AND is_active = 1')
      .bind(id)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      role: result.role as UserRole,
      created_at: result.created_at as number,
      updated_at: result.updated_at as number,
      last_login: result.last_login as number | null,
      is_active: Boolean(result.is_active),
      email_verified: Boolean(result.email_verified),
    };
  }

  async updateLastLogin(userId: string): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, userId)
      .run();
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, now, userId)
      .run();
  }

  async deactivateUser(userId: string): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?')
      .bind(now, userId)
      .run();
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.db
      .prepare('SELECT id, email, role, created_at, updated_at, last_login, is_active, email_verified FROM users WHERE is_active = 1 ORDER BY created_at DESC')
      .all();

    return (result.results || []).map((row) => ({
      id: row.id as string,
      email: row.email as string,
      role: row.role as UserRole,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      last_login: row.last_login as number | null,
      is_active: Boolean(row.is_active),
      email_verified: Boolean(row.email_verified),
    }));
  }

  // Session operations
  async createSession(userId: string, token: string, expiresAt: number): Promise<Session> {
    const id = nanoid();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, userId, token, expiresAt, now)
      .run();

    return {
      id,
      user_id: userId,
      token,
      expires_at: expiresAt,
      created_at: now,
    };
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const result = await this.db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
      .bind(token, Date.now())
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      user_id: result.user_id as string,
      token: result.token as string,
      expires_at: result.expires_at as number,
      created_at: result.created_at as number,
    };
  }

  async deleteSession(token: string): Promise<void> {
    await this.db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run();
  }

  // Tool permissions
  async getToolPermissions(toolSlug: string, userId: string, userRole: UserRole): Promise<ToolPermission> {
    // Check user-specific permission first
    const userPerm = await this.db
      .prepare('SELECT can_view, can_execute, can_edit FROM tool_permissions WHERE tool_slug = ? AND user_id = ?')
      .bind(toolSlug, userId)
      .first();

    if (userPerm) {
      return {
        tool_slug: toolSlug,
        can_view: Boolean(userPerm.can_view),
        can_execute: Boolean(userPerm.can_execute),
        can_edit: Boolean(userPerm.can_edit),
      };
    }

    // Check role-based permission
    const rolePerm = await this.db
      .prepare('SELECT can_view, can_execute, can_edit FROM tool_permissions WHERE tool_slug = ? AND role = ?')
      .bind(toolSlug, userRole)
      .first();

    if (rolePerm) {
      return {
        tool_slug: toolSlug,
        can_view: Boolean(rolePerm.can_view),
        can_execute: Boolean(rolePerm.can_execute),
        can_edit: Boolean(rolePerm.can_edit),
      };
    }

    // Default permissions based on role
    return {
      tool_slug: toolSlug,
      can_view: true,
      can_execute: userRole === 'admin' || userRole === 'super_user',
      can_edit: userRole === 'super_user',
    };
  }

  async setToolPermission(
    toolSlug: string,
    userId: string | null,
    role: UserRole | null,
    canView: boolean,
    canExecute: boolean,
    canEdit: boolean
  ): Promise<void> {
    const id = nanoid();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT OR REPLACE INTO tool_permissions (id, tool_slug, user_id, role, can_view, can_execute, can_edit, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, toolSlug, userId, role, canView ? 1 : 0, canExecute ? 1 : 0, canEdit ? 1 : 0, now)
      .run();
  }

  // Tool execution logging
  async logToolExecution(
    toolSlug: string,
    userId: string,
    inputData: string | null,
    status: 'pending' | 'running' | 'completed' | 'failed'
  ): Promise<string> {
    const id = nanoid();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO tool_executions (id, tool_slug, user_id, input_data, status, started_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, toolSlug, userId, inputData, status, now)
      .run();

    return id;
  }

  async updateToolExecution(
    executionId: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    outputData: string | null = null,
    errorMessage: string | null = null
  ): Promise<void> {
    const now = Date.now();

    await this.db
      .prepare(
        `UPDATE tool_executions
         SET status = ?, output_data = ?, error_message = ?, completed_at = ?
         WHERE id = ?`
      )
      .bind(status, outputData, errorMessage, now, executionId)
      .run();
  }

  // Audit logging
  async createAuditLog(
    userId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    ipAddress: string | null,
    userAgent: string | null,
    details: string | null
  ): Promise<void> {
    const id = nanoid();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, user_agent, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, userId, action, resourceType, resourceId, ipAddress, userAgent, details, now)
      .run();
  }
}
