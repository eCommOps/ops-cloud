import type { APIRoute } from 'astro';
import { extractToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const authService = locals.authService;
    const auth = locals.auth;

    if (!authService || !auth?.session) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = extractToken(request);
    if (token) {
      await authService.logout(token);
    }

    // Log logout
    if (auth.user) {
      await authService.createAuditLog(auth.user.id, 'user_logout', 'user', auth.user.id, request);
    }

    // Clear cookie
    cookies.delete('auth_token', { path: '/' });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
