-- ProfitScope: Cloudflare D1 schema
-- 最新状態のみを保持する単一レコードテーブル
CREATE TABLE IF NOT EXISTS dashboard_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

INSERT INTO users (username, password_hash, password_salt, password_iterations)
VALUES (
  'yamazaki',
  'fefdeaf9c8fb0dc8e5cad94d62932a06136164202356e53d777c20b5c1ab3abf',
  '4267427585406c6cff6814328974bb88',
  100000
)
ON CONFLICT(username) DO NOTHING;
