import Database from 'better-sqlite3'
import { join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const DATA_DIR = resolve(__dirname, '..', 'data')
mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'tracking-lab.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    skill_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_stable_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS skill_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id TEXT NOT NULL,
    version TEXT NOT NULL,
    base_version TEXT,
    prd_text TEXT,
    changelog TEXT,
    skill_json TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_skill ON skill_snapshots(skill_id);
`)

export default db
