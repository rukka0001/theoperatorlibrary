/**
 * Runtime-safe environment variable access.
 *
 * On Vercel serverless, non-PUBLIC secrets are available via `process.env` at
 * runtime but are NOT reliably present on `import.meta.env` (Vite only inlines
 * statically-referenced PUBLIC vars). We therefore prefer `process.env` and
 * fall back to `import.meta.env` for local `astro dev`.
 */
export function getEnv(name: string): string | undefined {
  const fromProcess =
    typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;

  const fromImport = (import.meta.env as Record<string, unknown>)[name];
  return typeof fromImport === 'string' && fromImport !== ''
    ? fromImport
    : undefined;
}

/** Like getEnv but throws if the variable is missing. */
export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
