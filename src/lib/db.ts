import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

// Reuse one pool across Next.js hot reloads.
const g = globalThis as unknown as { __sql?: Sql };

function getSql(): Sql {
  if (g.__sql) return g.__sql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set (copy .env.example to .env)");
  }

  const client = postgres(url, {
    ssl: "require",
    max: 5,
    prepare: false,
    onnotice: () => {},
  });

  if (process.env.NODE_ENV !== "production") g.__sql = client;
  return client;
}

/**
 * Lazy proxy — defers connecting to Postgres until the first actual query.
 * This prevents build-time crashes (e.g. during Next.js page data collection)
 * when DATABASE_URL is not set in the build environment.
 */
export const sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, thisArg, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown).apply(thisArg, args);
  },
  get(_target, prop, receiver) {
    return Reflect.get(getSql(), prop, receiver);
  },
}) as Sql;

export const ts = (unix: number | string | null | undefined) =>
  unix === null || unix === undefined || unix === ""
    ? null
    : new Date(Number(unix) * 1000);
