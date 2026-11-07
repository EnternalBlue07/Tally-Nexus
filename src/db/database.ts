import { DatabaseSync, StatementSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DatabaseManagerOptions {
  dbPath?: string;
  busyTimeoutMs?: number;
  readOnly?: boolean;
}

/**
 * DatabaseManager provides production-grade SQLite connectivity via Node 24 native `node:sqlite`.
 * Enforces WAL mode, foreign keys, busy timeout, BEGIN IMMEDIATE transactions, and retry logic.
 */
export class DatabaseManager {
  private db: DatabaseSync;
  private dbPath: string;
  private isOpen: boolean = false;
  private transactionDepth: number = 0;

  constructor(options: DatabaseManagerOptions = {}) {
    this.dbPath = options.dbPath || process.env.DATABASE_PATH || './data/tally_nexus.db';

    if (this.dbPath !== ':memory:') {
      const dir = dirname(resolve(this.dbPath));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath, {
      enableForeignKeyConstraints: true,
      readOnly: options.readOnly ?? false,
    });
    this.isOpen = true;

    // Configure mission-critical pragmas
    this.initPragmas(options.busyTimeoutMs ?? 5000, options.readOnly ?? false);
  }

  private initPragmas(busyTimeoutMs: number, readOnly: boolean): void {
    // 1. Strict Foreign Key Enforcement
    this.db.exec('PRAGMA foreign_keys = ON;');

    // 2. Busy Timeout to avoid immediate lock rejections
    this.db.exec(`PRAGMA busy_timeout = ${busyTimeoutMs};`);

    // 3. Write-Ahead Logging (WAL) and normal synchronous mode for performance & durability
    if (!readOnly && this.dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  /**
   * Run initial schema DDL migrations from schema.sql
   */
  public runMigrations(customSchemaPath?: string): void {
    const candidatePaths = [
      customSchemaPath,
      join(__dirname, 'schema.sql'),
      resolve(process.cwd(), 'src/db/schema.sql'),
      resolve(process.cwd(), 'dist/db/schema.sql'),
    ].filter(Boolean) as string[];

    let schemaSql: string | null = null;
    for (const p of candidatePaths) {
      if (existsSync(p)) {
        schemaSql = readFileSync(p, 'utf-8');
        break;
      }
    }

    if (!schemaSql) {
      throw new Error(`Failed to locate schema.sql in candidate paths: ${candidatePaths.join(', ')}`);
    }

    this.db.exec(schemaSql);
  }

  /**
   * Execute a unit of work inside a BEGIN IMMEDIATE transaction.
   * Acquires the reserved write lock up front to prevent deadlocks under concurrent writes.
   * Supports nested transaction calls by joining the active outer transaction.
   */
  public withTransaction<T>(fn: () => T): T {
    if (this.transactionDepth > 0) {
      return fn();
    }

    this.transactionDepth++;
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK;');
      } catch {
        // Rollback error secondary to original failure
      }
      throw error;
    } finally {
      this.transactionDepth = 0;
    }
  }

  /**
   * Execute an operation with automatic exponential backoff retry on database lock contention.
   */
  public executeWithRetry<T>(fn: () => T, maxRetries = 5, baseDelayMs = 50): T {
    let attempt = 0;
    while (true) {
      try {
        return fn();
      } catch (err: unknown) {
        attempt++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isLockError =
          errorMessage.includes('database is locked') ||
          errorMessage.includes('SQLITE_BUSY') ||
          errorMessage.includes('busy');

        if (isLockError && attempt <= maxRetries) {
          const jitter = Math.floor(Math.random() * 25);
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          // Synchronous sleep using Atomics.wait
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Prepare a SQL statement.
   */
  public prepare(sql: string): StatementSync {
    return this.db.prepare(sql);
  }

  /**
   * Execute raw SQL statements (e.g. multi-statement DDL or scripts).
   */
  public exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Access the underlying native DatabaseSync instance.
   */
  public getRawDb(): DatabaseSync {
    return this.db;
  }

  /**
   * Get the database location path.
   */
  public getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Check if connection is active.
   */
  public isConnected(): boolean {
    return this.isOpen;
  }

  /**
   * Close the database connection cleanly.
   */
  public close(): void {
    if (this.isOpen) {
      this.db.close();
      this.isOpen = false;
    }
  }
}

