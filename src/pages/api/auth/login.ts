import type { APIRoute } from 'astro';
import { AuthService } from '../../../lib/auth';
import type { CloudflareEnv } from '../../../types/auth';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const runtime = locals.runtime as any;
    const env = runtime?.env as CloudflareEnv;

    if (!env) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authService = new AuthService(env);
    const { token, user, error } = await authService.login(email, password);

    if (error || !token || !user) {
      return new Response(JSON.stringify({ error: error || 'Login failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set cookie
    cookies.set('auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Log login
    await authService.createAuditLog(user.id, 'user_login', 'user', user.id, request);

    return new Response(JSON.stringify({ token, user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
