import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { canonicalizeJson } from '../../src/crypto/canonical-json.js';
import { IouService, IOU_DOMAIN_V1 } from '../../src/ious/iou-service.js';
import { generateAgentKeyPair } from '../../src/crypto/agent-keys.js';
import { DatabaseManager } from '../../src/db/index.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const RFC_TEST_DB = resolve(process.cwd(), './data/test_rfc8785.db');

function cleanupDb(path: string) {
  for (const ext of ['', '-wal', '-shm']) {
    const f = path + ext;
    if (existsSync(f)) {
      try {
        unlinkSync(f);
      } catch {
        // ignore
      }
    }
  }
}

describe('RFC 8785 Canonical JSON & Cryptographic Domain Hardening', () => {
  describe('RFC 8785 JCS Compliance Suite', () => {
    it('1. Sorts object keys strictly by UTF-16 code units', () => {
      const input = {
        z: 1,
        a: 2,
        b: 3,
        _underscore: 4,
        '\u00e9': 5,
        e: 6,
      };
      // UTF-16 order: _ (0x5F), a (0x61), b (0x62), e (0x65), z (0x7A), \u00e9 (0xE9)
      const expected = '{"_underscore":4,"a":2,"b":3,"e":6,"z":1,"\u00e9":5}';
      expect(canonicalizeJson(input)).toBe(expected);
    });

    it('2. Eliminates all whitespace inside strings, objects, and arrays', () => {
      const input = {
        title: 'Tally Nexus Protocol',
        nested: { inner: 'value with spaces' },
        list: [1, 2, 3],
      };
      const result = canonicalizeJson(input);
      expect(result).not.toMatch(/\s{2,}/);
      expect(result).toBe('{"list":[1,2,3],"nested":{"inner":"value with spaces"},"title":"Tally Nexus Protocol"}');
    });

    it('3. Serializes IEEE 754 numbers deterministically and normalizes -0 to 0', () => {
      expect(canonicalizeJson(-0)).toBe('0');
      expect(canonicalizeJson(0)).toBe('0');
      expect(canonicalizeJson(12345.67)).toBe('12345.67');
      expect(canonicalizeJson(1e5)).toBe('100000');
    });

    it('4. Rejects non-finite numbers (NaN, Infinity, -Infinity)', () => {
      expect(() => canonicalizeJson(NaN)).toThrow(/RFC8785_SERIALIZATION_ERROR/);
      expect(() => canonicalizeJson(Infinity)).toThrow(/RFC8785_SERIALIZATION_ERROR/);
      expect(() => canonicalizeJson(-Infinity)).toThrow(/RFC8785_SERIALIZATION_ERROR/);
      expect(() => canonicalizeJson({ val: NaN })).toThrow(/RFC8785_SERIALIZATION_ERROR/);
    });

    it('5. Handles undefined correctly: omitted in objects, converted to null in arrays', () => {
      const objWithUndefined = {
        present: 'ok',
        missing: undefined,
        nested: { kept: 1, dropped: undefined },
      };
      expect(canonicalizeJson(objWithUndefined)).toBe('{"nested":{"kept":1},"present":"ok"}');

      const arrayWithUndefined = [1, undefined, 'test', undefined, null];
      expect(canonicalizeJson(arrayWithUndefined)).toBe('[1,null,"test",null,null]');
    });

    it('6. Rejects top-level undefined and non-serializable types', () => {
      expect(() => canonicalizeJson(undefined)).toThrow(/Top-level undefined cannot be serialized/);
      expect(() => canonicalizeJson(() => {})).toThrow(/cannot be serialized/);
      expect(() => canonicalizeJson(Symbol('test'))).toThrow(/cannot be serialized/);
    });

    it('7. Handles deeply nested mixed arrays and objects deterministically', () => {
      const deep = {
        z_array: [
          { b: 2, a: 1, un: undefined },
          [undefined, { beta: 2, alpha: 1 }],
        ],
        a_obj: {
          flag: true,
          nil: null,
        },
      };
      const expected =
        '{"a_obj":{"flag":true,"nil":null},"z_array":[{"a":1,"b":2},[null,{"alpha":1,"beta":2}]]}';
      expect(canonicalizeJson(deep)).toBe(expected);
    });
  });

  describe('Cryptographic Domain Separation & Context Validation', () => {
    let db: DatabaseManager;
    let agentA: { publicKeyHex: string; privateKeyHex: string };
    let agentB: { publicKeyHex: string; privateKeyHex: string };

    beforeAll(() => {
      const dir = dirname(RFC_TEST_DB);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      cleanupDb(RFC_TEST_DB);

      db = new DatabaseManager({ dbPath: RFC_TEST_DB });
      db.runMigrations();

      agentA = generateAgentKeyPair();
      agentB = generateAgentKeyPair();

      db.exec(`
        INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email) VALUES
        ('agt_rfc_a', 'Debtor A', 'Buyer', '${agentA.publicKeyHex}', 'debtor@test.local'),
        ('agt_rfc_b', 'Creditor B', 'Seller', '${agentB.publicKeyHex}', 'creditor@test.local');

        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_rfc_01', 'CREATED');

        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status) VALUES
        ('task_rfc_01', 'cyc_rfc_01', 'agt_rfc_a', 'agt_rfc_b', 'RFC Task', 'sha_sla_rfc', 2500, 'VERIFIED');
      `);
    });

    afterAll(() => {
      if (db) db.close();
      cleanupDb(RFC_TEST_DB);
    });

    it('8. Embeds domain tag, unique iouId, and validity expiration in signed payload', () => {
      const signedIou = IouService.signIou(
        {
          taskId: 'task_rfc_01',
          cycleId: 'cyc_rfc_01',
          debtorAgentId: 'agt_rfc_a',
          creditorAgentId: 'agt_rfc_b',
          amountCents: 2500,
        },
        agentA.privateKeyHex
      );

      const parsed = JSON.parse(signedIou.signedPayload);
      expect(parsed.domain).toBe(IOU_DOMAIN_V1);
      expect(parsed.iouId).toBe(signedIou.iouId);
      expect(parsed.expiresAt).toBeDefined();

      const res = IouService.recordIou(signedIou, db);
      expect(res.iouId).toBe(signedIou.iouId);
    });

    it('9. Rejects IOU with invalid or foreign domain tag (Cross-Protocol Replay Guard)', () => {
      // Manually construct payload with invalid domain
      const badPayload = {
        domain: 'other-protocol:iou:v2',
        iouId: 'iou_bad_domain',
        taskId: 'task_rfc_01',
        cycleId: 'cyc_rfc_01',
        debtorAgentId: 'agt_rfc_a',
        creditorAgentId: 'agt_rfc_b',
        amountCents: 2500,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      };
      const canonical = canonicalizeJson(badPayload);

      expect(() => {
        IouService.recordIou(
          {
            iouId: 'iou_bad_domain',
            taskId: 'task_rfc_01',
            cycleId: 'cyc_rfc_01',
            debtorAgentId: 'agt_rfc_a',
            creditorAgentId: 'agt_rfc_b',
            amountCents: 2500,
            signature: '00'.repeat(64),
            signedPayload: canonical,
            createdAt: badPayload.createdAt,
            expiresAt: badPayload.expiresAt,
          },
          db
        );
      }).toThrow(/INVALID_DOMAIN/);
    });

    it('10. Rejects IOU with expired validity timestamp', () => {
      // Validity duration -1000ms (already expired)
      const expiredIou = IouService.signIou(
        {
          taskId: 'task_rfc_01',
          cycleId: 'cyc_rfc_01',
          debtorAgentId: 'agt_rfc_a',
          creditorAgentId: 'agt_rfc_b',
          amountCents: 2500,
          validityDurationMs: -1000,
        },
        agentA.privateKeyHex
      );

      expect(() => {
        IouService.recordIou(expiredIou, db);
      }).toThrow(/IOU_EXPIRED/);
    });

    it('11. Rejects IOU on context mismatch between payload and declared properties', () => {
      const validIou = IouService.signIou(
        {
          taskId: 'task_rfc_01',
          cycleId: 'cyc_rfc_01',
          debtorAgentId: 'agt_rfc_a',
          creditorAgentId: 'agt_rfc_b',
          amountCents: 2500,
        },
        agentA.privateKeyHex
      );

      // Context mismatch: caller declares amountCents: 3000 but payload has 2500
      expect(() => {
        IouService.recordIou(
          {
            ...validIou,
            amountCents: 3000,
          },
          db
        );
      }).toThrow(/CONTEXT_MISMATCH/);
    });
  });
});
