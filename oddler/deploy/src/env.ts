/** The bindings wrangler.jsonc declares for the standalone deploy. */
export interface Env {
  /** Static client files (dist/client), served asset-first. */
  ASSETS: Fetcher;
  /** One Durable Object instance per room. */
  ROOMS: DurableObjectNamespace;
  /** Player profiles (the locker). */
  KV?: KVNamespace;
  HF_ENV?: string;
  APP_SLUG?: string;
}
