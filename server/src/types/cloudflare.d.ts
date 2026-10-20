// Minimal declarations for the Workers runtime modules used by src/worker.ts.
// (Avoids pulling in @cloudflare/workers-types, whose globals clash with @types/node.)
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}

declare module 'cloudflare:node' {
  export function httpServerHandler(options: { port: number }): unknown;
}
