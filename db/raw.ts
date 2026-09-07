import { env } from 'cloudflare:workers';

let fallbackDb: any = null;

function getFallbackDb() {
  if (fallbackDb) return fallbackDb;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    const path = require('node:path');
    const os = require('node:os');
    const dbPath = path.join(os.tmpdir(), 'risklens.sqlite');
    const sqlite = new DatabaseSync(dbPath);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        payload TEXT NOT NULL,
        eal REAL NOT NULL,
        created_at TEXT NOT NULL,
        kind TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS onboarding_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        org_name TEXT NOT NULL,
        step INTEGER NOT NULL,
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    fallbackDb = {
      prepare(sql: string) {
        let boundArgs: any[] = [];
        const runner = {
          bind(...args: any[]) {
            boundArgs = args;
            return runner;
          },
          async first() {
            const stmt = sqlite.prepare(sql);
            const row = stmt.get(...boundArgs);
            return row ?? null;
          },
          async all() {
            const stmt = sqlite.prepare(sql);
            const results = stmt.all(...boundArgs);
            return { results };
          },
          async run() {
            const stmt = sqlite.prepare(sql);
            stmt.run(...boundArgs);
            return { success: true };
          },
        };
        return runner;
      },
    };
    return fallbackDb;
  } catch {
    // In-memory array fallback if node:sqlite is unavailable
    const memoryStore: Record<string, any[]> = {
      assessments: [],
      plans: [],
      onboarding_drafts: [],
    };
    let autoId = 1;

    fallbackDb = {
      prepare(sql: string) {
        let boundArgs: any[] = [];
        const runner = {
          bind(...args: any[]) {
            boundArgs = args;
            return runner;
          },
          async first() {
            if (/onboarding_drafts/i.test(sql)) {
              return memoryStore.onboarding_drafts[memoryStore.onboarding_drafts.length - 1] ?? null;
            }
            if (/assessments/i.test(sql)) {
              return memoryStore.assessments[memoryStore.assessments.length - 1] ?? null;
            }
            return null;
          },
          async all() {
            if (/onboarding_drafts/i.test(sql)) {
              return { results: [...memoryStore.onboarding_drafts].reverse() };
            }
            if (/assessments/i.test(sql)) {
              return { results: [...memoryStore.assessments].reverse().map(a => ({ id: a.id, eal: a.eal, createdAt: a.created_at, kind: a.kind })) };
            }
            if (/plans/i.test(sql)) {
              return { results: [...memoryStore.plans].reverse().map(p => ({ payload: p.payload, createdAt: p.created_at })) };
            }
            return { results: [] };
          },
          async run() {
            if (/INSERT INTO onboarding_drafts/i.test(sql)) {
              memoryStore.onboarding_drafts.push({
                id: autoId++,
                org_name: boundArgs[0],
                step: boundArgs[1],
                state_json: boundArgs[2],
                created_at: boundArgs[3],
                updated_at: boundArgs[4],
              });
            } else if (/UPDATE onboarding_drafts/i.test(sql)) {
              const last = memoryStore.onboarding_drafts[memoryStore.onboarding_drafts.length - 1];
              if (last) {
                last.org_name = boundArgs[0];
                last.step = boundArgs[1];
                last.state_json = boundArgs[2];
                last.updated_at = boundArgs[3];
              }
            } else if (/DELETE FROM onboarding_drafts/i.test(sql)) {
              memoryStore.onboarding_drafts = [];
            } else if (/INSERT INTO assessments/i.test(sql)) {
              memoryStore.assessments.push({
                id: autoId++,
                payload: boundArgs[0],
                eal: boundArgs[1],
                created_at: boundArgs[2],
                kind: boundArgs[3],
              });
            } else if (/INSERT INTO plans/i.test(sql)) {
              memoryStore.plans.push({
                id: autoId++,
                payload: boundArgs[0],
                created_at: boundArgs[1],
              });
            }
            return { success: true };
          },
        };
        return runner;
      },
    };
    return fallbackDb;
  }
}

export function database() {
  if (env && env.DB) {
    return env.DB;
  }
  return getFallbackDb();
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return !origin || origin === new URL(req.url).origin;
}
