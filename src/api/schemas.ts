import { z } from 'zod';

export const RegisterAgentSchema = z.object({
  agentId: z.string().min(1, 'agentId is required').max(64),
  name: z.string().min(1, 'name is required').max(128),
  role: z.string().min(1, 'role is required').max(64),
  publicKey: z
    .string()
    .length(64, 'publicKey must be a 64-character hex string (32-byte Ed25519 raw key)')
    .regex(/^[0-9a-f]+$/i, 'publicKey must be hexadecimal'),
  paypalReceiverEmail: z.string().email('Invalid PayPal receiver email format'),
});

export const CreateCycleSchema = z.object({
  cycleId: z.string().min(1, 'cycleId is required').max(64),
});

export const CreateTaskSchema = z.object({
  taskId: z.string().min(1, 'taskId is required').max(64),
  cycleId: z.string().min(1, 'cycleId is required').max(64),
  debtorAgentId: z.string().min(1, 'debtorAgentId is required').max(64),
  creditorAgentId: z.string().min(1, 'creditorAgentId is required').max(64),
  title: z.string().min(1, 'title is required').max(256),
  slaContractRef: z.string().min(1, 'slaContractRef is required').max(256),
  amountCents: z.number().int('amountCents must be an integer').positive('amountCents must be positive'),
}).refine((data) => data.debtorAgentId !== data.creditorAgentId, {
  message: 'debtorAgentId and creditorAgentId cannot be the same agent',
  path: ['creditorAgentId'],
});

export const EvaluateTaskSchema = z.object({
  evaluatorType: z.enum(['PROGRAMMATIC_TEST', 'LLM_JUDGE', 'HYBRID']),
  criteriaCheckPassed: z.boolean(),
  confidenceScore: z.number().min(0.0).max(1.0),
  evaluatorNotes: z.string().optional(),
});

export const RecordIouSchema = z.object({
  iouId: z.string().min(1, 'iouId is required').max(64),
  taskId: z.string().min(1, 'taskId is required').max(64),
  cycleId: z.string().min(1, 'cycleId is required').max(64),
  debtorAgentId: z.string().min(1, 'debtorAgentId is required').max(64),
  creditorAgentId: z.string().min(1, 'creditorAgentId is required').max(64),
  amountCents: z.number().int('amountCents must be an integer').positive('amountCents must be positive'),
  signature: z
    .string()
    .length(128, 'signature must be a 128-character hex string (64-byte Ed25519 signature)')
    .regex(/^[0-9a-f]+$/i, 'signature must be hexadecimal'),
  signedPayload: z.string().min(1, 'signedPayload is required'),
  createdAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  expiresAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
}).refine((data) => data.debtorAgentId !== data.creditorAgentId, {
  message: 'debtorAgentId and creditorAgentId cannot be the same agent',
  path: ['creditorAgentId'],
});

export const FirewallApproveSchema = z.object({
  operatorCashCents: z.number().int().nonnegative().optional(),
});
