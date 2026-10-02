import express from 'express';
import { approve, approvalReviewContext, assets, budgetLines, contracts, createApproval, dashboard, projectSummary, projects, rightsConflicts } from './domain.js';
const app = express(); app.use(express.json());
app.get('/api/dashboard', (_req, res) => res.json(dashboard()));
app.get('/api/projects', (_req, res) => res.json(projects));
app.get('/api/projects/:id/summary', (req, res) => { const result = projectSummary(req.params.id); if (!result.project) return res.status(404).json({ message: '项目不存在' }); res.json(result); });
app.get('/api/projects/:id/rights-conflicts', (req, res) => res.json(rightsConflicts(req.params.id)));
app.get('/api/projects/:id/assets', (req, res) => res.json(assets.filter(asset => asset.projectId === req.params.id)));
app.get('/api/projects/:id/contracts', (req, res) => res.json(contracts.filter(contract => contract.projectId === req.params.id)));
app.get('/api/budgets/:projectId/lines', (req, res) => res.json(budgetLines.filter(line => line.projectId === req.params.projectId)));
app.get('/api/approvals/:id/review-context', (req, res) => { const result = approvalReviewContext(req.params.id); if (!result) return res.status(404).json({ message: '审批不存在' }); res.json(result); });
app.post('/api/approvals', (req, res) => res.status(201).json(createApproval(req.body)));
app.patch('/api/approvals/:id', (req, res) => {
  if (!['approved', 'rejected'].includes(req.body?.status)) return res.status(400).json({ message: 'status 必须为 approved 或 rejected' });
  const result = approve(req.params.id, req.body.status, req.body.comment, req.body.expectedEntityVersion);
  if (!result.ok) {
    if (result.reason === 'not-found') return res.status(404).json({ message: '审批不存在' });
    if (result.reason === 'already-decided') return res.status(409).json({ message: '该审批已完成，不可重复操作' });
    return res.status(409).json({ message: '实体版本已变更，请刷新复核上下文后再操作', currentVersion: result.currentVersion });
  }
  res.json(result.approval);
});
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'film-rights-platform' }));
const port = Number(process.env.PORT || 4104); app.listen(port, () => console.log(`film rights API listening on ${port}`));
