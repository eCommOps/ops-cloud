/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    auth: import('./types/auth').AuthContext;
    authService: import('./lib/auth').AuthService;
    runtime: {
      env: import('./types/auth').CloudflareEnv;
    };
  }
}