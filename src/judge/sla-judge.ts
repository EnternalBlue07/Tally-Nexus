import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';

export type EvaluatorType = 'PROGRAMMATIC_TEST' | 'LLM_JUDGE' | 'HYBRID';
export type VerdictType = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';

export interface EvaluationInput {
  taskId: string;
  evaluatorType: EvaluatorType;
  criteriaCheckPassed: boolean;
  confidenceScore: number;
  evaluatorNotes?: string;
}

export interface VerdictResult {
  verdictId: string;
  taskId: string;
  verdict: VerdictType;
  confidenceScore: number;
  evaluatedAt: string;
}

export class SlaJudge {
  /**
   * Evaluates task completion against contract SLA criteria and records verdict.
   * If PASS with sufficient confidence (>= 0.80), advances task status to 'VERIFIED'.
   */
  public static evaluateTask(input: EvaluationInput, db: DatabaseManager): VerdictResult {
    if (input.confidenceScore < 0.0 || input.confidenceScore > 1.0) {
      throw new Error('INVALID_CONFIDENCE: Confidence score must be between 0.0 and 1.0.');
    }

    return db.withTransaction(() => {
      // 1. Fetch task
      const task = db
        .prepare('SELECT task_id, status, cycle_id, amount_cents FROM tasks WHERE task_id = ?')
        .get(input.taskId) as { task_id: string; status: string; cycle_id: string; amount_cents: number } | undefined;

      if (!task) {
        throw new Error(`TASK_NOT_FOUND: Task '${input.taskId}' does not exist.`);
      }
      if (task.status !== 'SUBMITTED' && task.status !== 'PENDING') {
        throw new Error(`TASK_INVALID_STATE: Cannot evaluate task in '${task.status}' status.`);
      }

      // 2. Determine Verdict
      let finalVerdict: VerdictType;
      if (!input.criteriaCheckPassed) {
        finalVerdict = 'FAIL';
      } else if (input.confidenceScore >= 0.8) {
        finalVerdict = 'PASS';
      } else {
        finalVerdict = 'REVIEW_REQUIRED';
      }

      const verdictId = uuidv4();
      const evaluatedAt = new Date().toISOString();

      // 3. Insert verdict into task_verdicts
      db.prepare(`
        INSERT INTO task_verdicts (verdict_id, task_id, evaluator_type, verdict, confidence_score, evaluator_notes, evaluated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        verdictId,
        input.taskId,
        input.evaluatorType,
        finalVerdict,
        input.confidenceScore,
        input.evaluatorNotes || null,
        evaluatedAt
      );

      // 4. Update task status according to verdict
      if (finalVerdict === 'PASS') {
        db.prepare(`
          UPDATE tasks 
          SET status = 'VERIFIED', completed_at = ? 
          WHERE task_id = ?
        `).run(evaluatedAt, input.taskId);

        // Record outbox event
        db.prepare(`
          INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
          VALUES (?, 'TASK_VERIFIED', ?, ?)
        `).run(
          uuidv4(),
          task.cycle_id,
          JSON.stringify({ taskId: input.taskId, verdictId, amountCents: task.amount_cents })
        );
      } else if (finalVerdict === 'FAIL') {
        db.prepare(`
          UPDATE tasks 
          SET status = 'REJECTED' 
          WHERE task_id = ?
        `).run(input.taskId);

        db.prepare(`
          INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
          VALUES (?, 'TASK_REJECTED', ?, ?)
        `).run(
          uuidv4(),
          task.cycle_id,
          JSON.stringify({ taskId: input.taskId, verdictId, notes: input.evaluatorNotes })
        );
      }

      return {
        verdictId,
        taskId: input.taskId,
        verdict: finalVerdict,
        confidenceScore: input.confidenceScore,
        evaluatedAt,
      };
    });
  }
}
