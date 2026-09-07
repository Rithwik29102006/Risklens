// Shim for cloudflare:workers when building/running outside Cloudflare runtime (e.g. Vercel / Node.js)
export const env: Record<string, any> = (globalThis as any).__CF_ENV__ || {};
