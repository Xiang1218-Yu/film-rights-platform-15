import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Project = {
  id: string;
  title: string;
  status: string;
  deliveryDate: string;
};

type Approval = {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  approver: string;
  entityType: 'budget' | 'asset' | 'delivery';
};

type Summary = {
  planned: number;
  forecast: number;
  actual: number;
  variance: number;
  utilization: number;
  committed: number;
  contractExposure: number;
  assetCount: number;
  pendingApprovals: number;
  highRiskLines: { subcategory: string; forecast: number; planned: number }[];
  lines: { id: string; category: string; subcategory: string; planned: number; committed: number; actual: number; forecast: number; risk: string }[];
  contracts: { vendor: string; scope: string; committed: number; paid: number; milestones: { name: string; due: string; status: string }[] }[];
  assets: { id: string; name: string; type: string; version: number; status: string; availableTo: string }[];
  approvals: Approval[];
  project: Project;
};

type Conflict = {
  severity: 'critical' | 'warning';
  assetAId: string;
  assetBId: string;
  assetA: string;
  assetB: string;
  reason: string;
};

type BudgetLine = Summary['lines'][number];
type Asset = {
  id: string;
  name: string;
  type: string;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'locked';
  owner: string;
  checksum: string;
  territories: string[];
  platforms: string[];
  availableFrom: string;
  availableTo: string;
  rightsTags: string[];
};

type DeliveryReview = {
  packageId: string;
  title: string;
  node: { name: string; due: string; owner: string; status: 'on_track' | 'at_risk' | 'blocked' | 'done' };
  checklist: { id: string; name: string; status: 'ready' | 'missing' | 'blocked'; required: boolean; checksum?: string; reason?: string }[];
  blockers: { id: string; severity: 'critical' | 'warning'; reason: string; blocksApproval: boolean }[];
  readyCount: number;
  requiredCount: number;
};

type ReviewContext = {
  approval: Approval;
  project: Project;
  actionable: boolean;
  contextVersion: string;
  entityVersion: string;
  riskFingerprint: string;
  missingData: string[];
  blockingReasons: string[];
  loadedAt: string;
  budget: {
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
  };
  assets: {
    target?: Asset;
    registry: Asset[];
    conflicts: Conflict[];
    criticalCount: number;
    warningCount: number;
  };
  delivery?: DeliveryReview;
};

type VersionPoint = {
  contextVersion: string;
  entityVersion: string;
  riskFingerprint: string;
};

type ReviewState = {
  approvalId: string;
  data?: ReviewContext;
  baseline?: VersionPoint;
  loading: boolean;
  loadError?: string;
  notice?: string;
  submitting: boolean;
  decisionError?: string;
};

const money = (n: number) => `¥${(n / 10000).toFixed(0)}万`;
const api = '/api';
const formatTime = (value: string) => new Date(value).toLocaleTimeString('zh-CN', { hour12: false });

class ApiError extends Error {
  status: number;
  body: { message?: string; code?: string; context?: ReviewContext };

  constructor(status: number, body: { message?: string; code?: string; context?: ReviewContext }) {
    super(body.message || `请求失败 (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState('PRJ-001');
  const [summary, setSummary] = useState<Summary>();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [tab, setTab] = useState<'overview' | 'budget' | 'rights'>('overview');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<ReviewState>();
  const reviewSequence = useRef(0);
  const reviewAbort = useRef<AbortController | null>(null);

  const closeReview = useCallback(() => {
    reviewSequence.current += 1;
    reviewAbort.current?.abort();
    reviewAbort.current = null;
    setReview(undefined);
  }, []);

  const load = useCallback(async (id = 'PRJ-001') => {
    setLoading(true);
    setError('');
    closeReview();
    try {
      const items = await request<Project[]>('/projects');
      const active = items.find(item => item.id === id) ?? items[0];
      if (!active) throw new Error('服务端没有返回项目数据');
      const [projectSummary, rights] = await Promise.all([
        request<Summary>(`/projects/${active.id}/summary`),
        request<Conflict[]>(`/projects/${active.id}/rights-conflicts`),
      ]);
      setProjects(items);
      setSelected(active.id);
      setSummary(projectSummary);
      setConflicts(rights);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法连接制作服务');
    } finally {
      setLoading(false);
    }
  }, [closeReview]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadReview = useCallback((approvalId: string, mode: 'initial' | 'refresh') => {
    reviewSequence.current += 1;
    const sequence = reviewSequence.current;
    reviewAbort.current?.abort();
    const controller = new AbortController();
    reviewAbort.current = controller;

    setReview(previous => {
      if (mode === 'initial') return { approvalId, loading: true, submitting: false };
      if (!previous || previous.approvalId !== approvalId) return previous;
      return { ...previous, loading: true, loadError: undefined, notice: undefined, decisionError: undefined };
    });

    request<ReviewContext>(`/approvals/${approvalId}/review-context`, { signal: controller.signal })
      .then(context => {
        setReview(previous => {
          if (!previous || previous.approvalId !== approvalId) return previous;
          if (sequence !== reviewSequence.current) {
            return { ...previous, notice: '较早请求的响应已到，已按最新刷新结果忽略该响应。' };
          }
          const baseline = mode === 'initial'
            ? { contextVersion: context.contextVersion, entityVersion: context.entityVersion, riskFingerprint: context.riskFingerprint }
            : previous.baseline;
          return { ...previous, data: context, baseline, loading: false, loadError: undefined };
        });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setReview(previous => {
          if (!previous || previous.approvalId !== approvalId) return previous;
          if (sequence !== reviewSequence.current) return previous;
          return {
            ...previous,
            data: undefined,
            baseline: mode === 'initial' ? undefined : previous.baseline,
            loading: false,
            loadError: reason instanceof Error ? reason.message : '复核上下文加载失败',
          };
        });
      });
  }, []);

  const openReview = useCallback((id: string) => loadReview(id, 'initial'), [loadReview]);
  const refreshReview = useCallback(() => {
    setReview(previous => {
      if (!previous) return previous;
      loadReview(previous.approvalId, 'refresh');
      return previous;
    });
  }, [loadReview]);

  const useLatestBaseline = () => {
    setReview(previous => {
      if (!previous?.data) return previous;
      const { data } = previous;
      return {
        ...previous,
        baseline: {
          contextVersion: data.contextVersion,
          entityVersion: data.entityVersion,
          riskFingerprint: data.riskFingerprint,
        },
        decisionError: undefined,
      };
    });
  };

  const approve = async () => {
    if (!review?.data || !review.baseline) return;
    const context = review.data;
    setReview(previous => previous ? { ...previous, submitting: true, decisionError: undefined } : previous);
    const comments: Record<Approval['entityType'], string> = {
      budget: '预算计划、承诺、实际、预测及风险已在控制台复核',
      asset: '资产版本、checksum、授权范围与冲突已在控制台复核',
      delivery: '交付清单、节点与阻断原因已在控制台复核',
    };
    try {
      await request(`/approvals/${context.approval.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          comment: comments[context.approval.entityType],
          expectedContextVersion: review.baseline.contextVersion,
        }),
      });
      reviewSequence.current += 1;
      reviewAbort.current?.abort();
      setReview(undefined);
      setMessage('审批已通过；审计事件基于提交时锁定的复核版本写入。');
      await load(selected);
    } catch (reason) {
      if (reason instanceof ApiError && reason.body.context) {
        setReview(previous => previous ? {
          ...previous,
            data: reason.body.context,
            loading: false,
            submitting: false,
            decisionError: reason.message,
          } : previous);
      } else {
        setError(reason instanceof Error ? reason.message : '审批操作失败');
        setReview(previous => previous ? { ...previous, submitting: false } : previous);
      }
    }
  };

  const variancePct = useMemo(() => summary ? Math.round(summary.variance / summary.planned * 100) : 0, [summary]);
  const baselineState = review?.data && review.baseline ? {
    entityChanged: review.data.entityVersion !== review.baseline.entityVersion,
    riskChanged: review.data.riskFingerprint !== review.baseline.riskFingerprint,
    contextChanged: review.data.contextVersion !== review.baseline.contextVersion,
  } : undefined;
  const reviewLocked = !review?.data || review.loading || review.submitting || baselineState?.contextChanged !== false || !review.data.actionable;
  const pendingApprovals = summary?.approvals.filter(item => item.status === 'pending').length ?? 0;

  if (loading && !summary) return <main className="connection-state"><div className="loading">正在载入制作控制台…</div><small>正在通过 Vite API 代理连接本地制作服务</small></main>;
  if (!summary) return <main className="connection-state"><h2>无法连接制作服务</h2><p>{error || '服务端没有返回项目数据。'}</p><p>请从项目根目录运行 <code>npm run dev</code>，确认前端 5173 和 API 4104 均已启动。</p><button onClick={() => void load(selected)}>重新连接</button></main>;

  return (
    <main className={review ? 'with-review-drawer' : undefined}>
      <header>
        <div>
          <div className="eyebrow">STUDIO OPS / RIGHTS & FINANCE CONTROL</div>
          <h1>FrameLedger <span>影视制作预算与资产版权协同</span></h1>
          <p>将预算承诺、供应商付款、资产版本与跨地域版权窗口串成可审计的交付链路。</p>
        </div>
        <div className="header-actions">
          <select value={selected} onChange={event => { setSelected(event.target.value); void load(event.target.value); }}>
            {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
          <span className="live"><i /> LIVE CONTROL</span>
        </div>
      </header>

      {message && <div className="toast" onClick={() => setMessage('')}>{message} ×</div>}
      {error && <div className="toast error-toast" onClick={() => setError('')}>{error} ×</div>}

      <section className="kpis">
        <div><small>FORECAST COST</small><b>{money(summary.forecast)}</b><span>预算偏差 <em className={summary.variance > 0 ? 'bad' : ''}>{variancePct}%</em></span></div>
        <div><small>COMMITTED</small><b>{money(summary.committed)}</b><span>已锁定供应商与合同</span></div>
        <div><small>ASSET REGISTER</small><b>{summary.assetCount}<em> 个</em></b><span>版本与交付状态纳管</span></div>
        <div><small>RISK QUEUE</small><b>{pendingApprovals + conflicts.length}<em> 项</em></b><span>{conflicts.length} 条版权冲突 / {pendingApprovals} 个审批</span></div>
      </section>

      <nav className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>项目驾驶舱</button>
        <button className={tab === 'budget' ? 'active' : ''} onClick={() => setTab('budget')}>预算与合同</button>
        <button className={tab === 'rights' ? 'active' : ''} onClick={() => setTab('rights')}>资产版权图谱</button>
        <span>交付日 {summary.project.deliveryDate}</span>
      </nav>

      {tab === 'overview' && <div className="grid">
        <section className="panel hero">
          <div className="panel-head">
            <div><div className="eyebrow">PROJECT HEALTH / {summary.project.id}</div><h2>{summary.project.title}</h2></div>
            <span className="badge amber">{summary.project.status.toUpperCase()}</span>
          </div>
          <div className="progress-label"><span>成本消耗 {Math.round(summary.utilization * 100)}%</span><b>{money(summary.actual)} / {money(summary.planned)}</b></div>
          <div className="progress"><i style={{ width: `${Math.min(100, summary.utilization * 100)}%` }} /></div>
          <div className="split">
            <div><small>合同暴露额</small><strong>{money(summary.contractExposure)}</strong></div>
            <div><small>高风险预算项</small><strong className="bad">{summary.highRiskLines.length}</strong></div>
            <div><small>版权冲突</small><strong className={conflicts.length ? 'bad' : ''}>{conflicts.length}</strong></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>待审批队列</h3><span>{pendingApprovals} PENDING</span></div>
          {summary.approvals.map(item => (
            <div className="approval" key={item.id}>
              <span className={`status ${item.status}`} />
              <div>
                <b>{item.title}</b>
                <small>{item.approver} · {item.id} · {item.entityType === 'budget' ? '预算' : item.entityType === 'asset' ? '资产' : '交付'}</small>
              </div>
              <button onClick={() => openReview(item.id)}>{item.status === 'pending' ? '打开复核' : '查看结论'}</button>
            </div>
          ))}
        </section>

        <section className="panel wide">
          <div className="panel-head"><h3>交付风险雷达</h3><span>基于版本、授权窗口与预算预测</span></div>
          {conflicts.length ? conflicts.map(conflict => (
            <div className="risk-row" key={`${conflict.assetAId}-${conflict.assetBId}`}>
              <strong className={conflict.severity}>{conflict.severity === 'critical' ? 'CRITICAL' : 'WARNING'}</strong>
              <div><b>{conflict.assetA}</b><small>↔ {conflict.assetB} · {conflict.reason}</small></div>
            </div>
          )) : <div className="empty">当前项目未发现版权窗口冲突。</div>}
        </section>
      </div>}

      {tab === 'budget' && <div className="grid">
        <section className="panel wide">
          <div className="panel-head"><h3>预算版本 V3 / 成本基线</h3><span>计划 + 承诺 + 实际 + 预测</span></div>
          <div className="table">
            <div className="tr budget-tr th"><span>科目</span><span>计划</span><span>承诺</span><span>实际</span><span>预测</span><span>风险</span></div>
            {summary.lines.map(line => <div className="tr budget-tr" key={line.id}>
              <span><b>{line.category}</b><small>{line.subcategory}</small></span>
              <span>{money(line.planned)}</span>
              <span>{money(line.committed)}</span>
              <span>{money(line.actual)}</span>
              <span className={line.forecast > line.planned ? 'bad' : ''}>{money(line.forecast)}</span>
              <span className={`risk ${line.risk}`}>{line.risk}</span>
            </div>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h3>供应商付款里程碑</h3></div>
          {summary.contracts.map(contract => <div className="contract" key={contract.vendor}>
            <b>{contract.vendor}</b><small>{contract.scope}</small>
            <div className="contract-bar"><i style={{ width: `${Math.round(contract.paid / contract.committed * 100)}%` }} /></div>
            <span>{money(contract.paid)} / {money(contract.committed)}</span>
            <em>{contract.milestones.filter(milestone => milestone.status !== 'paid').length} 个待结点</em>
          </div>)}
        </section>
      </div>}

      {tab === 'rights' && <div className="grid">
        <section className="panel wide">
          <div className="panel-head"><h3>资产版本登记</h3><span>{summary.assets.length} assets / checksum tracked</span></div>
          <div className="table">
            <div className="tr rights-tr th"><span>资产</span><span>版本</span><span>状态</span><span>授权截止</span></div>
            {summary.assets.map(asset => <div className="tr rights-tr" key={asset.id}>
              <span><b>{asset.name}</b><small>{asset.id} · {asset.type}</small></span>
              <span>v{asset.version}</span>
              <span className={`pill ${asset.status}`}>{asset.status}</span>
              <span>{asset.availableTo}</span>
            </div>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h3>授权冲突</h3><span>{conflicts.length} detected</span></div>
          {conflicts.map(conflict => <div className="conflict" key={`${conflict.assetAId}-${conflict.assetBId}`}>
            <strong>{conflict.severity}</strong><b>{conflict.assetA}</b><small>{conflict.reason}</small>
          </div>)}
        </section>
      </div>}

      {review && <ReviewDrawer
        state={review}
        baselineState={baselineState}
        locked={reviewLocked}
        onClose={closeReview}
        onRefresh={refreshReview}
        onRebaseline={useLatestBaseline}
        onApprove={() => void approve()}
      />}

      <footer>FrameLedger baseline · 内存仓储 + REST API · 复核打开、关闭与刷新只读；仅提交审批写入待办状态与审计事件</footer>
    </main>
  );
}

type ReviewDrawerProps = {
  state: ReviewState;
  baselineState?: { entityChanged: boolean; riskChanged: boolean; contextChanged: boolean };
  locked: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onRebaseline: () => void;
  onApprove: () => void;
};

function ReviewDrawer({ state, baselineState, locked, onClose, onRefresh, onRebaseline, onApprove }: ReviewDrawerProps) {
  const context = state.data;
  const typeLabel = context?.approval.entityType === 'budget' ? '预算复核' : context?.approval.entityType === 'asset' ? '资产复核' : '交付复核';

  return <aside className="review-drawer" aria-live="polite">
    <div className="drawer-head">
      <div>
        <div className="eyebrow">APPROVAL CONSOLE</div>
        <h2>{context?.approval.title ?? state.approvalId}</h2>
        <small>{typeLabel}{context ? ` · ${context.project.id}` : ''}</small>
      </div>
      <div className="drawer-actions">
        <button type="button" onClick={onRefresh} disabled={state.loading || state.submitting}>刷新上下文</button>
        <button type="button" className="ghost" onClick={onClose} disabled={state.submitting}>关闭</button>
      </div>
    </div>

    {state.loading && <div className="drawer-state loading-state">
      <b>正在加载申请所属项目的复核上下文…</b>
      <p>预算、资产和交付数据以同一项目范围读取；不会改变待办或审计。</p>
    </div>}

    {!state.loading && state.loadError && <div className="drawer-state invalid-state">
      <b>当前复核上下文不可操作</b>
      <p>{state.loadError}</p>
      <p>为避免依据旧详情判断，旧版本内容已隐藏。请恢复服务后重新加载。</p>
      <button type="button" onClick={onRefresh}>重新加载</button>
    </div>}

    {!state.loading && !state.loadError && context && <>
      <div className={`context-status ${context.actionable && !baselineState?.contextChanged ? 'ready' : 'blocked'}`}>
        <div>
          <b>{context.actionable && !baselineState?.contextChanged ? '可以提交复核' : '当前不可操作'}</b>
          <p>上下文读取于 {formatTime(context.loadedAt)} · {context.approval.status === 'pending' ? '待办仍为 pending' : `待办已 ${context.approval.status}`}</p>
        </div>
        <span>{context.actionable && !baselineState?.contextChanged ? 'READY' : 'LOCKED'}</span>
      </div>

      {state.notice && <div className="drawer-notice warning">{state.notice}</div>}
      {state.decisionError && <div className="drawer-notice danger">提交被拒绝：{state.decisionError} 下方已替换为最新上下文。</div>}
      {baselineState?.entityChanged && <div className="drawer-notice danger">实体已换版或关键 checksum/状态变化，旧详情不能继续操作。</div>}
      {baselineState?.riskChanged && <div className="drawer-notice danger">预算、授权或交付风险指纹已变化，必须重新核对后才能提交。</div>}
      {context.missingData.map(reason => <div className="drawer-notice danger" key={reason}>数据缺失：{reason}</div>)}
      {context.blockingReasons.map(reason => <div className="drawer-notice danger" key={reason}>阻断：{reason}</div>)}
      {baselineState?.contextChanged && <div className="rebaseline-row">
        <span>当前显示的是最新只读详情。</span>
        <button type="button" onClick={onRebaseline}>我已核对，使用最新版本作为复核基准</button>
      </div>}

      <BudgetSection context={context} />
      <AssetSection context={context} />
      {context.delivery && <DeliverySection delivery={context.delivery} />}

      <div className="version-strip">
        <span>entity: <code>{context.entityVersion}</code></span>
        <span>risk: <code>{context.riskFingerprint}</code></span>
        <span>context: <code>{context.contextVersion}</code></span>
      </div>

      <div className="drawer-footer">
        <small>打开、关闭和刷新均为只读操作；提交时校验 contextVersion，防止乱序或风险突变后沿用旧依据。</small>
        <button type="button" className="primary" onClick={onApprove} disabled={locked || state.submitting}>
          {state.submitting ? '提交中…' : '确认通过并写审计'}
        </button>
      </div>
    </>}
  </aside>;
}

function BudgetSection({ context }: { context: ReviewContext }) {
  const budget = context.budget;
  return <section className="review-section">
    <div className="section-head">
      <div><small>BUDGET / {budget.versionId}</small><h3>预算四账与风险</h3></div>
      <span className={`risk ${budget.riskLevel}`}>{budget.riskLevel}</span>
    </div>
    <div className="ledger-grid">
      <div><small>计划</small><b>{money(budget.planned)}</b></div>
      <div><small>承诺</small><b>{money(budget.committed)}</b></div>
      <div><small>实际</small><b>{money(budget.actual)}</b></div>
      <div className={budget.forecast > budget.planned ? 'bad' : ''}><small>预测</small><b>{money(budget.forecast)}</b><em>{budget.variancePct}%</em></div>
    </div>
    <div className="detail-list">
      <div><span>合同暴露额</span><b>{money(budget.contractExposure)}</b></div>
      <div><span>高风险科目</span><b className={budget.highRiskLines.length ? 'bad' : ''}>{budget.highRiskLines.length ? budget.highRiskLines.map(line => line.subcategory).join('、') : '无'}</b></div>
      {budget.openMilestones.map(milestone => <div key={`${milestone.vendor}-${milestone.name}`}>
        <span>{milestone.vendor} · {milestone.name}</span>
        <b>{milestone.due} · {milestone.status}</b>
      </div>)}
    </div>
  </section>;
}

function AssetSection({ context }: { context: ReviewContext }) {
  const target = context.assets.target;
  return <section className="review-section">
    <div className="section-head">
      <div><small>ASSET REGISTRY</small><h3>资产版本、checksum 与授权范围</h3></div>
      <span>{context.assets.criticalCount} critical / {context.assets.warningCount} warning</span>
    </div>
    {target ? <div className="target-asset">
      <div className="asset-title"><b>{target.name}</b><span className={`pill ${target.status}`}>v{target.version} · {target.status}</span></div>
      <code>{target.checksum}</code>
      <p>地域：{target.territories.join('、')} · 平台：{target.platforms.join('、')}</p>
      <p>窗口：{target.availableFrom} → {target.availableTo} · 负责人：{target.owner}</p>
      <div className="tag-row">{target.rightsTags.map(tag => <span key={tag}>{tag}</span>)}</div>
    </div> : <div className="missing-panel">申请指向的资产实体不存在，可能已换版或删除。</div>}
    <div className="mini-table">
      {context.assets.registry.map(asset => <div key={asset.id} className={target?.id === asset.id ? 'selected' : ''}>
        <span>v{asset.version} · {asset.status}</span>
        <b>{asset.name}</b>
        <code>{asset.checksum}</code>
      </div>)}
    </div>
    <div className="conflict-list">
      {context.assets.conflicts.length ? context.assets.conflicts.map(conflict => <div key={`${conflict.assetAId}-${conflict.assetBId}`} className={conflict.severity}>
        <strong>{conflict.severity}</strong><span>{conflict.assetA} ↔ {conflict.assetB} · {conflict.reason}</span>
      </div>) : <div className="empty">未发现授权窗口冲突。</div>}
    </div>
  </section>;
}

function DeliverySection({ delivery }: { delivery: DeliveryReview }) {
  return <section className="review-section">
    <div className="section-head">
      <div><small>DELIVERY / {delivery.packageId}</small><h3>{delivery.title}</h3></div>
      <span className={`node-status ${delivery.node.status}`}>{delivery.node.status}</span>
    </div>
    <div className="delivery-node">
      <b>{delivery.node.name}</b>
      <span>{delivery.node.due} · {delivery.node.owner}</span>
      <strong>{delivery.readyCount}/{delivery.requiredCount} 必备项就绪</strong>
    </div>
    <div className="checklist">
      {delivery.checklist.map(item => <div key={item.id} className={item.status}>
        <span>{item.status === 'ready' ? '✓' : item.status === 'missing' ? '!' : '●'}</span>
        <div><b>{item.name}</b><small>{item.reason ?? item.checksum ?? '已纳入交付包'}</small></div>
      </div>)}
    </div>
    <div className="blocker-list">
      {delivery.blockers.length ? delivery.blockers.map(blocker => <div key={blocker.id} className={blocker.severity}>
        <strong>{blocker.blocksApproval ? '硬阻断' : '风险提示'}</strong><span>{blocker.reason}</span>
      </div>) : <div className="empty">暂无交付阻断。</div>}
    </div>
  </section>;
}
