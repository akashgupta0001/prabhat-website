// Tiny document store on top of D1 so the admin panel can keep flexible records
// (products, categories, pages ...) without a schema migration for every field.
import { seedDocs } from './seed.js';

let ready = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS docs (
     col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL,
     PRIMARY KEY (col, id))`,
  `CREATE TABLE IF NOT EXISTS images (
     id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL, bytes INTEGER NOT NULL, created TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS attempts (ip TEXT NOT NULL, kind TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS attempts_ip ON attempts (ip, kind, ts)`,
];

export function init(env) {
  if (!env.DB) throw new Error('The D1 database is not connected. Add a D1 binding named DB to this project.');
  if (!ready) {
    ready = (async () => {
      await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
      const marker = await env.DB.prepare("SELECT 1 AS x FROM docs WHERE col = 'site' AND id = '_seeded'").first();
      if (!marker) await seed(env);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

async function seed(env) {
  const now = new Date().toISOString();
  const stmts = seedDocs().map((d) =>
    env.DB.prepare('INSERT OR IGNORE INTO docs (col, id, data, updated) VALUES (?, ?, ?, ?)')
      .bind(d.col, d.id, JSON.stringify({ id: d.id, ...d.data, created: now, updated: now }), now));
  stmts.push(env.DB.prepare("INSERT OR IGNORE INTO docs (col, id, data, updated) VALUES ('site', '_seeded', '{}', ?)").bind(now));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
}

export async function listCol(env, col) {
  const { results } = await env.DB.prepare('SELECT id, data FROM docs WHERE col = ? AND substr(id, 1, 1) <> ?').bind(col, '_').all();
  return results.map((r) => ({ id: r.id, data: JSON.parse(r.data) }));
}

export async function getDoc(env, col, id) {
  const r = await env.DB.prepare('SELECT data FROM docs WHERE col = ? AND id = ?').bind(col, id).first();
  return r ? JSON.parse(r.data) : null;
}

export function putStmt(env, col, id, data) {
  const now = new Date().toISOString();
  return env.DB.prepare('INSERT INTO docs (col, id, data, updated) VALUES (?, ?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data, updated = excluded.updated')
    .bind(col, id, JSON.stringify(data), now);
}

export function delStmt(env, col, id) {
  return env.DB.prepare('DELETE FROM docs WHERE col = ? AND id = ?').bind(col, id);
}
