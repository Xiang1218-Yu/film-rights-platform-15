export type ProjectStatus = 'development' | 'production' | 'post' | 'delivered';
export type AssetType = 'master' | 'trailer' | 'poster' | 'audio' | 'subtitle';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Project { id: string; code: string; title: string; season: number; status: ProjectStatus; currency: string; budgetVersionId: string; deliveryDate: string; }
export interface BudgetLine { id: string; projectId: string; category: string; subcategory: string; planned: number; committed: number; actual: number; forecast: number; owner: string; risk: 'low' | 'medium' | 'high'; }
export interface Contract { id: string; projectId: string; vendor: string; scope: string; ceiling: number; committed: number; paid: number; milestones: { name: string; due: string; amount: number; status: 'open' | 'invoiced' | 'paid' }[]; }
export interface Asset { id: string; projectId: string; name: string; type: AssetType; version: number; status: 'draft' | 'review' | 'approved' | 'locked'; owner: string; checksum: string; territories: string[]; platforms: string[]; availableFrom: string; availableTo: string; rightsTags: string[]; }
export interface Approval { id: string; projectId: string; entityType: 'budget' | 'asset' | 'delivery'; entityId: string; title: string; requestedBy: string; status: ApprovalStatus; approver: string; createdAt: string; comment?: string; entityVersion?: string; riskSnapshot?: string; }
export interface AuditEvent { id: string; action: string; entity: string; entityId: string; actor: string; at: string; details: string; }
export interface Delivery { id: string; projectId: string; name: string; version: number; destination: string; dueDate: string; checklist: { item: string; done: boolean }[]; milestones: { name: string; due: string; status: 'done' | 'open' | 'blocked' }[]; blockers: string[]; }

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
export const deliveries: Delivery[] = [
  { id: 'DEL-005', projectId: 'PRJ-001', name: 'StreamBox 上线母版交付包', version: 2, destination: 'StreamBox 平台 / CN', dueDate: iso(30), checklist: [{ item: 'E01-E08 母版锁定并登记 checksum', done: false }, { item: '字幕与音轨交付物齐套', done: true }, { item: '版权授权窗口核验', done: true }, { item: '交付包 MD5 校验单签署', done: false }], milestones: [{ name: '技术审片 (QC)', due: iso(12), status: 'open' }, { name: '平台物料上传', due: iso(24), status: 'blocked' }, { name: '上线排期确认', due: iso(30), status: 'open' }], blockers: ['E01 最终母版未锁定（APR-02 待批）', '物料上传节点被 QC 前置阻断'] },
  { id: 'DEL-007', projectId: 'PRJ-002', name: '海外节展交付包', version: 1, destination: '节展组委会 / EU', dueDate: iso(60), checklist: [{ item: '航拍授权凭证归档', done: true }, { item: 'DCP 与字幕版本核验', done: true }], milestones: [{ name: '节展报名材料提交', due: iso(-3), status: 'done' }, { name: '放映拷贝寄送', due: iso(21), status: 'open' }], blockers: [] }
];
export function budgetRiskSignature(lines: BudgetLine[]) { const count = { high: 0, medium: 0, low: 0 }; lines.forEach(line => { count[line.risk] += 1; }); return `high:${count.high}/medium:${count.medium}/low:${count.low}`; }
export const approvals: Approval[] = [
  { id: 'APR-01', projectId: 'PRJ-001', entityType: 'budget', entityId: 'BUD-001-V3', title: '后期超支预案 V3', requestedBy: '制片主任', status: 'pending', approver: '财务负责人', createdAt: iso(-1), entityVersion: 'BUD-001-V3', riskSnapshot: budgetRiskSignature(budgetLines.filter(line => line.projectId === 'PRJ-001')) },
  { id: 'APR-02', projectId: 'PRJ-001', entityType: 'asset', entityId: 'AST-001', title: 'E01 最终母版锁定', requestedBy: '后期制片', status: 'pending', approver: '总制片人', createdAt: iso(-2), entityVersion: '7' },
  { id: 'APR-03', projectId: 'PRJ-002', entityType: 'delivery', entityId: 'DEL-007', title: '海外节展交付包', requestedBy: '发行部', status: 'approved', approver: '法务负责人', createdAt: iso(-5), comment: '已补充航拍授权凭证', entityVersion: '1' },
  { id: 'APR-04', projectId: 'PRJ-001', entityType: 'budget', entityId: 'BUD-001-V2', title: '后期超支预案 V2', requestedBy: '制片主任', status: 'pending', approver: '财务负责人', createdAt: iso(-6), entityVersion: 'BUD-001-V2' },
  { id: 'APR-05', projectId: 'PRJ-001', entityType: 'delivery', entityId: 'DEL-005', title: 'StreamBox 上线交付放行', requestedBy: '发行部', status: 'pending', approver: '总制片人', createdAt: iso(-1), entityVersion: '2' },
  { id: 'APR-06', projectId: 'PRJ-001', entityType: 'asset', entityId: 'AST-099', title: '预告片 AST-099 授权复核', requestedBy: '营销部', status: 'pending', approver: '法务负责人', createdAt: iso(-3), entityVersion: '1' }
];
export const auditEvents: AuditEvent[] = [{ id: 'AUD-01', action: 'CREATE', entity: 'budget', entityId: 'BUD-001-V3', actor: '制片主任', at: new Date(now - 86400000).toISOString(), details: '从 V2 复制并调整后期科目' }];

export function projectSummary(projectId = projects[0].id) {
  const lines = budgetLines.filter(line => line.projectId === projectId);
  const projectContracts = contracts.filter(contract => contract.projectId === projectId);
  const projectAssets = assets.filter(asset => asset.projectId === projectId);
  const projectApprovals = approvals.filter(approval => approval.projectId === projectId);
  const planned = lines.reduce((sum, line) => sum + line.planned, 0);
  const forecast = lines.reduce((sum, line) => sum + line.forecast, 0);
  const actual = lines.reduce((sum, line) => sum + line.actual, 0);
  return { project: projects.find(project => project.id === projectId), planned, forecast, actual, variance: forecast - planned, utilization: planned ? actual / planned : 0, committed: lines.reduce((sum, line) => sum + line.committed, 0), contractExposure: projectContracts.reduce((sum, contract) => sum + contract.ceiling, 0), assetCount: projectAssets.length, pendingApprovals: projectApprovals.filter(item => item.status === 'pending').length, highRiskLines: lines.filter(line => line.risk === 'high'), lines, contracts: projectContracts, assets: projectAssets, approvals: projectApprovals };
}

export function rightsConflicts(projectId = projects[0].id) {
  const list = assets.filter(asset => asset.projectId === projectId);
  const conflicts: { severity: 'critical' | 'warning'; assetA: string; assetB: string; reason: string }[] = [];
  for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) {
    const a = list[i], b = list[j];
    const sameTag = a.rightsTags.some(tag => b.rightsTags.includes(tag));
    const sameTerritory = a.territories.includes('全球') || b.territories.includes('全球') || a.territories.some(territory => b.territories.includes(territory));
    if (sameTag && sameTerritory && a.availableTo >= b.availableFrom && b.availableTo >= a.availableFrom) conflicts.push({ severity: a.status === 'locked' || b.status === 'locked' ? 'critical' : 'warning', assetA: a.name, assetB: b.name, reason: `同一授权标签在重叠窗口内覆盖相同地域：${a.rightsTags.filter(tag => b.rightsTags.includes(tag)).join('、')}` });
  }
  return conflicts;
}

export function currentEntityVersion(item: Pick<Approval, 'entityType' | 'entityId' | 'projectId'>): string | undefined {
  if (item.entityType === 'budget') return projects.find(project => project.id === item.projectId)?.budgetVersionId;
  if (item.entityType === 'asset') { const asset = assets.find(entry => entry.id === item.entityId && entry.projectId === item.projectId); return asset ? String(asset.version) : undefined; }
  const delivery = deliveries.find(entry => entry.id === item.entityId && entry.projectId === item.projectId); return delivery ? String(delivery.version) : undefined;
}

export type ReviewState = 'ready' | 'superseded' | 'missing' | 'risk-changed';
export type ReviewContext =
  | { kind: 'budget'; budgetVersionId: string; totals: { planned: number; committed: number; actual: number; forecast: number }; riskSignature: string; lines: BudgetLine[] }
  | { kind: 'asset'; asset: Asset; conflicts: ReturnType<typeof rightsConflicts> }
  | { kind: 'delivery'; delivery: Delivery };
export interface ApprovalReview { approval: Approval; state: ReviewState; stateReason?: string; entityVersion?: string; generatedAt: string; context?: ReviewContext; }

// 只读复核视图：不修改审批状态、不写审计事件，打开/关闭/刷新均无副作用。
export function approvalReviewContext(approvalId: string): ApprovalReview | undefined {
  const approval = approvals.find(item => item.id === approvalId); if (!approval) return undefined;
  const generatedAt = new Date().toISOString();
  const entityVersion = currentEntityVersion(approval);
  if (approval.entityType === 'budget') {
    const project = projects.find(entry => entry.id === approval.projectId);
    if (!project) return { approval, state: 'missing', stateReason: `所属项目 ${approval.projectId} 不存在`, generatedAt };
    const lines = budgetLines.filter(line => line.projectId === approval.projectId);
    const context: ReviewContext = { kind: 'budget', budgetVersionId: project.budgetVersionId, totals: { planned: lines.reduce((sum, line) => sum + line.planned, 0), committed: lines.reduce((sum, line) => sum + line.committed, 0), actual: lines.reduce((sum, line) => sum + line.actual, 0), forecast: lines.reduce((sum, line) => sum + line.forecast, 0) }, riskSignature: budgetRiskSignature(lines), lines };
    if (approval.entityId !== project.budgetVersionId) return { approval, state: 'superseded', stateReason: `预算实体已换版：申请基于 ${approval.entityId}，当前生效版本为 ${project.budgetVersionId}，请发起人基于新版本重新提交`, entityVersion, generatedAt, context };
    if (approval.riskSnapshot && approval.riskSnapshot !== context.riskSignature) return { approval, state: 'risk-changed', stateReason: `风险画像在申请后发生变化（${approval.riskSnapshot} → ${context.riskSignature}），需重新评估后再审`, entityVersion, generatedAt, context };
    return { approval, state: 'ready', entityVersion, generatedAt, context };
  }
  if (approval.entityType === 'asset') {
    const asset = assets.find(entry => entry.id === approval.entityId && entry.projectId === approval.projectId);
    if (!asset) return { approval, state: 'missing', stateReason: `资产 ${approval.entityId} 不存在或已从登记册移除`, generatedAt };
    const conflicts = rightsConflicts(approval.projectId).filter(conflict => conflict.assetA === asset.name || conflict.assetB === asset.name);
    const context: ReviewContext = { kind: 'asset', asset, conflicts };
    if (approval.entityVersion && approval.entityVersion !== String(asset.version)) return { approval, state: 'superseded', stateReason: `资产已换版：申请基于 v${approval.entityVersion}，当前登记为 v${asset.version}，旧版本详情不可作为审批依据`, entityVersion, generatedAt, context };
    return { approval, state: 'ready', entityVersion, generatedAt, context };
  }
  const delivery = deliveries.find(entry => entry.id === approval.entityId && entry.projectId === approval.projectId);
  if (!delivery) return { approval, state: 'missing', stateReason: `交付包 ${approval.entityId} 不存在或已撤销`, generatedAt };
  const context: ReviewContext = { kind: 'delivery', delivery };
  if (approval.entityVersion && approval.entityVersion !== String(delivery.version)) return { approval, state: 'superseded', stateReason: `交付清单已换版：申请基于 v${approval.entityVersion}，当前为 v${delivery.version}，旧清单不可作为放行依据`, entityVersion, generatedAt, context };
  return { approval, state: 'ready', entityVersion, generatedAt, context };
}

export type ApproveResult = { ok: true; approval: Approval } | { ok: false; reason: 'not-found' } | { ok: false; reason: 'already-decided' } | { ok: false; reason: 'version-conflict'; currentVersion?: string };
export function approve(id: string, status: ApprovalStatus, comment = '', expectedEntityVersion?: string): ApproveResult {
  const item = approvals.find(approval => approval.id === id); if (!item) return { ok: false, reason: 'not-found' };
  if (item.status !== 'pending') return { ok: false, reason: 'already-decided' };
  if (expectedEntityVersion !== undefined) { const current = currentEntityVersion(item); if (current !== expectedEntityVersion) return { ok: false, reason: 'version-conflict', currentVersion: current }; }
  item.status = status; item.comment = comment; auditEvents.unshift({ id: `AUD-${Date.now()}`, action: status.toUpperCase(), entity: item.entityType, entityId: item.entityId, actor: '当前审批人', at: new Date().toISOString(), details: comment || `${item.title} 已${status === 'approved' ? '通过' : '驳回'}` }); return { ok: true, approval: item };
}
export function createApproval(input: Pick<Approval, 'projectId' | 'entityType' | 'entityId' | 'title' | 'requestedBy' | 'approver'>) { const item: Approval = { ...input, id: `APR-${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() }; const version = currentEntityVersion(item); if (version) item.entityVersion = version; if (item.entityType === 'budget') item.riskSnapshot = budgetRiskSignature(budgetLines.filter(line => line.projectId === item.projectId)); approvals.unshift(item); return item; }
export function dashboard() { return projects.map(project => projectSummary(project.id)).map(summary => ({ id: summary.project?.id, title: summary.project?.title, status: summary.project?.status, forecast: summary.forecast, variance: summary.variance, pendingApprovals: summary.pendingApprovals, rightsConflicts: rightsConflicts(summary.project?.id).length })); }
