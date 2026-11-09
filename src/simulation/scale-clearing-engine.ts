import { generateAgentKeyPair, signPayload } from '../crypto/index.js';

export interface ScaleAgent {
  agentId: string;
  name: string;
  role: string;
  publicKeyHex: string;
  privateKeyHex: string;
  paypalReceiverEmail: string;
}

export interface ScaleIouRecord {
  iouId: string;
  taskId: string;
  debtorAgentId: string;
  debtorName: string;
  creditorAgentId: string;
  creditorName: string;
  taskTitle: string;
  amountCents: number;
  signature: string;
  signedPayload: {
    domain: string;
    iouId: string;
    taskId: string;
    cycleId: string;
    debtorAgentId: string;
    creditorAgentId: string;
    amountCents: number;
    currency: string;
    createdAt: string;
  };
  status: 'VERIFIED' | 'SETTLED';
}

export interface ScaleSettlementMovement {
  movementId: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  toAgentEmail: string;
  amountCents: number;
}

export interface ScaleNetPosition {
  agentId: string;
  name: string;
  role: string;
  grossCreditCents: number;
  grossDebtCents: number;
  netAmountCents: number;
  positionType: 'NET_DEBTOR' | 'NET_CREDITOR' | 'NET_ZERO';
}

export interface FeeModelConfig {
  captureFixedCents?: number;
  captureVariableRate?: number;
  payoutFixedCents?: number;
}

export interface ScaleSimulationResult {
  simulationId: string;
  seed: number;
  totalIousCount: number;
  totalAgentsCount: number;
  grossVolumeCents: number;
  netVolumeCents: number;
  liquidityCompressionRatio: number;
  bilateralTransactionCount: number;
  netSettlementMovementCount: number;
  transactionReductionRatio: number;
  zeroSumConservation: {
    sumNetCents: number;
    isZeroSum: boolean;
  };
  feeComparison: {
    assumptions: string;
    configuredRates: {
      captureFixedCents: number;
      captureVariableRate: number;
      payoutFixedCents: number;
      bilateralFixedFeeCents: number;
    };
    observedSandboxSample: {
      captureId: string;
      observedAmount: string;
      observedFee: string;
      payoutBatchId: string;
      observedPayoutFeePerItem: string;
      explanation: string;
    };
    traditionalRailFeeCents: number;
    tallyNexusRailFeeCents: number;
    feeSavingsCents: number;
    feeSavingsPercent: number;
    measuredSandboxRunRef?: string;
  };
  agents: ScaleAgent[];
  netPositions: ScaleNetPosition[];
  settlementMovements: ScaleSettlementMovement[];
  ious: ScaleIouRecord[];
  iousSample: ScaleIouRecord[];
}

function createPrng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runScaleClearingSimulation(
  iouCount: number = 1500,
  seed: number = 0x7a11,
  feeConfig?: FeeModelConfig
): ScaleSimulationResult {
  const rand = createPrng(seed);
  const simulationId = `sim_scale_${Date.now()}`;
  const cycleId = `cyc_scale_${Date.now()}`;

  // 1. Initialize 10 Swarm Agents
  const agentDefs = [
    { id: 'agt_strat', name: 'Strategy Agent', role: 'Lead Research Coordinator', email: 'strat@nexus.local' },
    { id: 'agt_scrape', name: 'Scraper Agent', role: 'Automated Web & API Data Scraper', email: 'scrape@nexus.local' },
    { id: 'agt_clean', name: 'ETL Cleaner Agent', role: 'Data Normalization & Deduplication', email: 'clean@nexus.local' },
    { id: 'agt_quant', name: 'Quant Modeling Agent', role: 'Statistical & Financial Time-Series', email: 'quant@nexus.local' },
    { id: 'agt_infer', name: 'Inference GPU Agent', role: 'High-Throughput Model Serving', email: 'infer@nexus.local' },
    { id: 'agt_fact', name: 'Fact-Check Agent', role: 'Citation & Hallucination Auditor', email: 'fact@nexus.local' },
    { id: 'agt_legal', name: 'Compliance Agent', role: 'Regulatory & License Verification', email: 'legal@nexus.local' },
    { id: 'agt_trans', name: 'Translation Agent', role: 'Multilingual Localization Specialist', email: 'trans@nexus.local' },
    { id: 'agt_synth', name: 'Synthesis Agent', role: 'Executive Deck & Report Generator', email: 'synth@nexus.local' },
    { id: 'agt_sec', name: 'Security Audit Agent', role: 'Cryptographic & Adversarial Defense', email: 'sec@nexus.local' },
  ];

  const agents: ScaleAgent[] = agentDefs.map((def) => {
    const keys = generateAgentKeyPair();
    return {
      agentId: def.id,
      name: def.name,
      role: def.role,
      publicKeyHex: keys.publicKeyHex,
      privateKeyHex: keys.privateKeyHex,
      paypalReceiverEmail: def.email,
    };
  });

  const agentMap = new Map<string, ScaleAgent>(agents.map((a) => [a.agentId, a]));

  const taskTemplates = [
    'Market Sentiment Crawl',
    'Financial Statement Parser',
    'GPU Cluster Regression Inference',
    'Citation Verification Matrix',
    'GDPR / CCPA Policy Audit',
    'Japanese Localization Pass',
    'German Technical Translation',
    'Executive Summary PDF Render',
    'SHA-256 Merkle Batch Anchor',
    'Adversarial Injection Defense Test',
    'SEC 10-K Data Normalization',
    'Options Volatility Surface Scan',
    'Real-time Order Book Aggregation',
    'Hallucination Attribution Map',
    'Token Boundary Pruning Pass',
  ];

  // 2. Generate 1,500 deterministic, cryptographically signed micro-IOUs
  const ious: ScaleIouRecord[] = [];
  let grossVolumeCents = 0;

  // Track gross credits and debits per agent
  const grossDebts: Record<string, number> = {};
  const grossCredits: Record<string, number> = {};
  for (const a of agents) {
    grossDebts[a.agentId] = 0;
    grossCredits[a.agentId] = 0;
  }

  for (let i = 1; i <= iouCount; i++) {
    const debtorIdx = Math.floor(rand() * agents.length);
    let creditorIdx = Math.floor(rand() * agents.length);
    while (creditorIdx === debtorIdx) {
      creditorIdx = Math.floor(rand() * agents.length);
    }

    const debtor = agents[debtorIdx];
    const creditor = agents[creditorIdx];

    // Amounts range from $1.50 (150c) to $65.00 (6500c)
    const amountCents = Math.floor(150 + rand() * 6350);
    const taskTitle = taskTemplates[Math.floor(rand() * taskTemplates.length)];
    const taskId = `tsk_scale_${i.toString().padStart(5, '0')}`;
    const iouId = `iou_scale_${i.toString().padStart(5, '0')}`;
    const createdAt = new Date(1773000000000 + i * 1000).toISOString();

    const payload = {
      domain: 'tally-nexus:iou:v1',
      iouId,
      taskId,
      cycleId,
      debtorAgentId: debtor.agentId,
      creditorAgentId: creditor.agentId,
      amountCents,
      currency: 'USD',
      createdAt,
    };

    const signature = signPayload(payload, debtor.privateKeyHex);

    ious.push({
      iouId,
      taskId,
      debtorAgentId: debtor.agentId,
      debtorName: debtor.name,
      creditorAgentId: creditor.agentId,
      creditorName: creditor.name,
      taskTitle,
      amountCents,
      signature,
      signedPayload: payload,
      status: 'VERIFIED',
    });

    grossVolumeCents += amountCents;
    grossDebts[debtor.agentId] += amountCents;
    grossCredits[creditor.agentId] += amountCents;
  }

  // 3. Compute Net Positions
  let sumNetCents = 0;
  const netPositions: ScaleNetPosition[] = agents.map((a) => {
    const deb = grossDebts[a.agentId];
    const cred = grossCredits[a.agentId];
    const net = cred - deb;
    sumNetCents += net;

    let positionType: ScaleNetPosition['positionType'] = 'NET_ZERO';
    if (net < 0) positionType = 'NET_DEBTOR';
    else if (net > 0) positionType = 'NET_CREDITOR';

    return {
      agentId: a.agentId,
      name: a.name,
      role: a.role,
      grossCreditCents: cred,
      grossDebtCents: deb,
      netAmountCents: net,
      positionType,
    };
  });

  // Calculate Net Settled Volume (Sum of all positive creditor entitlements)
  const netVolumeCents = netPositions
    .filter((p) => p.netAmountCents > 0)
    .reduce((sum, p) => sum + p.netAmountCents, 0);

  const compressionRatio =
    grossVolumeCents > 0
      ? Math.round((1 - netVolumeCents / grossVolumeCents) * 10000) / 10000
      : 0;

  // 4. Multilateral Netting Consolidated Settlement Movements
  // Greedy matching: Debtors transfer directly to Creditors in minimal O(V) movements
  const debtors = netPositions
    .filter((p) => p.netAmountCents < 0)
    .map((p) => ({ agentId: p.agentId, deficit: Math.abs(p.netAmountCents) }));

  const creditors = netPositions
    .filter((p) => p.netAmountCents > 0)
    .map((p) => ({ agentId: p.agentId, credit: p.netAmountCents }));

  const settlementMovements: ScaleSettlementMovement[] = [];
  let dIdx = 0;
  let cIdx = 0;
  let moveCount = 1;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const d = debtors[dIdx];
    const c = creditors[cIdx];
    const transferCents = Math.min(d.deficit, c.credit);

    if (transferCents > 0) {
      const debtorAgent = agentMap.get(d.agentId)!;
      const creditorAgent = agentMap.get(c.agentId)!;

      settlementMovements.push({
        movementId: `move_${moveCount.toString().padStart(3, '0')}`,
        fromAgentId: d.agentId,
        fromAgentName: debtorAgent.name,
        toAgentId: c.agentId,
        toAgentName: creditorAgent.name,
        toAgentEmail: creditorAgent.paypalReceiverEmail,
        amountCents: transferCents,
      });
      moveCount++;

      d.deficit -= transferCents;
      c.credit -= transferCents;
    }

    if (d.deficit === 0) dIdx++;
    if (c.credit === 0) cIdx++;
  }

  const transactionReductionRatio =
    Math.round((1 - settlementMovements.length / ious.length) * 10000) / 10000;

  // 5. Configurable Financial Fee Savings Model
  // Default published PayPal commercial rates:
  // - Orders v2 Capture: 49¢ fixed ($0.49) + 3.49% variable rate
  // - Payouts v1 Disbursement: 25¢ fixed ($0.25) per recipient item
  // - Bilateral baseline: 74¢ fixed (49¢ + 25¢) + 3.49% volume fee per transfer
  const captureFixedCents = feeConfig?.captureFixedCents ?? 49;
  const captureVariableRate = feeConfig?.captureVariableRate ?? 0.0349;
  const payoutFixedCents = feeConfig?.payoutFixedCents ?? 25;
  const bilateralFixedFeeCents = captureFixedCents + payoutFixedCents;

  const traditionalRailFeeCents = Math.round(
    ious.length * bilateralFixedFeeCents + grossVolumeCents * captureVariableRate
  );
  const tallyNexusRailFeeCents = Math.round(
    settlementMovements.length * bilateralFixedFeeCents + netVolumeCents * captureVariableRate
  );
  const feeSavingsCents = traditionalRailFeeCents - tallyNexusRailFeeCents;
  const feeSavingsPercent =
    Math.round((feeSavingsCents / traditionalRailFeeCents) * 10000) / 100;

  return {
    simulationId,
    seed,
    totalIousCount: ious.length,
    totalAgentsCount: agents.length,
    grossVolumeCents,
    netVolumeCents,
    liquidityCompressionRatio: compressionRatio,
    bilateralTransactionCount: ious.length,
    netSettlementMovementCount: settlementMovements.length,
    transactionReductionRatio,
    zeroSumConservation: {
      sumNetCents,
      isZeroSum: sumNetCents === 0,
    },
    feeComparison: {
      assumptions: `Modeled using published PayPal rates: ${captureFixedCents}¢ capture + ${payoutFixedCents}¢ payout (${bilateralFixedFeeCents}¢ fixed) + ${(captureVariableRate * 100).toFixed(2)}% variable per bilateral transfer. Observed sandbox sample: $0.54 on $1.00 (reflects 1.5% international cross-border fee).`,
      configuredRates: {
        captureFixedCents,
        captureVariableRate,
        payoutFixedCents,
        bilateralFixedFeeCents,
      },
      observedSandboxSample: {
        captureId: '7PV82720RX415822V',
        observedAmount: '$1.00 USD',
        observedFee: '$0.54 USD',
        payoutBatchId: 'N4M49PUHNCNQ4',
        observedPayoutFeePerItem: '$0.25 USD',
        explanation: 'Base PayPal Checkout rate is 3.49% + $0.49 (= $0.52); international cross-border merchant accounts incur +1.50% fee (4.99% + $0.49 = $0.54).'
      },
      traditionalRailFeeCents,
      tallyNexusRailFeeCents,
      feeSavingsCents,
      feeSavingsPercent,
      measuredSandboxRunRef: 'Capture 7PV82720RX415822V (Orders v2) & Batch N4M49PUHNCNQ4 (Payouts v1)',
    },
    agents,
    netPositions,
    settlementMovements,
    ious,
    iousSample: ious.slice(0, 500), // Sample for virtualized AG Grid presentation
  };
}
