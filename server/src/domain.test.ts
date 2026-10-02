import test from 'node:test';
import assert from 'node:assert/strict';
import { approve, auditEvents, budgetLines, createApproval, projectSummary, reviewContext, rightsConflicts } from './domain.js';

test('budget summary exposes forecast variance and high risk lines', () => {
  const summary = projectSummary('PRJ-001');
  assert.equal(summary.lines.length, 4);
  assert.ok(summary.forecast > summary.planned);
  assert.equal(summary.highRiskLines.length, 1);
});

test('rights conflict engine detects overlapping licensed assets', () => {
  const conflicts = rightsConflicts('PRJ-001');
  assert.ok(conflicts.length >= 1);
  assert.ok(conflicts.some(item => item.reason.includes('音乐-同步许可')));
  assert.ok(conflicts.some(item => item.assetAId === 'AST-001' && item.assetBId === 'AST-003'));
});

test('budget overrun review loads four ledgers, contracts and risk without leaving console context', () => {
  const context = reviewContext('APR-01');
  assert.ok(context);
  assert.equal(context?.approval.entityType, 'budget');
  assert.equal(context?.budget.versionId, 'BUD-001-V3');
  assert.ok(context!.budget.planned > 0);
  assert.ok(context!.budget.committed > 0);
  assert.ok(context!.budget.actual > 0);
  assert.ok(context!.budget.forecast > context!.budget.planned);
  assert.equal(context!.budget.highRiskLines[0].id, 'BL-103');
  assert.ok(context!.budget.openMilestones.some(milestone => milestone.vendor === '曜石后期制作'));
  assert.equal(context!.assets.registry.length, 3);
  assert.ok(context!.delivery);
  assert.deepEqual(context!.missingData, []);
  assert.deepEqual(context!.blockingReasons, []);
  assert.equal(context!.actionable, true);
});

test('final master lock is non-actionable when target asset has a critical rights conflict', () => {
  const context = reviewContext('APR-02');
  assert.equal(context?.assets.target?.id, 'AST-001');
  assert.equal(context?.assets.target?.version, 7);
  assert.ok(context!.assets.conflicts.some(conflict => conflict.severity === 'critical'));
  assert.equal(context!.actionable, false);
  assert.ok(context!.blockingReasons.some(reason => reason.includes('critical 授权冲突')));
  assert.ok(context!.budget.lines.length > 0);
  assert.ok(context!.delivery?.blockers.some(blocker => blocker.reason.includes('简体中文字幕')));
});

test('delivery review reports checklist, node and hard blocking reasons', () => {
  const context = reviewContext('APR-03');
  assert.equal(context?.delivery.packageId, 'DEL-007');
  assert.equal(context.delivery.requiredCount, 3);
  assert.equal(context.delivery.readyCount, 3);
  assert.equal(context.delivery.node.status, 'at_risk');
  assert.equal(context.delivery.blockers.some(blocker => blocker.blocksApproval), false);
  assert.equal(context.actionable, false);
  assert.ok(context.blockingReasons[0].includes('已通过'));
});

test('opening or refreshing review context does not change todos or audit events', () => {
  const beforeAuditCount = auditEvents.length;
  const first = reviewContext('APR-01');
  const second = reviewContext('APR-01');
  assert.equal(first?.contextVersion, second?.contextVersion);
  assert.equal(first?.approval.status, 'pending');
  assert.equal(second?.approval.status, 'pending');
  assert.equal(auditEvents.length, beforeAuditCount);
});

test('approval refuses a stale review basis and returns current context without auditing', () => {
  const stale = reviewContext('APR-01');
  const line = budgetLines.find(item => item.id === 'BL-103');
  assert.ok(line);
  const originalForecast = line!.forecast;
  const beforeAuditCount = auditEvents.length;
  line!.forecast += 100000;
  const result = approve('APR-01', 'approved', '预算已复核', stale!.contextVersion);
  line!.forecast = originalForecast;

  assert.equal('code' in result ? result.code : '', 'version_stale');
  assert.equal(auditEvents.length, beforeAuditCount);
  assert.equal(reviewContext('APR-01')?.approval.status, 'pending');
});

test('guarded approval changes are auditable and stateful', () => {
  const draft = createApproval({
    projectId: 'PRJ-002',
    entityType: 'delivery',
    entityId: 'DEL-007',
    title: '测试交付复核',
    requestedBy: '测试发起人',
    approver: '测试审批人'
  });
  const context = reviewContext(draft.id);
  assert.ok(context);
  const beforeAuditCount = auditEvents.length;
  const result = approve(draft.id, 'approved', '交付已复核', context!.contextVersion);
  assert.equal('id' in result ? result.status : '', 'approved');
  assert.equal(reviewContext(draft.id)?.approval.status, 'approved');
  assert.equal(auditEvents.length, beforeAuditCount + 1);
});
