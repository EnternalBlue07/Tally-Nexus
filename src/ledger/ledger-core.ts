import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';

export interface JournalEntryParams {
  cycleId: string;
  debitAccount: string;
  creditAccount: string;
  amountCents: number;
  reason: string;
  externalRef?: string;
  journalEntryRef?: string;
}

export interface JournalEntryRecord extends JournalEntryParams {
  entryId: string;
  createdAt: string;
}

export class LedgerCore {
  /**
   * Records a balanced double-entry subledger posting into compensating_ledger.
   */
  public static recordEntry(params: JournalEntryParams, db: DatabaseManager): JournalEntryRecord {
    if (params.amountCents <= 0) {
      throw new Error('INVALID_LEDGER_AMOUNT: Amount must be strictly positive.');
    }
    if (params.debitAccount === params.creditAccount) {
      throw new Error('CIRCULAR_POSTING_PROHIBITED: Debit and credit accounts must be distinct.');
    }

    return db.withTransaction(() => {
      const entryId = uuidv4();
      const journalRef = params.journalEntryRef || `JRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      db.prepare(`
        INSERT INTO compensating_ledger (
          entry_id, cycle_id, debit_account, credit_account, amount_cents, reason, external_ref, journal_entry_ref
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entryId,
        params.cycleId,
        params.debitAccount,
        params.creditAccount,
        params.amountCents,
        params.reason,
        params.externalRef || null,
        journalRef
      );

      // Emit Outbox event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'LEDGER_ENTRY_POSTED', ?, ?)
      `).run(
        uuidv4(),
        params.cycleId,
        JSON.stringify({
          entryId,
          debitAccount: params.debitAccount,
          creditAccount: params.creditAccount,
          amountCents: params.amountCents,
          reason: params.reason,
        })
      );

      return {
        entryId,
        ...params,
        journalEntryRef: journalRef,
        createdAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Computes the net debit and credit aggregates for a specified account.
   */
  public static getAccountBalance(
    accountName: string,
    db: DatabaseManager
  ): { totalDebits: number; totalCredits: number; netDebitBalance: number } {
    const debitRow = db
      .prepare('SELECT COALESCE(SUM(amount_cents), 0) as total FROM compensating_ledger WHERE debit_account = ?')
      .get(accountName) as { total: number };

    const creditRow = db
      .prepare('SELECT COALESCE(SUM(amount_cents), 0) as total FROM compensating_ledger WHERE credit_account = ?')
      .get(accountName) as { total: number };

    return {
      totalDebits: debitRow.total,
      totalCredits: creditRow.total,
      netDebitBalance: debitRow.total - creditRow.total,
    };
  }

  /**
   * Verifies the global trial balance: Total Debits across all ledger entries MUST EQUAL Total Credits.
   */
  public static verifyTrialBalance(db: DatabaseManager): { balanced: boolean; totalVolumeCents: number } {
    const row = db
      .prepare(`
        SELECT 
          COALESCE(SUM(amount_cents), 0) as total_debit,
          COALESCE(SUM(amount_cents), 0) as total_credit
        FROM compensating_ledger
      `)
      .get() as { total_debit: number; total_credit: number };

    return {
      balanced: row.total_debit === row.total_credit,
      totalVolumeCents: row.total_debit,
    };
  }
}
