import type { APIRoute } from 'astro';
import type { UserRole } from '../../../../../types/auth';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const auth = locals.auth;
    const authService = locals.authService;

    if (!auth?.isAuthenticated || !auth.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only super_user can change roles
    if (auth.user.role !== 'super_user') {
      return new Response(JSON.stringify({ error: 'Forbidden - Super user access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    const { role } = await request.json();

    if (!id || !role) {
      return new Response(JSON.stringify({ error: 'User ID and role are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validRoles: UserRole[] = ['viewer', 'admin', 'super_user'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { success, error } = await authService.updateUserRole(auth.user.id, id, role);

    if (error) {
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log role change
    await authService.createAuditLog(
      auth.user.id,
      'user_role_changed',
      'user',
      id,
      request
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Role update error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update role' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
