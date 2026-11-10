const fs = require('fs');
const { execSync } = require('child_process');

const moves = [
  ['ARCHITECTURE.md', 'docs/architecture/ARCHITECTURE.md'],
  ['FINAL_ARCHITECTURE_DECISIONS.md', 'docs/architecture/FINAL_ARCHITECTURE_DECISIONS.md'],
  ['FINAL_MASTER_PLAN.md', 'docs/architecture/FINAL_MASTER_PLAN.md'],
  ['DECISIONS.md', 'docs/architecture/DECISIONS.md'],
  ['FLOW.md', 'docs/architecture/FLOW.md'],
  ['DESIGN.md', 'docs/architecture/DESIGN.md'],
  ['PRD.md', 'docs/architecture/PRD.md'],
  ['PRODUCT.md', 'docs/architecture/PRODUCT.md'],
  ['IMPLEMENTATION_ROADMAP.md', 'docs/architecture/IMPLEMENTATION_ROADMAP.md'],

  ['API_SPEC.md', 'docs/api/API_SPEC.md'],
  ['DATABASE_SCHEMA.md', 'docs/database/DATABASE_SCHEMA.md'],

  ['PAYPAL_INTEGRATION_DESIGN.md', 'docs/integrations/paypal/PAYPAL_INTEGRATION_DESIGN.md'],
  ['PAYPAL_SANDBOX_EXECUTION_PLAN.md', 'docs/integrations/paypal/PAYPAL_SANDBOX_EXECUTION_PLAN.md'],
  ['PAYPAL_SANDBOX_VALIDATION.md', 'docs/integrations/paypal/PAYPAL_SANDBOX_VALIDATION.md'],
  ['PAYPAL_FAILURE_MATRIX.md', 'docs/integrations/paypal/PAYPAL_FAILURE_MATRIX.md'],
  ['PAYPAL_STATE_MACHINE.md', 'docs/integrations/paypal/PAYPAL_STATE_MACHINE.md'],

  ['SECURITY_THREAT_MODEL.md', 'docs/security/SECURITY_THREAT_MODEL.md'],
  ['DEPENDENCY_AND_LICENSE_AUDIT.md', 'docs/security/DEPENDENCY_AND_LICENSE_AUDIT.md'],
  ['REPOSITORY_AND_SKILLS_AUDIT.md', 'docs/security/REPOSITORY_AND_SKILLS_AUDIT.md'],

  ['DEPLOYMENT_PLAN.md', 'docs/deployment/DEPLOYMENT_PLAN.md'],
  ['TEST_STRATEGY.md', 'docs/testing/TEST_STRATEGY.md'],

  ['SUBMISSION.md', 'docs/submission/SUBMISSION.md'],
  ['DEMO_SCRIPT.md', 'docs/submission/DEMO_SCRIPT.md'],

  ['FINAL_IMPLEMENTATION_READINESS_REPORT.md', 'docs/reports/final/FINAL_IMPLEMENTATION_READINESS_REPORT.md'],
  ['PHASE_5_19_FINAL_RECOVERY_SAFETY_CURE_REPORT.md', 'docs/reports/phase-5/PHASE_5_19_FINAL_RECOVERY_SAFETY_CURE_REPORT.md'],
  ['PHASE_5_20_INDEPENDENT_SAFETY_HARDENING_REPORT.md', 'docs/reports/phase-5/PHASE_5_20_INDEPENDENT_SAFETY_HARDENING_REPORT.md'],
  ['PHASE_5_21_ADVERSARIAL_AUDIT_REPORT.md', 'docs/reports/phase-5/PHASE_5_21_ADVERSARIAL_AUDIT_REPORT.md'],
  ['PHASE_5_23_FINAL_INDEPENDENT_VERIFICATION_REPORT.md', 'docs/reports/phase-5/PHASE_5_23_FINAL_INDEPENDENT_VERIFICATION_REPORT.md'],
  ['PHASE_6_FINAL_REPORT.md', 'docs/reports/phase-6/PHASE_6_FINAL_REPORT.md'],
  ['PHASE_7_SUBMISSION_REPORT.md', 'docs/reports/phase-7/PHASE_7_SUBMISSION_REPORT.md'],
  ['PHASE_8_RELEASE_CHECKLIST.md', 'docs/reports/phase-8/PHASE_8_RELEASE_CHECKLIST.md'],
  ['PHASE_9_CROSS_SYSTEM_INTEGRITY_REPORT.md', 'docs/reports/phase-9/PHASE_9_CROSS_SYSTEM_INTEGRITY_REPORT.md'],
  ['PHASE_9_DESIGN_TRANSFORMATION_REPORT.md', 'docs/reports/phase-9/PHASE_9_DESIGN_TRANSFORMATION_REPORT.md'],
  ['progress.txt', 'docs/reports/progress.txt'],

  ['verify_phase5_19_complete_suite.py', 'scripts/archive/verify_phase5_19_complete_suite.py'],
  ['verify_phase5_20_complete_suite.py', 'scripts/archive/verify_phase5_20_complete_suite.py'],
  ['verify_phase5_22_complete_suite.py', 'scripts/archive/verify_phase5_22_complete_suite.py']
];

console.log('Starting git mv operations...');
let movedCount = 0;
for (const [src, dst] of moves) {
  if (fs.existsSync(src)) {
    execSync('git mv "' + src + '" "' + dst + '"', { stdio: 'pipe' });
    console.log('git mv: ' + src + ' -> ' + dst);
    movedCount++;
  } else {
    console.log('Skip (not found): ' + src);
  }
}
console.log('Total files moved via git mv:', movedCount);

