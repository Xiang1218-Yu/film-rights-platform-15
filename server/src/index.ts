import express from 'express';
import { approve, assets, budgetLines, contracts, createApproval, dashboard, projectSummary, projects, reviewContext, rightsConflicts } from './domain.js';
import type { ApprovalDecisionError, ApprovalStatus } from './domain.js';

const app = express();
app.use(express.json());

app.get('/api/dashboard', (_req, res) => res.json(dashboard()));
app.get('/api/projects', (_req, res) => res.json(projects));
app.get('/api/projects/:id/summary', (req, res) => {
  const result = projectSummary(req.params.id);
  if (!result.project) return res.status(404).json({ message: '项目不存在' });
  return res.json(result);
});
app.get('/api/projects/:id/rights-conflicts', (req, res) => res.json(rightsConflicts(req.params.id)));
app.get('/api/projects/:id/assets', (req, res) => res.json(assets.filter(asset => asset.projectId === req.params.id)));
app.get('/api/projects/:id/contracts', (req, res) => res.json(contracts.filter(contract => contract.projectId === req.params.id)));
app.get('/api/budgets/:projectId/lines', (req, res) => res.json(budgetLines.filter(line => line.projectId === req.params.projectId)));
app.get('/api/approvals/:id/review-context', (req, res) => {
  const context = reviewContext(req.params.id);
  if (!context) return res.status(404).json({ message: '审批或所属项目不存在' });
  return res.json(context);
});
app.post('/api/approvals', (req, res) => res.status(201).json(createApproval(req.body)));
app.patch('/api/approvals/:id', (req, res) => {
  const { status, comment, expectedContextVersion } = req.body as {
    status: ApprovalStatus;
    comment?: string;
    expectedContextVersion?: string;
  };
  const result = approve(req.params.id, status, comment ?? '', expectedContextVersion);
  if (!result) return res.status(404).json({ message: '审批不存在' });
  if ('code' in result) {
    const httpStatus = result.code === 'not_actionable' ? 422 : 409;
    return res.status(httpStatus).json(result as ApprovalDecisionError);
  }
  return res.json(result);
});
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'film-rights-platform' }));

const port = Number(process.env.PORT || 4104);
app.listen(port, () => console.log(`film rights API listening on ${port}`));
