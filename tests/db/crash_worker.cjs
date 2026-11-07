// Deterministic Child Worker for Multi-Process Hard Crash Testing
// Spawns a child process, begins a WAL transaction, writes an uncommitted row,
// signals readiness to parent via stdout, and waits to be abruptly killed by SIGKILL.

const { DatabaseSync } = require('node:sqlite');

const dbPath = process.argv[2];
if (!dbPath) {
  process.stderr.write('Missing dbPath argument\n');
  process.exit(1);
}

try {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  // Begin transaction and insert uncommitted in-flight record
  db.exec('BEGIN IMMEDIATE;');
  db.exec("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_crash_ghost', 'CREATED');");

  // Signal deterministic readiness to parent
  process.stdout.write('CRASH_CHILD_READY\n');

  // Keep process alive indefinitely without committing; parent will execute hard SIGKILL
  setInterval(() => {}, 10000);
} catch (err) {
  process.stderr.write('Crash worker error: ' + (err.message || String(err)) + '\n');
  process.exit(1);
}

