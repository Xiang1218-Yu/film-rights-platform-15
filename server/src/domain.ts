export type ProjectStatus = 'development' | 'production' | 'post' | 'delivered';
export type AssetType = 'master' | 'trailer' | 'poster' | 'audio' | 'subtitle';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type DeliveryItemStatus = 'ready' | 'missing' | 'blocked';
export type DeliveryNodeStatus = 'on_track' | 'at_risk' | 'blocked' | 'done';

export interface Project { id: string; code: string; title: string; season: number; status: ProjectStatus; currency: string; budgetVersionId: string; deliveryDate: string; }
export interface BudgetLine { id: string; projectId: string; category: string; subcategory: string; planned: number; committed: number; actual: number; forecast: number; owner: string; risk: 'low' | 'medium' | 'high'; }
export interface Contract { id: string; projectId: string; vendor: string; scope: string; ceiling: number; committed: number; paid: number; milestones: { name: string; due: string; amount: number; status: 'open' | 'invoiced' | 'paid' }[]; }
export interface Asset { id: string; projectId: string; name: string; type: AssetType; version: number; status: 'draft' | 'review' | 'approved' | 'locked'; owner: string; checksum: string; territories: string[]; platforms: string[]; availableFrom: string; availableTo: string; rightsTags: string[]; }
export interface Approval { id: string; projectId: string; entityType: 'budget' | 'asset' | 'delivery'; entityId: string; title: string; requestedBy: string; status: ApprovalStatus; approver: string; createdAt: string; comment?: string; }
export interface AuditEvent { id: string; action: string; entity: string; entityId: string; actor: string; at: string; details: string; }
export interface DeliveryChecklistItem { id: string; name: string; status: DeliveryItemStatus; required: boolean; assetId?: string; checksum?: string; reason?: string; }
export interface DeliveryNode { name: string; due: string; owner: string; status: DeliveryNodeStatus; }
export interface DeliveryBlocker { id: string; severity: 'critical' | 'warning'; reason: string; blocksApproval: boolean; }
export interface DeliveryPackage { id: string; projectId: string; title: string; node: DeliveryNode; checklist: DeliveryChecklistItem[]; blockers: DeliveryBlocker[]; }

export interface RightsConflict { severity: 'critical' | 'warning'; assetAId: string; assetBId: string; assetA: string; assetB: string; reason: string; }
export interface BudgetReview {
  versionId: string;
  planned: number;
  committed: number;
  actual: number;
  forecast: number;
  variance: number;
  variancePct: number;
  contractExposure: number;
  riskLevel: 'low' | 'medium' | 'high';
  highRiskLines: BudgetLine[];
  lines: BudgetLine[];
  openMilestones: { vendor: string; name: string; due: string; amount: number; status: string }[];
}
export interface AssetReview { target?: Asset; registry: Asset[]; conflicts: RightsConflict[]; criticalCount: number; warningCount: number; }
export interface DeliveryReview { packageId: string; title: string; node: DeliveryNode; checklist: DeliveryChecklistItem[]; blockers: DeliveryBlocker[]; readyCount: number; requiredCount: number; }
export interface ReviewContext {
  approval: Approval;
  project: Project;
  actionable: boolean;
  contextVersion: string;
  entityVersion: string;
  riskFingerprint: string;
  missingData: string[];
  blockingReasons: string[];
  budget: BudgetReview;
  assets: AssetReview;
  delivery?: DeliveryReview;
  loadedAt: string;
}
export interface ApprovalDecisionError { code: 'version_stale' | 'not_actionable' | 'already_decided'; message: string; context: ReviewContext; }

const now = Date.now();
const iso = (days: number) => new Date(now + days * 86400000).toISOString().slice(0, 10);

export const projects: Project[] = [
  { id: 'PRJ-001', code: 'NORTHSTAR-S1', title: 'Northstar / 北境回声', season: 1, status: 'post', currency: 'CNY', budgetVersionId: 'BUD-001-V3', deliveryDate: iso(44) },
  { id: 'PRJ-002', code: 'ORBIT-DOC', title: 'Orbit / 轨道之外', season: 1, status: 'production', currency: 'CNY', budgetVersionId: 'BUD-002-V2', deliveryDate: iso(126) }
];
export const budgetLines: BudgetLine[] = [
  { id: 'BL-101', projectId: 'PRJ-001', category: '制作', subcategory: '主演与主创', planned: 12800000, committed: 11200000, actual: 10400000, forecast: 13100000, owner: '制片部', risk: 'medium' },
  { id: 'BL-102', projectId: 'PRJ-001', category: '制作', subcategory: '摄影器材与场地', planned: 6800000, committed: 6400000, actual: 5980000, forecast: 7020000, owner: '现场制片', risk: 'low' },
  { id: 'BL-103', projectId: 'PRJ-001', category: '后期', subcategory: '调色、DIT、母版', planned: 5400000, committed: 4300000, actual: 2800000, forecast: 5750000, owner: '后期制片', risk: 'high' },
  { id: 'BL-104', projectId: 'PRJ-001', category: '宣发', subcategory: '预告片与物料', planned: 3600000, committed: 1900000, actual: 1240000, forecast: 3200000, owner: '营销部', risk: 'medium' },
  { id: 'BL-201', projectId: 'PRJ-002', category: '制作', subcategory: '跨国拍摄', planned: 9200000, committed: 5100000, actual: 3300000, forecast: 9000000, owner: '制片部', risk: 'medium' }
];
export const contracts: Contract[] = [
  { id: 'CTR-01', projectId: 'PRJ-001', vendor: '曜石后期制作', scope: '4K HDR 调色、声音、DCP 母版', ceiling: 5200000, committed: 4300000, paid: 2300000, milestones: [{ name: '锁剪交付', due: iso(8), amount: 1200000, status: 'invoiced' }, { name: '母版验收', due: iso(36), amount: 2000000, status: 'open' }] },
  { id: 'CTR-02', projectId: 'PRJ-001', vendor: '远景国际版权', scope: '北美与欧洲音乐同步许可', ceiling: 880000, committed: 880000, paid: 440000, milestones: [{ name: '签署', due: iso(-16), amount: 440000, status: 'paid' }, { name: '交付版权证明', due: iso(4), amount: 440000, status: 'invoiced' }] },
  { id: 'CTR-03', projectId: 'PRJ-002', vendor: '云帧视觉', scope: '纪录片航拍与卫星素材', ceiling: 1600000, committed: 1100000, paid: 600000, milestones: [{ name: '素材包一', due: iso(20), amount: 500000, status: 'open' }] }
];
export const assets: Asset[] = [
  { id: 'AST-001', projectId: 'PRJ-001', name: '北境回声 S01E01 4K HDR Master', type: 'master', version: 7, status: 'review', owner: '后期制片', checksum: 'sha256:91b7…e2a1', territories: ['CN', 'HK', 'SG'], platforms: ['影院', 'StreamBox'], availableFrom: iso(-2), availableTo: iso(730), rightsTags: ['音乐-同步许可', '演员-全媒介'] },
  { id: 'AST-002', projectId: 'PRJ-001', name: '主预告 90s / Cut A', type: 'trailer', version: 4, status: 'approved', owner: '营销部', checksum: 'sha256:42ca…9b02', territories: ['CN'], platforms: ['StreamBox', '短视频'], availableFrom: iso(6), availableTo: iso(180), rightsTags: ['演员-宣传许可'] },
  { id: 'AST-003', projectId: 'PRJ-001', name: '片尾曲 / Winter Signal', type: 'audio', version: 2, status: 'locked', owner: '音乐版权', checksum: 'sha256:113c…78f0', territories: ['CN', 'US', 'CA'], platforms: ['影院', 'StreamBox'], availableFrom: iso(-40), availableTo: iso(52), rightsTags: ['音乐-同步许可'] },
  { id: 'AST-004', projectId: 'PRJ-002', name: 'Orbit E02 Satellite Plates', type: 'master', version: 3, status: 'review', owner: '视觉总监', checksum: 'sha256:8a10…4a9d', territories: ['全球'], platforms: ['影院'], availableFrom: iso(18), availableTo: iso(365), rightsTags: ['航拍-编辑许可'] }
];
export const deliveryPackages: DeliveryPackage[] = [
  {
    id: 'DEL-001', projectId: 'PRJ-001', title: '院线与 StreamBox 首发交付包',
    node: { name: 'DCP / 流媒体母版交付', due: iso(40), owner: '后期统筹', status: 'blocked' },
    checklist: [
      { id: 'DLI-001', name: '4K HDR 最终母版', assetId: 'AST-001', checksum: 'sha256:91b7…e2a1', status: 'blocked', required: true, reason: '等待最终母版锁定，并在锁定后复核 checksum' },
      { id: 'DLI-002', name: '主预告 90s / Cut A', assetId: 'AST-002', checksum: 'sha256:42ca…9b02', status: 'ready', required: true },
      { id: 'DLI-003', name: '院线 DCP 封装包', status: 'missing', required: true, reason: 'DCP 封装清单与校验值未上传' },
      { id: 'DLI-004', name: '简体中文字幕 / SCC', status: 'missing', required: true, reason: '字幕文件及 checksum 未登记' }
    ],
    blockers: []
  },
  {
    id: 'DEL-007', projectId: 'PRJ-002', title: '海外节展交付包',
    node: { name: '节展 secure uploader 上传', due: iso(25), owner: '发行统筹', status: 'at_risk' },
    checklist: [
      { id: 'DLI-101', name: 'E02 Satellite Plates master', assetId: 'AST-004', checksum: 'sha256:8a10…4a9d', status: 'ready', required: true },
      { id: 'DLI-102', name: '节展展映授权函', checksum: 'doc:7f92…ac18', status: 'ready', required: true },
      { id: 'DLI-103', name: '英文嵌入式字幕', checksum: 'sha256:30bd…77e4', status: 'ready', required: true }
    ],
    blockers: [
      { id: 'DLB-101', severity: 'warning', reason: '节展授权窗口尚不含后续院线延展期', blocksApproval: false }
    ]
  }
];
export const approvals: Approval[] = [
  { id: 'APR-01', projectId: 'PRJ-001', entityType: 'budget', entityId: 'BUD-001-V3', title: '后期超支预案 V3', requestedBy: '制片主任', status: 'pending', approver: '财务负责人', createdAt: iso(-1) },
  { id: 'APR-02', projectId: 'PRJ-001', entityType: 'asset', entityId: 'AST-001', title: 'E01 最终母版锁定', requestedBy: '后期制片', status: 'pending', approver: '总制片人', createdAt: iso(-2) },
  { id: 'APR-03', projectId: 'PRJ-002', entityType: 'delivery', entityId: 'DEL-007', title: '海外节展交付包', requestedBy: '发行部', status: 'approved', approver: '法务负责人', createdAt: iso(-5), comment: '已补充航拍授权凭证' }
];
export const auditEvents: AuditEvent[] = [{ id: 'AUD-01', action: 'CREATE', entity: 'budget', entityId: 'BUD-001-V3', actor: '制片主任', at: new Date(now - 86400000).toISOString(), details: '从 V2 复制并调整后期科目' }];

function stableHash(value: unknown) {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
const sum = (items: number[]) => items.reduce((total, item) => total + item, 0);

export function projectSummary(projectId = projects[0].id) {
  const lines = budgetLines.filter(line => line.projectId === projectId);
  const projectContracts = contracts.filter(contract => contract.projectId === projectId);
  const projectAssets = assets.filter(asset => asset.projectId === projectId);
  const projectApprovals = approvals.filter(approval => approval.projectId === projectId);
  const planned = sum(lines.map(line => line.planned));
  const forecast = sum(lines.map(line => line.forecast));
  const actual = sum(lines.map(line => line.actual));
  return { project: projects.find(project => project.id === projectId), planned, forecast, actual, variance: forecast - planned, utilization: planned ? actual / planned : 0, committed: sum(lines.map(line => line.committed)), contractExposure: projectContracts.reduce((total, contract) => total + contract.ceiling, 0), assetCount: projectAssets.length, pendingApprovals: projectApprovals.filter(item => item.status === 'pending').length, highRiskLines: lines.filter(line => line.risk === 'high'), lines, contracts: projectContracts, assets: projectAssets, approvals: projectApprovals };
}

export function rightsConflicts(projectId = projects[0].id): RightsConflict[] {
  const list = assets.filter(asset => asset.projectId === projectId);
  const conflicts: RightsConflict[] = [];
  for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) {
    const a = list[i], b = list[j];
    const sharedTags = a.rightsTags.filter(tag => b.rightsTags.includes(tag));
    const sameTerritory = a.territories.includes('全球') || b.territories.includes('全球') || a.territories.some(territory => b.territories.includes(territory));
    if (sharedTags.length && sameTerritory && a.availableTo >= b.availableFrom && b.availableTo >= a.availableFrom) conflicts.push({ severity: a.status === 'locked' || b.status === 'locked' ? 'critical' : 'warning', assetAId: a.id, assetBId: b.id, assetA: a.name, assetB: b.name, reason: `同一授权标签在重叠窗口内覆盖相同地域：${sharedTags.join('、')}` });
  }
  return conflicts;
}

function buildBudgetReview(project: Project): BudgetReview {
  const projectContracts = contracts.filter(contract => contract.projectId === project.id);
  const lines = budgetLines.filter(line => line.projectId === project.id);
  const planned = sum(lines.map(line => line.planned));
  const committed = sum(lines.map(line => line.committed));
  const actual = sum(lines.map(line => line.actual));
  const forecast = sum(lines.map(line => line.forecast));
  const highRiskLines = lines.filter(line => line.risk === 'high');
  return {
    versionId: project.budgetVersionId,
    planned, committed, actual, forecast,
    variance: forecast - planned,
    variancePct: planned ? Math.round((forecast - planned) / planned * 1000) / 10 : 0,
    contractExposure: sum(projectContracts.map(contract => contract.ceiling)),
    riskLevel: highRiskLines.length ? 'high' : forecast > planned ? 'medium' : 'low',
    highRiskLines,
    lines,
    openMilestones: projectContracts.flatMap(contract => contract.milestones.filter(milestone => milestone.status !== 'paid').map(milestone => ({ vendor: contract.vendor, ...milestone })))
  };
}

function effectiveDeliveryBlockers(pkg: DeliveryPackage): DeliveryBlocker[] {
  const derived = pkg.checklist
    .filter(item => item.required && item.status !== 'ready')
    .map(item => ({
      id: `${pkg.id}/${item.id}`,
      severity: item.status === 'missing' ? 'critical' as const : 'warning' as const,
      reason: `${item.name}：${item.reason ?? (item.status === 'missing' ? '交付物缺失' : '交付物受阻')}`,
      blocksApproval: true
    }));
  return [...pkg.blockers, ...derived];
}

function buildDeliveryReview(projectId: string): DeliveryReview | undefined {
  const pkg = deliveryPackages.find(item => item.projectId === projectId);
  if (!pkg) return undefined;
  const blockers = effectiveDeliveryBlockers(pkg);
  return {
    packageId: pkg.id,
    title: pkg.title,
    node: pkg.node,
    checklist: pkg.checklist,
    blockers,
    readyCount: pkg.checklist.filter(item => item.status === 'ready').length,
    requiredCount: pkg.checklist.filter(item => item.required).length
  };
}

export function reviewContext(approvalId: string): ReviewContext | undefined {
  const approval = approvals.find(item => item.id === approvalId);
  if (!approval) return undefined;
  const project = projects.find(item => item.id === approval.projectId);
  if (!project) return undefined;

  const budget = buildBudgetReview(project);
  const registry = assets.filter(asset => asset.projectId === project.id);
  const conflicts = rightsConflicts(project.id);
  const target = approval.entityType === 'asset' ? registry.find(asset => asset.id === approval.entityId) : undefined;
  const delivery = buildDeliveryReview(project.id);
  const missingData: string[] = [];
  const blockingReasons: string[] = [];

  if (!budget.lines.length) missingData.push('预算四账明细缺失');
  if (approval.entityType === 'budget' && approval.entityId !== project.budgetVersionId) missingData.push(`申请对应的预算版本 ${approval.entityId} 不在当前项目基线中`);
  if (!registry.length) missingData.push('项目资产登记为空');
  if (approval.entityType === 'asset' && !target) missingData.push(`申请对应的资产版本 ${approval.entityId} 不存在，可能已换版或删除`);
  if (target && !target.checksum) missingData.push('目标资产缺少 checksum');
  if (!delivery) missingData.push('项目交付包、节点或清单缺失');
  if (delivery && approval.entityType === 'delivery' && delivery.packageId !== approval.entityId) missingData.push(`申请对应的交付包 ${approval.entityId} 不存在，可能已换版`);
  if (delivery && !delivery.checklist.length) missingData.push('交付清单为空');

  if (approval.status !== 'pending') blockingReasons.push(`该待办已${approval.status === 'approved' ? '通过' : '驳回'}，不能重复提交审批`);
  if (approval.entityType === 'asset' && target) {
    if (target.status === 'draft') blockingReasons.push('目标资产仍为草稿，尚未进入可锁定复核状态');
    if (target.status === 'approved') blockingReasons.push('目标资产已被批准但待办未指向锁定版本，请重新确认实体版本');
    if (target.status === 'locked') blockingReasons.push('目标资产已锁定，该待办对应的动作已经完成');
    conflicts
      .filter(conflict => conflict.severity === 'critical' && [conflict.assetAId, conflict.assetBId].includes(target.id))
      .forEach(conflict => blockingReasons.push(`目标资产存在 critical 授权冲突：${conflict.reason}`));
  }
  if (approval.entityType === 'delivery' && delivery) {
    delivery.blockers.filter(blocker => blocker.blocksApproval).forEach(blocker => blockingReasons.push(blocker.reason));
  }

  const assetReview: AssetReview = {
    target,
    registry,
    conflicts,
    criticalCount: conflicts.filter(conflict => conflict.severity === 'critical').length,
    warningCount: conflicts.filter(conflict => conflict.severity === 'warning').length
  };
  const entityVersion = approval.entityType === 'budget'
    ? `budget:${stableHash([approval.entityId, budget.lines.map(line => [line.id, line.planned, line.committed, line.actual, line.forecast, line.risk])])}`
    : approval.entityType === 'asset'
      ? target ? `asset:${target.version}:${target.status}:${stableHash(target.checksum)}` : `asset-missing:${approval.entityId}`
      : delivery ? `delivery:${stableHash([delivery.node, delivery.checklist, delivery.blockers])}` : `delivery-missing:${approval.entityId}`;
  const riskFingerprint = `risk-${stableHash([
    [budget.planned, budget.committed, budget.actual, budget.forecast, budget.highRiskLines.map(line => [line.id, line.risk, line.forecast])],
    budget.openMilestones.map(milestone => [milestone.name, milestone.due, milestone.status]),
    conflicts.map(conflict => [conflict.severity, conflict.assetAId, conflict.assetBId, conflict.reason]),
    delivery ? [delivery.node.status, delivery.checklist.map(item => [item.id, item.status, item.checksum]), delivery.blockers] : []
  ])}`;
  const contextVersion = `ctx-${stableHash([approval.status, entityVersion, budget, registry.map(asset => [asset.id, asset.version, asset.status, asset.checksum, asset.territories, asset.platforms, asset.availableFrom, asset.availableTo, asset.rightsTags]), delivery])}`;

  return {
    approval,
    project,
    actionable: missingData.length === 0 && blockingReasons.length === 0,
    contextVersion,
    entityVersion,
    riskFingerprint,
    missingData,
    blockingReasons,
    budget,
    assets: assetReview,
    delivery,
    loadedAt: new Date().toISOString()
  };
}

export function approve(id: string, status: ApprovalStatus, comment = '', expectedContextVersion?: string): Approval | ApprovalDecisionError | undefined {
  const item = approvals.find(approval => approval.id === id);
  if (!item) return undefined;
  if (expectedContextVersion !== undefined) {
    const context = reviewContext(id);
    if (!context) return undefined;
    if (item.status !== 'pending') return { code: 'already_decided', message: '该审批已处理，请刷新待办', context };
    if (expectedContextVersion !== context.contextVersion) return { code: 'version_stale', message: '复核依据已变化，请刷新并重新确认', context };
    if (!context.actionable) return { code: 'not_actionable', message: '当前复核上下文缺少数据或存在硬阻断，不能提交审批', context };
  }
  item.status = status;
  item.comment = comment;
  auditEvents.unshift({ id: `AUD-${Date.now()}`, action: status.toUpperCase(), entity: item.entityType, entityId: item.entityId, actor: '当前审批人', at: new Date().toISOString(), details: comment || `${item.title} 已${status === 'approved' ? '通过' : '驳回'}` });
  return item;
}
export function createApproval(input: Pick<Approval, 'projectId' | 'entityType' | 'entityId' | 'title' | 'requestedBy' | 'approver'>) { const item: Approval = { ...input, id: `APR-${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() }; approvals.unshift(item); return item; }
export function dashboard() { return projects.map(project => projectSummary(project.id)).map(summary => ({ id: summary.project?.id, title: summary.project?.title, status: summary.project?.status, forecast: summary.forecast, variance: summary.variance, pendingApprovals: summary.pendingApprovals, rightsConflicts: rightsConflicts(summary.project?.id).length })); }
