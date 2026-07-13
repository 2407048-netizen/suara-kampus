-- ============================================================
-- Suara Kampus ITG - Turso Database Schema
-- Run this once on your Turso database to initialize tables
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nim TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'mahasiswa',
  fakultas TEXT DEFAULT 'Umum',
  jurusan TEXT,
  angkatan TEXT,
  foto_profil TEXT,
  status_aktif TEXT DEFAULT 'aktif',
  is_deleted INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  email_token TEXT,
  token_expiry TEXT,
  otp_hash TEXT,
  otp_expiry TEXT,
  otp_attempts INTEGER DEFAULT 0,
  otp_last_sent TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS laporan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  judul TEXT NOT NULL,
  kategori TEXT,
  lokasi TEXT,
  deskripsi TEXT NOT NULL,
  foto_url TEXT,
  status TEXT DEFAULT 'pending',
  prioritas TEXT DEFAULT 'normal',
  catatan_admin TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS laporan_dosen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nama_dosen TEXT NOT NULL,
  mata_kuliah TEXT NOT NULL,
  kelas TEXT,
  semester TEXT,
  judul TEXT NOT NULL,
  kronologi TEXT NOT NULL,
  dampak TEXT,
  bukti_url TEXT,
  status TEXT DEFAULT 'pending',
  catatan_admin TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS aspirations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  is_anonymous INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  catatan_admin TEXT,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS aspiration_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aspiration_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  vote_type TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(aspiration_id, user_id),
  FOREIGN KEY (aspiration_id) REFERENCES aspirations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  laporan_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  pesan TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT,
  FOREIGN KEY (laporan_id) REFERENCES laporan(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  judul TEXT NOT NULL,
  pesan TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  laporan_id INTEGER,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TEXT
);

-- Seed admin account (password: admin123)
-- password_hash is bcrypt of 'admin123'
INSERT OR IGNORE INTO users (nim, nama, email, password_hash, role, status_aktif, is_deleted, is_verified, created_at, updated_at)
VALUES (
  'ADMIN001',
  'Administrator',
  'admin@itg.ac.id',
  '$2b$10$rBqKrNXZR.d8ViTFQT2nAuQxYkzFjbj0Tpqk.P6cHJI1KXEhT.VRu',
  'admin',
  'aktif',
  0,
  1,
  datetime('now'),
  datetime('now')
);
