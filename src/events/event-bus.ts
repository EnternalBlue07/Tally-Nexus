import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';

export interface SystemEventRecord {
  sequenceId: number;
  eventId: string;
  eventType: string;
  cycleId: string | null;
  payload: Record<string, unknown>;
  emittedAt: string;
}

export class EventBus {
  /**
   * Emits an immutable, monotonically sequenced outbox event.
   */
  public static emit(
    eventType: string,
    cycleId: string | null,
    payload: unknown,
    db: DatabaseManager
  ): { sequenceId: number; eventId: string } {
    const eventId = uuidv4();
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload);

    return db.withTransaction(() => {
      const stmt = db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(eventId, eventType, cycleId, payloadJson);

      const seqRow = db
        .prepare('SELECT sequence_id FROM system_events WHERE event_id = ?')
        .get(eventId) as { sequence_id: number };

      return {
        sequenceId: seqRow.sequence_id,
        eventId,
      };
    });
  }

  /**
   * Reads events monotonically ordered by sequence_id starting after a specified sequence cursor.
   * Core building block for resilient SSE event streams.
   */
  public static readStream(
    afterSequenceId: number = 0,
    limit: number = 100,
    db: DatabaseManager
  ): SystemEventRecord[] {
    const rows = db
      .prepare(`
        SELECT sequence_id, event_id, event_type, cycle_id, payload_json, emitted_at
        FROM system_events
        WHERE sequence_id > ?
        ORDER BY sequence_id ASC
        LIMIT ?
      `)
      .all(afterSequenceId, limit) as Array<{
        sequence_id: number;
        event_id: string;
        event_type: string;
        cycle_id: string | null;
        payload_json: string;
        emitted_at: string;
      }>;

    return rows.map((r) => ({
      sequenceId: r.sequence_id,
      eventId: r.event_id,
      eventType: r.event_type,
      cycleId: r.cycle_id,
      payload: JSON.parse(r.payload_json),
      emittedAt: r.emitted_at,
    }));
  }

  /**
   * Returns highest monotonic sequence ID in the outbox stream.
   */
  public static getLatestSequenceId(db: DatabaseManager): number {
    const row = db
      .prepare('SELECT COALESCE(MAX(sequence_id), 0) as max_seq FROM system_events')
      .get() as { max_seq: number };
    return row.max_seq;
  }
}
