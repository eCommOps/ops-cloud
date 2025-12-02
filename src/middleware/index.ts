import { defineMiddleware } from 'astro:middleware';
import { AuthService, extractToken } from '../lib/auth';
import type { CloudflareEnv } from '../types/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const runtime = context.locals.runtime as any;
  const env = runtime?.env as CloudflareEnv;

  if (!env) {
    console.error('Cloudflare env not available');
    return next();
  }

  const authService = new AuthService(env);
  const token = extractToken(context.request);
  const authContext = await authService.getAuthContext(token);

  // Attach auth context to locals
  context.locals.auth = authContext;
  context.locals.authService = authService;

  // Protected routes
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/api/auth/login', '/api/auth/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (!isPublicRoute && !authContext.isAuthenticated) {
    // Redirect to login for non-API routes
    if (!pathname.startsWith('/api/')) {
      return Response.redirect(new URL('/login', context.request.url), 302);
    }

    // Return 401 for API routes
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Admin-only routes
  const adminRoutes = ['/admin'];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isAdminRoute && !authContext.hasRole(['admin', 'super_user'])) {
    if (!pathname.startsWith('/api/')) {
      return Response.redirect(new URL('/', context.request.url), 302);
    }

    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return next();
});
