import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Setup SQLite db path
const dbPath = path.join(process.cwd(), 'instance', 'suara_kampus.db');

// Ensure instance directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Connect to SQLite
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export default db;
