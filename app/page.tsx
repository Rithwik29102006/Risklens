'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield, LayoutDashboard, ChartNoAxesCombined, Layers, SlidersHorizontal,
  Target, Plug, FileCheck2, Sparkles, ArrowUpRight, ArrowRight, Download,
  RefreshCw, Search, ChevronRight, ChevronLeft, Activity, Server, Check,
  Info, Send, Upload, Database, Wallet, BookOpen, X, Play, HelpCircle,
  Printer, Building2, RotateCcw, Eye,
} from 'lucide-react';
import {
  Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger,
} from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip, BarChart, Bar, Cell,
} from 'recharts';
import { demo } from '@/lib/demo';
import { Dataset, quantify, total, optimize, simulate, money, forecast } from '@/lib/risk';
import { datasetSchema } from '@/lib/validation';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { OnboardingState } from '@/lib/onboarding';
import { TraceableScenarioExplanation } from '@/lib/mapping';

// ── Navigation ────────────────────────────────────────────────────────────
const nav = [
  ['Overview', LayoutDashboard],
  ['Risk register', Shield],
  ['Assets & services', Layers],
  ['Scenario lab', SlidersHorizontal],
  ['Investment optimizer', Target],
  ['Framework mapping', FileCheck2],
  ['Data sources', Plug],
  ['Risk assistant', Sparkles],
  ['Methodology', BookOpen],
] as const;

const colors = ['#33c5bc', '#4e83e5', '#9275db', '#d99f50', '#d36f80', '#8da4b4'];

const frameworks = [
  { name: 'NIST CSF 2.0', prefix: 'NIST', url: 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf', scope: 'Protect, Detect, Recover • selected outcomes' },
  { name: 'ISO/IEC 27001:2022', prefix: 'ISO', url: 'https://www.iso.org/standard/27001', scope: 'Selected Annex A controls • analyst mappings' },
  { name: 'CIS Controls v8.1', prefix: 'CIS', url: 'https://www.cisecurity.org/controls/v8-1', scope: 'Selected control groups' },
  { name: 'RBI Cyber Security Framework', prefix: 'RBI', url: 'https://www.rbi.org.in/commonman/english/scripts/Notification.aspx?Id=1721', scope: 'Banks • thematic mapping; applicability review required' },
  { name: 'SEBI CSCRF', prefix: 'SEBI', url: 'https://www.sebi.gov.in/legal/circulars/aug-2025/technical-clarifications-to-cybersecurity-and-cyber-resilience-framework-cscrf-for-sebi-regulated-entities-res-_96329.html', scope: 'Regulated entities • thematic mapping; category review required' },
];

const descriptions: Record<string, string> = {
  'Overview': 'A financial perspective on your cyber exposure.',
  'Risk register': 'Prioritise the scenarios that matter most to your business.',
  'Assets & services': 'Connect technical exposure to the services you depend on.',
  'Scenario lab': 'Explore the financial effect of a stronger security posture.',
  'Investment optimizer': 'Put your next security investment where it matters.',
  'Framework mapping': 'Trace risk treatment to control evidence and governance.',
  'Data sources': 'Bring security signals and business context together.',
  'Risk assistant': 'Ask a business question. Get an answer grounded in your assessment.',
  'Methodology': 'Understand every assumption behind the numbers.',
};

// ── Tooltip explanations ───────────────────────────────────────────────────
const TIPS: Record<string, string> = {
  eal: 'Expected Annual Loss = modelled incident rate (λ) × mean loss per incident. EAL is the statistical expectation of annual financial loss — not a prediction for any single year. It combines incident frequency, CVSS severity, threat context, control effectiveness, and per-incident loss components.',
  likelihood: 'Annual incident likelihood = 1 − e^−λ (Poisson). This is the probability of at least one incident in a 12-month period. λ can exceed 1; the annual probability is always 0–100%. This differs from the raw Poisson rate (λ), which counts expected incidents per year.',
  p95: '95th-percentile annual loss from 5,000 Monte Carlo trials. Each trial samples Poisson (incident count) × lognormal (loss per incident) for every risk. Seeded for reproducibility. This is a loss severity percentile, not a confidence interval for the EAL.',
  control: 'Average analyst-supplied control effectiveness across all risk scenarios (0–100%). Represents the assumed proportional reduction in incident rate if the control is fully deployed and validated. Must be calibrated against your specific environment and threat model.',
  residual: 'Residual risk after selected controls are applied. Each control reduces its target scenarios multiplicatively: residual = baseline × Π(1 − reduction_i). Overlapping controls compound — they do not add linearly. This avoids double-counting shared effectiveness.',
  rosi: 'Return on Security Investment = (Annual loss reduction − First-year cost) ÷ First-year cost. A positive ROSI means the control pays for itself in year one based on modelled loss reduction. All recurring costs must be included in the stated first-year cost input.',
};

// ── Guided demo step definitions ──────────────────────────────────────────
type DemoStep = {
  step: number;
  title: string;
  page: typeof nav[number][0];
  description: string;
  instruction: string;
  openTopRisk?: boolean;
  autoSelected?: string[];
  autoDelay?: number;
  autoBudget?: number;
  applyOptimal?: boolean;
  autoQuestion?: string;
};

const DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    title: 'Financial Exposure Overview',
    page: 'Overview',
    description: 'RiskLens quantifies cyber risk in financial terms. The Expected Annual Loss (EAL) is the modelled annual exposure — combining incident frequency, CVSS severity, threat context, control effectiveness, and per-incident business impact.',
    instruction: 'Review the four headline metrics. Note the EAL figure and the achievable risk reduction within the current ₹1 Cr budget.',
  },
  {
    step: 2,
    title: 'Largest Risk Driver & Evidence',
    page: 'Risk register',
    description: 'The risk register ranks all 8 scenarios by financial impact. Each row shows annual incident likelihood and EAL contribution. Evidence findings, CVSS scores, and loss breakdowns are available for every scenario.',
    instruction: 'Click the top-ranked risk to open its detail panel and review the evidence finding, likelihood model inputs, and per-incident loss components.',
    openTopRisk: true,
  },
  {
    step: 3,
    title: 'Privileged MFA — Scenario Model',
    page: 'Scenario lab',
    description: 'The Scenario Lab models the financial effect of a control before deployment. Privileged MFA is pre-selected. The residual EAL and first-year ROSI are computed live from the financial model — no hardcoded values.',
    instruction: 'Review the three scenario metrics: residual EAL, annual loss reduction, and first-year ROSI. Note how MFA addresses identity compromise and lateral movement.',
    autoSelected: ['mfa'],
    autoDelay: 0,
  },
  {
    step: 4,
    title: '30-Day Implementation Delay',
    page: 'Scenario lab',
    description: 'Delayed implementation preserves baseline exposure during the delay period. The model prorates 30 days at full current risk, then applies MFA benefits for the remaining 335 days — it does not assume threat growth during the delay.',
    instruction: 'Compare the residual EAL here (30-day delay) against Step 3 (immediate). The difference is the additional modelled exposure from waiting one month.',
    autoSelected: ['mfa'],
    autoDelay: 30,
  },
  {
    step: 5,
    title: 'Investment Optimizer — ₹1 Crore',
    page: 'Investment optimizer',
    description: 'The optimizer evaluates all 128 possible control combinations (2^7 portfolios) and selects the one that maximises annual loss reduction within the budget. Overlapping control effects are compounded multiplicatively, not summed.',
    instruction: 'Click "Apply optimal portfolio" to load the budget-optimal selection. Review which controls are selected, the total cost, and annual loss avoided.',
    autoBudget: 10000000,
    autoDelay: 0,
    applyOptimal: true,
  },
  {
    step: 6,
    title: 'Risk Intelligence Assistant',
    page: 'Risk assistant',
    description: 'A local Naive Bayes classifier maps your question to one of four supported intents, then returns an answer grounded in the financial model — no external AI, no generated content, all answers are verified calculations.',
    instruction: 'Click the suggested question or type your own. The assistant explains your highest risk, MFA benefits, delay costs, or optimal portfolio.',
    autoQuestion: 'Which investments fit our budget?',
  },
  {
    step: 7,
    title: 'Save Plan & Export Report',
    page: 'Investment optimizer',
    description: 'Investment plans are saved with their full assessment snapshot — the exact dataset, selected controls, budget, and computed results. The JSON executive report includes scope, methodology, assumptions, and all calculated values.',
    instruction: 'Name the plan "SIH Demo Portfolio", click Save Investment Plan, then click Export Report to download the board-ready JSON.',
  },
];

// ── Helper components ─────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="infotip-wrap">
      <button
        className="infotip-btn"
        aria-label="Explanation"
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <HelpCircle size={12} />
      </button>
      {open && (
        <div className="infotip-pop" role="tooltip">
          {text}
          <button className="infotip-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>
      )}
    </span>
  );
}

function Picker({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="picker"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Panel({ title, sub, children, action, className = '' }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <section className={'panel ' + className}>
      <div className="panel-head">
        <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, note, icon: Icon, tone = '', tip }: { label: string; value: string; note: string; icon: any; tone?: string; tip?: string }) {
  return (
    <div className={'metric ' + tone}>
      <div className="metric-label">
        <span className="metric-label-text">{label}{tip && <InfoTip text={tip} />}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}

function dlFile(name: string, data: string, type = 'application/json') {
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([data], { type }));
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Guided Demo Card ──────────────────────────────────────────────────────
function GuidedDemoCard({ step, onNext, onPrev, onExit }: { step: DemoStep; onNext: () => void; onPrev: () => void; onExit: () => void; }) {
  const idx = step.step - 1;
  const isLast = idx === DEMO_STEPS.length - 1;
  return (
    <div className="demo-overlay">
      <div className="demo-card" role="complementary" aria-label="Guided demo">
        <div className="demo-card-head">
          <div className="demo-progress" aria-label={`Step ${step.step} of ${DEMO_STEPS.length}`}>
            {DEMO_STEPS.map((_, i) => (
              <div key={i} className={'demo-dot' + (i < idx ? ' done' : i === idx ? ' active' : '')} />
            ))}
          </div>
          <button className="demo-exit" onClick={onExit} aria-label="Exit guided demo">
            <X size={14} /> Exit demo
          </button>
        </div>
        <div className="demo-step-num">Step {step.step} of {DEMO_STEPS.length}</div>
        <h3 className="demo-title">{step.title}</h3>
        <p className="demo-description">{step.description}</p>
        <div className="demo-instruction">
          <span className="demo-instruction-label">👉 Now:</span> {step.instruction}
        </div>
        <div className="demo-card-foot">
          <button className="button secondary" onClick={onPrev} disabled={idx === 0}>
            <ChevronLeft size={15} /> Prev
          </button>
          <button className="button teal" onClick={onNext} id="btn-demo-next">
            {isLast ? 'Finish demo ✓' : <>Next <ChevronRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function Home() {
  // Core state (unchanged from original)
  const [page, setPage] = useState<typeof nav[number][0]>('Overview');
  const [data, setData] = useState<Dataset>(demo);
  const [unit, setUnit] = useState('All business units');
  const [selected, setSelected] = useState<string[]>(['patch', 'mfa']);
  const [budget, setBudget] = useState(10000000);
  const [delay, setDelay] = useState(0);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [framework, setFramework] = useState('NIST CSF 2.0');
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string; refs?: string[] }[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [planName, setPlanName] = useState('FY27 priority risk reduction');
  // Guided Demo & Banner state
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  // Business Onboarding & Personalization state
  const [viewMode, setViewMode] = useState<'onboarding' | 'dashboard'>('onboarding');
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingState | null>(null);
  const [orgProfile, setOrgProfile] = useState<any>(null);
  const [traceableExplanations, setTraceableExplanations] = useState<TraceableScenarioExplanation[]>([]);
  const [hasRealAssessment, setHasRealAssessment] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  async function refresh(initial = false) {
    try {
      const r = await fetch('/api/assessment');
      const b = await r.json() as any;
      if (!r.ok) throw Error(b.error);

      if (b.hasAssessment && b.dataset) {
        setData(b.dataset);
        setSelected(p => p.filter(id => b.dataset.actions.some((a: any) => a.id === id)));
        setUnit(u => u === 'All business units' || b.dataset.assets.some((a: any) => a.unit === u) ? u : 'All business units');
        setUpdated(b.updatedAt);
        setHistory(b.history || []);
        setPlans(b.plans || []);
        setError('');
        if (b.profile) setOrgProfile(b.profile);
        if (b.traceableExplanations) setTraceableExplanations(b.traceableExplanations);

        if (!b.isDemo) {
          setHasRealAssessment(true);
          setViewMode('dashboard');
          setDemoMode(false);
        } else {
          // If in demo mode
          setHasRealAssessment(false);
          if (initial && !b.draft) {
            setViewMode('onboarding');
          }
        }
      } else {
        setHasRealAssessment(false);
        setViewMode('onboarding');
      }

      if (b.draft?.state) {
        setOnboardingDraft(b.draft.state);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(true);
    const id = setInterval(() => refresh(), 60000);
    return () => clearInterval(id);
  }, []);

  // ── Derived calculations (unchanged) ─────────────────────────────────────
  const scoped = useMemo(() => {
    const assets = data.assets.filter(a => unit === 'All business units' || a.unit === unit);
    const ids = new Set(assets.map(a => a.id));
    const risks = data.risks.filter(r => ids.has(r.assetId));
    const rids = new Set(risks.map(r => r.id));
    return {
      ...data,
      assets: assets.map(a => ({ ...a, dependencies: a.dependencies.filter(id => ids.has(id)) })),
      risks,
      actions: data.actions.map(a => ({ ...a, effects: Object.fromEntries(Object.entries(a.effects).filter(([id]) => rids.has(id))) })),
    };
  }, [data, unit]);

  const risks = useMemo(() => quantify(scoped), [scoped]);
  const base = useMemo(() => total(scoped), [scoped]);
  const distribution = useMemo(() => simulate(scoped), [scoped]);
  const optimal = useMemo(() => optimize(scoped, budget), [scoped, budget]);
  const residual = useMemo(() => total(scoped, selected, delay), [scoped, selected, delay]);

  const cost = data.actions.filter(a => selected.includes(a.id)).reduce((s, a) => s + a.cost, 0);
  const reduction = base - residual;
  const score = Math.round(100 * (1 - Math.exp(-base / 1e8)));
  const control = risks.reduce((s, r) => s + r.control, 0) / Math.max(1, risks.length) * 100;

  const unitData = [...new Set(data.assets.map(a => a.unit))].map((u, i) => ({
    name: u,
    value: total({ ...data, risks: data.risks.filter(r => data.assets.find(a => a.id === r.assetId)?.unit === u) }),
    color: colors[i],
  }));
  const curve = useMemo(() => Array.from({ length: 11 }, (_, i) => {
    const b = i * 2000000;
    return { budget: b / 1e5, reduction: optimize(scoped, b).reduction / 1e7 };
  }), [scoped]);

  const currentRisk = risks.find(r => r.id === detail);
  const projected = forecast(history.filter(h => h.kind === (data.demo ? 'demo' : 'import')));
  const historyData = history
    .filter(h => h.kind === (data.demo ? 'demo' : 'import'))
    .map(h => ({ date: new Date(h.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), value: h.eal / 1e7 }));
  const stale = risks.filter(r => Date.now() - Date.parse(r.observedAt) > 86400000).length;

  // ── Actions ──────────────────────────────────────────────────────────────
  const toggle = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  async function save(kind = 'snapshot', dataset = data) {
    setSaving(true);
    try {
      const r = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'plan'
          ? { kind, dataset: scoped, selected, budget, delay, name: planName }
          : { kind, dataset }),
      });
      const b = await r.json() as { error?: string };
      if (!r.ok) throw Error(b.error);
      toast.success(kind === 'plan' ? 'Investment plan saved' : 'Assessment saved');
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function importData(text: string) {
    try {
      const parsed = datasetSchema.parse(JSON.parse(text));
      await save('import', parsed);
      setUnit('All business units');
      setSelected([]);
    } catch {
      toast.error('Import failed. Use the sample schema; check unique IDs, references, and numeric ranges.');
    }
  }

  async function ask(q = question) {
    if (!q.trim() || thinking) return;
    setQuestion('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setThinking(true);
    try {
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, dataset: scoped, budget }),
      });
      const b = await r.json() as { answer: string; refs: string[]; error?: string };
      if (!r.ok) throw Error(b.error);
      setMessages(m => [...m, { role: 'assistant', text: b.answer, refs: b.refs }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: (e as Error).message }]);
    } finally {
      setThinking(false);
    }
  }

  function exportReport() {
    dlFile('risklens-board-report.json', JSON.stringify({
      title: 'Cyber risk decision report',
      generatedAt: new Date().toISOString(),
      dataType: data.demo ? 'Synthetic demonstration — modelled estimates' : 'User supplied; unverified',
      scope: unit,
      model: 'RiskLens 1.0 • analyst-calibrated compound Poisson/lognormal',
      expectedAnnualLoss: base,
      annualLossPercentiles: distribution,
      riskIndex: score,
      risks,
      optimalPortfolio: { ...optimal, budget },
      selectedScenario: { selected, delay, cost, residual, reduction },
      frameworks,
      limitations: [
        'Control mappings are illustrative, not compliance certification.',
        'Independent event assumption; dependency losses are not cascaded.',
        'Financial and effectiveness inputs require validation.',
        'All amounts INR; first-year costs.',
        data.demo ? 'This report uses synthetic demonstration data — modelled estimates only.' : 'This report uses imported assessment data; financial inputs require stakeholder validation.',
      ],
      assessment: scoped,
    }, null, 2));
    toast.success('Board report exported');
  }

  function printExecutiveSummary() {
    const el = document.getElementById('print-report');
    if (!el) return;
    el.innerHTML = `
      <div class="pr-header">
        <h1>Executive Cyber Risk Report — RiskLens</h1>
        <div class="pr-meta">
          <span>Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</span>
          <span>Scope: ${unit}</span>
          <span>Model: RiskLens 1.0 · Analyst-calibrated Poisson/lognormal</span>
          <span class="pr-badge">${data.demo ? 'Synthetic demonstration data — modelled estimates' : 'Imported assessment — unverified'}</span>
        </div>
      </div>
      <div class="pr-section">
        <h2>Financial Exposure Summary</h2>
        <table class="pr-table">
          <tr><td>Expected Annual Loss (EAL)</td><td>${money(base)}</td></tr>
          <tr><td>95th-percentile Annual Loss (VaR95)</td><td>${money(distribution.p95)}</td></tr>
          <tr><td>50th-percentile Annual Loss (Median)</td><td>${money(distribution.p50)}</td></tr>
          <tr><td>Risk scenarios assessed</td><td>${risks.length}</td></tr>
          <tr><td>Model-defined risk index</td><td>${score} / 100</td></tr>
          <tr><td>Average control effectiveness</td><td>${control.toFixed(0)}%</td></tr>
        </table>
      </div>
      <div class="pr-section">
        <h2>Top Risk Scenarios (by Expected Annual Loss)</h2>
        <table class="pr-table">
          <tr><th>Scenario</th><th>Asset</th><th>Annual Likelihood</th><th>Expected Annual Loss</th></tr>
          ${risks.slice(0, 5).map(r => `<tr>
            <td>${r.name}</td>
            <td>${r.asset.name} (${r.asset.unit})</td>
            <td>${(r.likelihood * 100).toFixed(1)}%</td>
            <td>${money(r.eal)}</td>
          </tr>`).join('')}
        </table>
      </div>
      <div class="pr-section">
        <h2>Budget-Optimal Investment Portfolio (Budget: ${money(budget)})</h2>
        <table class="pr-table">
          <tr><td>Portfolio cost</td><td>${money(optimal.cost)}</td></tr>
          <tr><td>Annual loss avoided</td><td>${money(optimal.reduction)}</td></tr>
          <tr><td>Exposure reduction</td><td>${base ? (100 * optimal.reduction / base).toFixed(1) : 0}%</td></tr>
          <tr><td>Residual expected annual loss</td><td>${money(base - optimal.reduction)}</td></tr>
          <tr><td>Selected controls</td><td>${data.actions.filter(a => optimal.ids.includes(a.id)).map(a => a.name).join(', ') || 'None within budget'}</td></tr>
        </table>
      </div>
      <div class="pr-section">
        <h2>Methodology &amp; Assumptions</h2>
        <ul>
          <li><strong>Incident rate:</strong> λ = base frequency × (0.5 + CVSS/10) × threat multiplier × (1 − control effectiveness) × (criticality/3). Analyst-calibrated heuristic — CVSS is a severity input, not exploitation probability.</li>
          <li><strong>Financial exposure:</strong> EAL = λ × (downtime + breach + penalty + reputation). Loss inputs are analyst-supplied INR estimates per incident.</li>
          <li><strong>Monte Carlo:</strong> 5,000 seeded trials. Incident count follows Poisson(λ); loss per incident follows lognormal with scenario-specific uncertainty. Events assumed independent.</li>
          <li><strong>Portfolio optimisation:</strong> Exhaustive enumeration of all ${Math.pow(2, data.actions.length)} control subsets. Overlapping effects are multiplicative, not additive.</li>
          <li><strong>Framework mappings</strong> are illustrative — not compliance certification. Verify scope, licensed requirements, and sector applicability before regulatory use.</li>
          <li>${data.demo ? '<strong>Data:</strong> Synthetic demonstration dataset — all figures are modelled estimates, not observed outcomes.' : '<strong>Data:</strong> Imported assessment. Financial inputs require stakeholder validation before use in decisions.'}</li>
        </ul>
      </div>
      <div class="pr-footer">RiskLens · Decision intelligence · SIH 2024 Problem Statement 26105 · All amounts in INR · ${new Date().getFullYear()}</div>
    `;
    window.print();
  }

  // ── Guided demo navigation ────────────────────────────────────────────────
  function navigateToStep(idx: number) {
    const s = DEMO_STEPS[idx];
    setPage(s.page);
    if (s.autoSelected !== undefined) setSelected(s.autoSelected);
    if (s.autoDelay !== undefined) setDelay(s.autoDelay);
    if (s.autoBudget !== undefined) setBudget(s.autoBudget);
    if (s.applyOptimal) {
      const b = s.autoBudget ?? budget;
      setSelected(optimize(scoped, b).ids);
    }
    if (s.openTopRisk && risks.length > 0) setDetail(risks[0].id);
    if (s.autoQuestion) setTimeout(() => ask(s.autoQuestion!), 100);
  }

  function startDemo() {
    setDemoMode(true);
    setDemoStep(0);
    navigateToStep(0);
  }

  function demoNext() {
    if (demoStep === DEMO_STEPS.length - 1) {
      setDemoMode(false);
      toast.success('Guided demo complete — feel free to explore!');
      return;
    }
    const next = demoStep + 1;
    setDemoStep(next);
    navigateToStep(next);
  }

  function demoPrev() {
    if (demoStep === 0) return;
    const prev = demoStep - 1;
    setDemoStep(prev);
    navigateToStep(prev);
  }

  function exitDemo() {
    setDemoMode(false);
    setDelay(0);
    setSelected(['patch', 'mfa']);
  }

  // ── Risk table ─────────────────────────────────────────────────────────
  const riskTable = (items = risks) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Risk scenario / asset</TableHead>
          <TableHead>Business unit</TableHead>
          <TableHead>Annual likelihood <InfoTip text={TIPS.likelihood} /></TableHead>
          <TableHead>Expected annual loss <InfoTip text={TIPS.eal} /></TableHead>
          <TableHead>Contribution</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(r => (
          <TableRow key={r.id}>
            <TableCell>
              <button className="risk-name" onClick={() => setDetail(r.id)}>{r.name}</button>
              <span className="table-sub">{r.asset.name}</span>
            </TableCell>
            <TableCell>{r.asset.unit}</TableCell>
            <TableCell><span className={'badge ' + (r.likelihood > .5 ? 'amber' : 'neutral')}>{(r.likelihood * 100).toFixed(0)}%</span></TableCell>
            <TableCell className="numeric">{money(r.eal)}</TableCell>
            <TableCell>
              <div className="contribution">
                <Progress value={base ? r.eal / base * 100 : 0} />
                <span>{(base ? r.eal / base * 100 : 0).toFixed(0)}%</span>
              </div>
            </TableCell>
            <TableCell>
              <button aria-label={'View ' + r.name} className="icon-btn" onClick={() => setDetail(r.id)}><ArrowUpRight size={17} /></button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (viewMode === 'onboarding') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Toaster position="bottom-right" richColors />
        <div className="border-b border-border/80 bg-card px-6 py-3 sticky top-0 z-30 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg text-foreground">
              <span className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Shield size={20} />
              </span>
              <span>risklens<span className="text-teal-500">.</span></span>
              <span className="text-xs font-normal text-muted-foreground ml-2 border-l border-border pl-2">
                Business-First Cyber Risk Assessment
              </span>
            </div>

            {hasRealAssessment && (
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
              >
                <span>Back to Dashboard</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        <main>
          <OnboardingWizard
            initialDraft={onboardingDraft}
            onComplete={(newDataset, fullState, meta) => {
              setData(newDataset);
              setOrgProfile(fullState.profile);
              setOnboardingDraft(fullState);
              setHasRealAssessment(true);
              setDemoMode(false);
              setViewMode('dashboard');
              refresh();
            }}
            onExploreDemo={() => {
              setData(demo);
              setDemoMode(true);
              setViewMode('dashboard');
              toast.info('Exploring synthetic demonstration data (Meridian Financial)');
            }}
          />
        </main>
      </div>
    );
  }

  const orgDisplayName = orgProfile?.orgName || (data.demo ? 'Meridian Financial' : (data.name.split('•')[0].trim() || 'Your Organization'));
  const orgInitials = orgDisplayName.slice(0, 2).toUpperCase();

  return (
    <SidebarProvider style={{ '--sidebar-width': '238px' } as React.CSSProperties}>
      <Toaster position="bottom-right" richColors />

      {/* Hidden container — populated by printExecutiveSummary() then printed */}
      <div id="print-report" aria-hidden="true" />

      {/* Guided demo overlay */}
      {demoMode && (
        <GuidedDemoCard
          step={DEMO_STEPS[demoStep]}
          onNext={demoNext}
          onPrev={demoPrev}
          onExit={exitDemo}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <Sidebar className="app-sidebar">
        <SidebarHeader>
          <div className="brand">
            <span className="brand-icon"><Shield size={25} /></span>
            <span>risklens<span className="brand-period">.</span></span>
          </div>
          <div className="workspace-name">
            <span className="workspace-avatar">{orgDisplayName[0]?.toUpperCase() || 'R'}</span>
            <div>{orgDisplayName} workspace<small>{data.demo ? 'Synthetic demonstration' : 'Personalized risk intelligence'}</small></div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-caption">WORKSPACE</div>
          <SidebarMenu>
            {nav.map(([n, Icon]) => (
              <SidebarMenuItem key={n}>
                <SidebarMenuButton
                  className="nav-button"
                  isActive={page === n}
                  onClick={() => { setPage(n); setQuery(''); }}
                  id={`nav-${n.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <Icon />
                  <span>{n}</span>
                  {n === 'Risk register' && <span className="nav-count">{data.risks.length}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <div className="demo-trigger-wrap">
            <button
              className="demo-trigger-btn"
              onClick={startDemo}
              id="btn-guided-demo"
              aria-label="Start guided demo — 7 steps"
            >
              <Play size={15} />
              Guided demo
              <span className="demo-trigger-badge">7 steps</span>
            </button>
          </div>

          <div className="sidebar-insight">
            <div><Activity size={16} /> FINANCIAL CLARITY</div>
            <p>Security signals.<br />Business decisions.</p>
            <button onClick={() => setPage('Methodology')}>Explore the model <ArrowUpRight size={14} /></button>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="profile">
            <div className="profile-avatar">{orgInitials}</div>
            <div>{orgDisplayName} risk office<small>{data.demo ? 'Private demo workspace' : 'Verified assessment'}</small></div>
            <Shield size={16} />
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="app-main">
        {/* Demo data banner */}
        {data.demo && !bannerDismissed && (
          <div className="demo-banner" role="status" aria-live="polite">
            <span>⚠️ <strong>Synthetic demonstration enterprise (Meridian Financial)</strong> — all figures are modelled estimates in read-only mode.</span>
            <button className="text-button" onClick={() => setViewMode('onboarding')}>Configure your business</button>
            <button className="demo-banner-dismiss" onClick={() => setBannerDismissed(true)} aria-label="Dismiss banner">×</button>
          </div>
        )}

        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>{orgDisplayName}</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="top-right">
            <span
              className="sample-label"
              style={{
                background: data.demo ? '#451a03' : '#042f2e',
                color: data.demo ? '#fbbf24' : '#5eead4',
                border: '1px solid currentColor',
              }}
            >
              {data.demo ? 'SYNTHETIC DEMO' : 'PERSONALIZED ASSESSMENT'}
            </span>
            <span className="currency">INR ₹</span>
          </div>
        </header>

        <div className="content">
          {/* Page title row */}
          <div className="page-title">
            <div>
              <div className="eyebrow">CYBER RISK INTELLIGENCE</div>
              <h1>{page === 'Overview' ? 'Risk overview' : page}</h1>
              <p>{descriptions[page]}</p>
            </div>
            <div className="title-actions">
              <button
                className="button secondary"
                onClick={() => setViewMode('onboarding')}
                id="btn-edit-business-profile"
                title="Update business profile and security posture questions"
              >
                <Building2 size={16} /> Edit Profile & Posture
              </button>
              {data.demo ? (
                <button
                  className="button teal"
                  onClick={() => {
                    if (hasRealAssessment) refresh();
                    else setViewMode('onboarding');
                  }}
                >
                  <RotateCcw size={16} /> Return to Your Business
                </button>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => {
                    setData(demo);
                    setDemoMode(true);
                    toast.info('Exploring synthetic demonstration data (Meridian Financial)');
                  }}
                >
                  <Eye size={16} /> Explore Sample Enterprise
                </button>
              )}
              <button className="button secondary" onClick={printExecutiveSummary} id="btn-print-report" title="Print executive summary">
                <Printer size={16} /> Print
              </button>
              <button className="button secondary" onClick={exportReport} id="btn-export-report">
                <Download size={16} /> Export report
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="inline">
              <Picker
                value={unit}
                onChange={setUnit}
                options={['All business units', ...new Set(data.assets.map(a => a.unit))]}
                label="Business unit"
              />
              <span className="model-tag">12-month risk horizon</span>
            </div>
            <button className="refresh" onClick={() => refresh()} disabled={loading}>
              <RefreshCw size={14} />
              {loading ? 'Loading saved data…' : updated
                ? 'Saved ' + new Date(updated).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Unsaved sample assessment'}
            </button>
          </div>

          {error && (
            <div className="notice error" role="alert">
              {error} Showing sample or last loaded data. <button onClick={() => refresh()}>Retry</button>
            </div>
          )}

          {/* ── Overview ─────────────────────────────────────────────── */}
          {page === 'Overview' && <>
            <div className="metrics" id="overview-metrics">
              <Metric label="Expected annual loss" value={money(base)} note="Modelled financial exposure / year" icon={Wallet} tone="primary-metric" tip={TIPS.eal} />
              <Metric label="95th percentile annual loss" value={money(distribution.p95)} note="5,000 simulated annual outcomes" icon={ChartNoAxesCombined} tip={TIPS.p95} />
              <Metric label="Achievable risk reduction" value={money(optimal.reduction)} note={'With a ' + money(budget) + ' investment budget'} icon={Target} />
              <Metric label="Control effectiveness" value={control.toFixed(0) + '%'} note={'Average across ' + risks.length + ' risk scenarios'} icon={Shield} tip={TIPS.control} />
            </div>

            <div className="overview-grid">
              <Panel title="Financial exposure by business unit" sub="Expected annual loss · INR crore" action={<span className="badge neutral">Current assessment</span>}>
                <div className="exposure-chart">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={unitData.filter(u => unit === 'All business units' || u.name === unit)} margin={{ left: 0, right: 18, top: 15, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e7edf1" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6d7d8b', fontSize: 13 }} />
                      <YAxis tickFormatter={v => (v / 1e7).toFixed(1)} tickLine={false} axisLine={false} width={42} tick={{ fill: '#8996a3', fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => money(Number(v))} cursor={{ fill: '#f2f6f8' }} />
                      <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={78}>
                        {unitData.filter(u => unit === 'All business units' || u.name === unit).map(u => <Cell key={u.name} fill={u.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-foot">
                  <span><span className="legend-dot" />Financial impact weighted by likelihood</span>
                  <button onClick={() => setPage('Risk register')}>Explore risk drivers <ArrowRight size={14} /></button>
                </div>
              </Panel>

              <Panel title="Your next best investment" className="opportunity" sub="Budget-constrained recommendation">
                <div className="opportunity-icon"><Sparkles size={24} /></div>
                <h3>{optimal.ids.length} actions. Measurable impact.</h3>
                <p>The best portfolio within {money(budget)} reduces modelled annual exposure by <strong>{(base ? 100 * optimal.reduction / base : 0).toFixed(0)}%.</strong></p>
                <div className="opportunity-numbers">
                  <div><span>Recommended spend</span><b>{money(optimal.cost)}</b></div>
                  <div><span>Annual loss avoided</span><b>{money(optimal.reduction)}</b></div>
                </div>
                <button className="button teal" onClick={() => setPage('Investment optimizer')}>Explore investment plan <ArrowRight size={16} /></button>
                <small>Based on defined costs and control assumptions</small>
              </Panel>
            </div>

            <Panel title="Top financial risk contributors" sub="Ranked by expected annual loss" action={<button className="text-button" onClick={() => setPage('Risk register')}>View all risks <ArrowRight size={15} /></button>}>
              {riskTable(risks.slice(0, 4))}
            </Panel>

            <div className="bottom-grid">
              <Panel title="Assessment history" sub="Saved enterprise snapshots">
                <div className="history-chart">
                  {historyData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={170}>
                      <AreaChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 5" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} unit=" Cr" width={65} />
                        <Tooltip formatter={(v: any) => money(Number(v) * 1e7)} />
                        <Area dataKey="value" name="Expected annual loss" stroke="#19a399" fill="#ddf3ef" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state">
                      <ChartNoAxesCombined size={26} />
                      <p>Start a reliable risk history.</p>
                      <span>Save assessments as your telemetry changes.</span>
                      <button className="button secondary" disabled={saving} onClick={() => save()} id="btn-save-baseline">Save baseline assessment</button>
                    </div>
                  )}
                </div>
              </Panel>
              <Panel title="Data confidence" sub="Know what stands behind the estimate">
                <div className="quality-row"><span>Data provenance</span><span className="badge amber">{data.demo ? 'Synthetic sample' : 'User-supplied'}</span></div>
                <div className="quality-row"><span>Signals older than 24 hours</span><strong>{stale} / {risks.length}</strong></div>
                <div className="quality-row"><span>Financial inputs</span><span>Analyst assumptions</span></div>
                <div className="quality-row"><span>Risk index · model-defined</span><strong>{score} / 100</strong></div>
                <button className="text-button" onClick={() => setPage('Data sources')}>Review data sources <ArrowRight size={14} /></button>
              </Panel>
            </div>
          </>}

          {/* ── Risk register ─────────────────────────────────────────── */}
          {page === 'Risk register' && <>
            <div className="search-row">
              <label className="search-input">
                <Search size={17} />
                <input aria-label="Search risk register" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search risks, assets, findings…" />
              </label>
              <button className="button secondary" disabled={saving} onClick={() => save()} id="btn-save-assessment"><Database size={16} /> Save assessment</button>
            </div>
            <Panel title="Financial risk register" sub={`${risks.length} scenarios • annual likelihood is the probability of at least one incident in a year`}>
              {riskTable(risks.filter(r => (r.name + ' ' + r.asset.name + ' ' + r.finding).toLowerCase().includes(query.toLowerCase())))}
            </Panel>
            <div className="notice"><Info size={17} />Click a risk to inspect its evidence, financial loss components, and mitigation options.</div>
          </>}

          {/* ── Assets & services ─────────────────────────────────────── */}
          {page === 'Assets & services' && (
            <div className="asset-grid">
              {scoped.assets.map(a => {
                const rs = risks.filter(r => r.assetId === a.id);
                return (
                  <Panel key={a.id} title={a.name} sub={a.unit} action={<Server size={20} className="muted" />}>
                    <div className="asset-exposure">{money(rs.reduce((s, r) => s + r.eal, 0))}<small>Expected annual loss</small></div>
                    <div className="quality-row"><span>Business service</span><strong>{a.service}</strong></div>
                    <div className="quality-row"><span>Criticality</span><span className="badge amber">{a.criticality} / 5</span></div>
                    <div className="quality-row"><span>Owner</span><span>{a.owner}</span></div>
                    <div className="dependencies"><span>Service dependencies</span><p>{a.dependencies.map(id => data.assets.find(x => x.id === id)?.name).join(' · ') || 'No dependencies declared'}</p></div>
                    {rs.map(r => <button key={r.id} className="asset-risk" onClick={() => setDetail(r.id)}>{r.name}<ArrowUpRight size={14} /></button>)}
                  </Panel>
                );
              })}
            </div>
          )}

          {/* ── Scenario lab & Investment optimizer ───────────────────── */}
          {(page === 'Scenario lab' || page === 'Investment optimizer') && <>
            <div className="planner-layout">
              <Panel title={page === 'Scenario lab' ? 'Build your scenario' : 'Set your investment budget'} sub="Change inputs to recalculate the financial result">
                <label className="field-label">First-year budget <strong>{money(budget)}</strong></label>
                <Slider aria-label="Investment budget" value={[budget]} onValueChange={v => setBudget(v[0])} min={0} max={20000000} step={100000} />
                <div className="range-labels"><span>₹0</span><span>₹2 Cr</span></div>
                <label className="field-label" htmlFor="budget-input">Exact budget · INR</label>
                <input id="budget-input" className="field" type="number" min="0" max="20000000" value={budget} onChange={e => setBudget(Math.max(0, Math.min(20000000, Number(e.target.value))))} />
                {page === 'Scenario lab' ? <>
                  <label className="field-label">Implementation delay <strong>{delay} days</strong></label>
                  <Slider aria-label="Implementation delay" value={[delay]} onValueChange={v => setDelay(v[0])} min={0} max={365} step={1} />
                  <p className="help">Baseline risk persists during the delay. Benefits apply to the remaining year. This does not model threat growth during the delay period.</p>
                </> : <>
                  <button className="button teal full" id="btn-apply-optimal" onClick={() => { setSelected(optimal.ids); setDelay(0); toast.success('Optimal portfolio applied'); }}>
                    <Sparkles size={16} /> Apply optimal portfolio
                  </button>
                  <p className="help">Evaluates all {Math.pow(2, data.actions.length)} possible portfolios. Cost and overlapping multiplicative effects are included.</p>
                </>}
                <div className="planner-baseline">
                  <span>Current expected annual loss</span>
                  <strong>{money(base)}</strong>
                </div>
              </Panel>

              <div>
                <div className="metrics scenario-metrics">
                  <Metric label="After selected controls" value={money(residual)} note={delay ? `${delay}-day delay included` : 'Annual loss after implementation'} icon={Shield} tip={TIPS.residual} />
                  <Metric label="Annual loss reduction" value={money(reduction)} note={`${(base ? reduction / base * 100 : 0).toFixed(1)}% lower exposure`} icon={ChartNoAxesCombined} tone="primary-metric" />
                  <Metric label="First-year ROSI" value={cost ? ((reduction - cost) / cost * 100).toFixed(0) + '%' : '—'} note="(Loss reduction − cost) / cost" icon={Wallet} tip={TIPS.rosi} />
                </div>
                <Panel title="Investment vs. risk reduction" sub="Best achievable reduction at each budget • assumes immediate implementation">
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={curve} margin={{ left: 5, right: 20, bottom: 8, top: 8 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 5" />
                      <XAxis dataKey="budget" tickFormatter={v => '₹' + v + ' L'} tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => v.toFixed(1) + ' Cr'} tick={{ fontSize: 12 }} width={60} />
                      <Tooltip formatter={(v: any) => money(Number(v) * 1e7)} labelFormatter={v => 'Budget ₹' + v + ' L'} />
                      <Area type="stepAfter" dataKey="reduction" name="Annual loss avoided" stroke="#16a397" fill="#daf1ed" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Panel>
              </div>
            </div>

            <Panel
              title="Choose risk treatments"
              sub="Individual benefits are standalone estimates; portfolio totals account for multiplicative overlap"
              action={<span className={'badge ' + (cost > budget ? 'red' : 'green')}>{money(cost)} / {money(budget)}</span>}
            >
              <div className="action-list">
                {data.actions.map(a => (
                  <label className={'action-item ' + (selected.includes(a.id) ? 'chosen' : '')} key={a.id}>
                    <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggle(a.id)} aria-label={a.name} id={`control-${a.id}`} />
                    <div className="action-info">
                      <strong>{a.name}</strong>
                      <p>{a.description}</p>
                      <span>{a.owner} · {a.days} days estimated delivery</span>
                    </div>
                    <div className="action-amount"><strong>{money(a.cost)}</strong><span>First-year cost</span></div>
                    <div className="action-amount benefit"><strong>{money(base - total(scoped, [a.id]))}</strong><span>Annual loss avoided</span></div>
                  </label>
                ))}
              </div>
              <div className="save-plan">
                <input className="field" aria-label="Plan name" id="plan-name-input" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Name your investment plan" />
                <button className="button teal" id="btn-save-plan" disabled={saving || !planName.trim() || cost > budget} onClick={() => save('plan')}>
                  <Check size={16} />{saving ? 'Saving…' : 'Save investment plan'}
                </button>
              </div>
              {cost > budget && <p className="notice error">This portfolio exceeds your budget by {money(cost - budget)}. Adjust the selection or budget before saving.</p>}
            </Panel>

            {plans.length > 0 && (
              <Panel title="Saved investment plans" sub="Each plan retains its original assessment and assumptions">
                {plans.map((p, i) => (
                  <div key={i} className="saved-plan">
                    <div>
                      <strong>{p.name}</strong>
                      <small>{new Date(p.createdAt).toLocaleString()} · {p.selected.length} controls · {money(p.cost)}</small>
                    </div>
                    <span>{money(p.base - p.residual)} annual reduction</span>
                    <button className="text-button" onClick={() => dlFile('risklens-investment-plan.json', JSON.stringify(p, null, 2))}>Export <Download size={14} /></button>
                  </div>
                ))}
              </Panel>
            )}
          </>}

          {/* ── Framework mapping ─────────────────────────────────────── */}
          {page === 'Framework mapping' && <>
            <div className="framework-summary">
              <FileCheck2 size={26} />
              <div>
                <h2>Evidence-led control mapping</h2>
                <p>Selected mappings support review. They do not establish regulatory compliance or replace a complete audit. Illustrative only.</p>
              </div>
            </div>
            <Tabs value={framework} onValueChange={setFramework}>
              <TabsList className="framework-tabs">
                {frameworks.map(f => <TabsTrigger key={f.name} value={f.name}>{f.name}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <Panel title={framework} sub={frameworks.find(f => f.name === framework)?.scope} action={<a className="text-button" href={frameworks.find(f => f.name === framework)?.url} target="_blank" rel="noreferrer">Official reference <ArrowUpRight size={14} /></a>}>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Control / theme</TableHead><TableHead>Risk treatment</TableHead><TableHead>Evidence signal</TableHead><TableHead>Assessment status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.actions.map(a => {
                    const prefix = frameworks.find(f => f.name === framework)!.prefix;
                    const mapped = a.frameworks.filter(x => x.startsWith(prefix));
                    return (
                      <TableRow key={a.id}>
                        <TableCell><strong>{mapped.join(', ') || (/RBI|SEBI/.test(prefix) ? a.name : 'Unmapped')}</strong><span className="table-sub">{mapped.length ? 'Illustrative analyst mapping' : 'Thematic review required'}</span></TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell>{Object.keys(a.effects).map(id => data.risks.find(r => r.id === id)?.source).filter((s, i, arr) => arr.indexOf(s) === i).join(' · ')}</TableCell>
                        <TableCell><span className="badge amber">Evidence review needed</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Panel>
            <div className="notice"><Info size={17} />Control selection is a plan, not proof of implementation. Verify scope, licensed ISO requirements, sector applicability, and supporting evidence before regulatory use.</div>
          </>}

          {/* ── Data sources ──────────────────────────────────────────── */}
          {page === 'Data sources' && <>
            <div className="notice"><Info size={18} />No external systems are connected. Import normalised telemetry below; the dashboard checks for saved updates every 60 seconds.</div>
            <div className="source-grid">
              {['Vulnerability management', 'SIEM', 'IAM', 'EDR', 'CSPM', 'Asset inventory', 'Threat intelligence'].map((s, i) => {
                const rs = data.risks.filter(r => r.source === s);
                return (
                  <div className="source-card" key={s}>
                    <span className="source-icon" style={{ color: colors[i % 6] }}><Plug size={22} /></span>
                    <h3>{s}</h3>
                    <span className="badge neutral">{data.demo ? 'Sample signals' : 'Imported signals'}</span>
                    <p>{rs.length} normalised risk signals</p>
                    <small>{rs.length ? 'Last observation ' + new Date(Math.max(...rs.map(r => Date.parse(r.observedAt)))).toLocaleDateString() : 'No evidence received'}</small>
                  </div>
                );
              })}
            </div>
            <div className="bottom-grid">
              <Panel title="Import an assessment" sub="JSON with business assets, normalised risk telemetry, and control costs">
                <div className="import-actions">
                  <button className="button secondary" id="btn-download-sample" onClick={() => dlFile('risklens-sample-assessment.json', JSON.stringify(demo, null, 2))}>
                    <Download size={16} /> Download sample schema
                  </button>
                  <label className="button teal upload-label">
                    <Upload size={16} /> Choose JSON file
                    <input type="file" accept=".json,application/json" onChange={async e => {
                      const f = e.target.files?.[0];
                      if (f) { if (f.size > 500000) { toast.error('File must be under 500 KB'); return; } setJsonInput(await f.text()); }
                      e.target.value = '';
                    }} />
                  </label>
                </div>
                <textarea className="json-input" aria-label="Assessment JSON" value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder="Paste or load a normalised assessment JSON…" />
                <button className="button teal" id="btn-import" disabled={saving || !jsonInput.trim()} onClick={() => importData(jsonInput)}>
                  {saving ? 'Validating and saving…' : 'Validate & import assessment'}
                </button>
                <p className="help">Imports replace the active assessment; prior snapshots remain in history. Set demo to false for your own data. Up to 100 assets, 100 scenarios, and 12 controls.</p>
              </Panel>

              <Panel title="Ingestion contract" sub="Cloud-ready normalised data interface">
                <div className="contract">
                  <code>POST /api/assessment</code>
                  <p>Send an object containing <code>dataset</code> in the same format as the sample. Interactive access uses this private workspace session.</p>
                  <h3>Required business context</h3>
                  <p>Service, owner, unit, criticality, dependencies, and INR loss estimates.</p>
                  <h3>Required security context</h3>
                  <p>Incident frequency, CVSS, threat multiplier, measured control effectiveness, source, and observation time.</p>
                  <h3>Production connectors (planned)</h3>
                  <p>Live SIEM/IAM/EDR/CSPM connectors, trained likelihood model, external LLM, and complete regulatory catalogs are planned. Vendor adapters and machine credentials must be configured before automated ingestion.</p>
                </div>
                {/* Reset demo — isolated from saved assessments */}
                {resetConfirm ? (
                  <div className="reset-confirm">
                    <p>This resets the active dataset to the synthetic sample. <strong>Saved assessments and investment plans are not deleted.</strong></p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button className="button teal" id="btn-confirm-reset" disabled={saving} onClick={async () => {
                        setUnit('All business units');
                        setSelected(['patch', 'mfa']);
                        await save('snapshot', demo);
                        setResetConfirm(false);
                        setBannerDismissed(false);
                        toast.success('Demo data reset successfully');
                      }}>Confirm reset</button>
                      <button className="button secondary" onClick={() => setResetConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="button secondary" id="btn-reset-demo" style={{ margin: '0 24px 15px' }} onClick={() => setResetConfirm(true)}>
                    Reset to demo data
                  </button>
                )}
              </Panel>
            </div>
          </>}

          {/* ── Risk assistant ────────────────────────────────────────── */}
          {page === 'Risk assistant' && (
            <div className="assistant-layout">
              <Panel title="Risk intelligence assistant" sub="Local Naive Bayes intent model · grounded calculations · no external AI">
                <div className="assistant-intro">
                  <span><Sparkles size={28} /></span>
                  <h2>Make sense of your exposure.</h2>
                  <p>Answers use the current assessment and your {money(budget)} investment budget. A local intent classifier selects the calculation; responses use verified model outputs — no external AI or generated content.</p>
                </div>
                <div className="suggestions">
                  {[
                    'Why is this my largest financial risk?',
                    'Which answers contributed to this estimate?',
                    'What information is missing?',
                    'Which actions fit my budget?',
                    'How would better backups affect my exposure?',
                    'What is the impact of a 30-day delay?',
                  ].map(q => (
                    <button key={q} id={`suggestion-${q.slice(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase()}`} onClick={() => ask(q)} disabled={thinking}>
                      {q}<ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
                <div className="messages" aria-live="polite" aria-label="Conversation">
                  {messages.length === 0 && !thinking && (
                    <div className="assistant-empty">
                      <p>Click a suggested question above to get started.</p>
                      <p className="assistant-scope">Supported: highest risk · MFA benefit · 30-day delay cost · optimal investment portfolio</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={'message ' + m.role}>
                      <strong>{m.role === 'user' ? 'You' : 'RiskLens'}</strong>
                      <p>{m.text}</p>
                      {!!m.refs?.length && <small>Model references: {m.refs.join(' · ')}</small>}
                    </div>
                  ))}
                  {thinking && <p className="thinking">Analysing the assessment…</p>}
                </div>
                <form className="chat-form" onSubmit={e => { e.preventDefault(); ask(); }}>
                  <input id="assistant-input" aria-label="Ask about financial cyber risk" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about your financial cyber risk…" maxLength={2000} />
                  <button className="button teal" id="btn-send-question" disabled={thinking || !question.trim()} aria-label="Send question"><Send size={18} /></button>
                </form>
              </Panel>

              <Panel title="What informs each answer" sub="Transparent by design">
                <div className="assistant-context">
                  <Database />
                  <h3>{risks.length} risk scenarios</h3>
                  <p>Evidence, business criticality, incident frequency, and financial severity.</p>
                  <Target />
                  <h3>{data.actions.length} control options</h3>
                  <p>Defined costs and effectiveness estimates, evaluated under your budget.</p>
                  <Info />
                  <h3>Assumptions stay visible</h3>
                  <p>Estimates are decision support. Recommendations require review before implementation.</p>
                  <div className="assistant-scope-box">
                    <h3>Supported questions</h3>
                    <ul>
                      <li>Why is this my largest financial risk & top loss driver</li>
                      <li>Which answers and posture findings contributed to the estimate</li>
                      <li>What assumptions are provisional or missing</li>
                      <li>Which actions fit my available budget</li>
                      <li>How better backups and immutable recovery reduce exposure</li>
                      <li>Additional exposure from a 30-day remediation delay</li>
                    </ul>
                    <small>Questions outside these topics receive a graceful fallback with guidance. No external AI is connected — answers are deterministic calculations grounded in your assessment.</small>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* ── Methodology ───────────────────────────────────────────── */}
          {page === 'Methodology' && (
            <div className="method-layout">
              <Panel title="RiskLens financial model · v1.0" sub="Reproducible statistical estimates with visible assumptions">
                <div className="method">
                  <h3>1. Estimate annual incident frequency</h3>
                  <code>λ = base_frequency × (0.5 + CVSS/10) × threat_multiplier × (1 − control_effectiveness) × (criticality/3)</code>
                  <p>This is an analyst-calibrated heuristic, not a trained incident predictor. CVSS is a severity input, not an exploitation probability. Threat multipliers and effectiveness must be validated against your environment.</p>

                  <h3>2. Calculate financial exposure</h3>
                  <code>EAL = λ × (downtime + breach + penalty + reputation costs)</code>
                  <p>Loss inputs are non-overlapping mean INR amounts per incident. Penalties are scenario assumptions, not legal liability predictions. Annual incident probability is 1 − exp(−λ) — this differs from λ when λ {'>'} 1. Criticality changes frequency weighting; service dependencies are displayed for review, not cascaded automatically.</p>

                  <h3>3. Model the loss distribution</h3>
                  <p>5,000 seeded Monte Carlo trials. Incident counts follow a Poisson distribution; incident losses follow a mean-corrected lognormal distribution with scenario-specific uncertainty. Annual VaR95 is the 95th percentile of total annual loss — not a confidence interval for EAL. Events are assumed independent; correlated attacks can produce larger tails.</p>

                  <h3>4. Compare controls without double counting</h3>
                  <code>Residual = baseline × Π(1 − each control reduction)</code>
                  <p>Control interactions beyond this multiplicative assumption are not modelled. A delay preserves baseline exposure for that fraction of the first year. Delivery durations are estimates; the delay slider is the explicit timing assumption — it does not model threat growth during the delay.</p>

                  <h3>5. Optimise a bounded investment portfolio</h3>
                  <p>Exhaustive enumeration finds the maximum EAL reduction among all defined control subsets within the budget. Up to 12 interventions (4,096 portfolios). Costs represent first-year totals; recurring costs must be included in these inputs. ROSI = (annual loss reduction − first-year cost) / first-year cost.</p>

                  <h3>6. Monitor and forecast</h3>
                  <p>Saved assessments are polled every 60 seconds. A least-squares trend estimate is available after at least three snapshots spanning one day; it extrapolates 30 days and is not a validated threat forecast.</p>
                  <div className="notice">
                    {projected
                      ? `Enterprise trend projection: ${money(projected.value)} EAL in 30 days, based on saved snapshots. Review dataset comparability before use.`
                      : 'Not enough comparable history for a 30-day trend projection. Save multiple assessments over time to enable this feature.'}
                  </div>

                  <h3>7. Local AI language understanding</h3>
                  <p>A multinomial Naive Bayes model classifies questions into financial risk, MFA, delay, or investment intents. It trains on bundled example questions and uses Laplace smoothing. Answers come from deterministic financial calculations, not generated claims. Unsupported or ambiguous questions receive a graceful fallback with guidance. No external language model is connected.</p>

                  <h3>Model-defined risk index</h3>
                  <code>Index = 100 × (1 − exp(−EAL / ₹10 Cr))</code>
                  <p>This optional display index is not an industry standard or compliance rating. Monetary values are the primary decision metrics.</p>
                </div>
              </Panel>

              <Panel title="Before production use" sub="Implementation boundaries">
                <div className="method">
                  <p>The workspace includes durable assessments, validated imports, financial modelling, scenario planning, portfolio optimisation, report exports, and local AI intent classification with grounded responses.</p>
                  <p>The following are <strong>not yet configured</strong> and are required before enterprise operational use:</p>
                  <div className="planned-label">
                    <h3>Planned features</h3>
                    <ul style={{ paddingLeft: 18, color: '#7c919e', fontSize: 14, lineHeight: 2, margin: '8px 0' }}>
                      <li>Live SIEM / IAM / EDR / CSPM connectors</li>
                      <li>Trained incident likelihood model with backtesting</li>
                      <li>External LLM integration (no account needed locally)</li>
                      <li>Complete regulatory compliance catalogs</li>
                      <li>Organisation-specific RBAC and service credentials</li>
                      <li>Correlated loss modelling</li>
                    </ul>
                  </div>
                  <p>Connect and validate enterprise sources, calibrate against incident history, assess correlated loss scenarios, confirm applicable regulations, and obtain stakeholder approval of financial estimates before use in decisions.</p>
                </div>
              </Panel>
            </div>
          )}

          {/* Footer */}
          <footer className="page-footer">
            <span><Shield size={13} /> RiskLens · Decision intelligence · SIH 2024 PS 26105</span>
            <span>{data.demo ? 'Synthetic demonstration data — modelled estimates' : 'Imported assessment — unverified estimates'} · All amounts in INR</span>
          </footer>
        </div>
      </main>

      {/* ── Risk detail side sheet ─────────────────────────────────────── */}
      <Sheet open={!!detail} onOpenChange={o => { if (!o) setDetail(null); }}>
        <SheetContent className="risk-sheet">
          <SheetHeader>
            <SheetTitle>{currentRisk?.name}</SheetTitle>
            <SheetDescription>{currentRisk?.asset.name} · {currentRisk?.id}</SheetDescription>
          </SheetHeader>
          {currentRisk && (
            <div className="detail-content">
              <span className="badge amber">{currentRisk.category}</span>
              <div className="detail-number">{money(currentRisk.eal)}<small>Expected annual loss</small></div>

              <h3>Observed evidence</h3>
              <p>{currentRisk.finding}</p>
              <small>{currentRisk.source} · {new Date(currentRisk.observedAt).toLocaleString()}</small>

              <h3>Likelihood assumptions <InfoTip text={TIPS.likelihood} /></h3>
              {[
                ['Base events / year', currentRisk.frequency],
                ['CVSS severity', currentRisk.cvss],
                ['Threat multiplier', currentRisk.threat],
                ['Control effectiveness', (currentRisk.control * 100).toFixed(0) + '%'],
                ['Modelled annual rate (λ)', currentRisk.lambda.toFixed(3)],
                ['Annual incident likelihood', (currentRisk.likelihood * 100).toFixed(1) + '%'],
              ].map(([l, v]) => (
                <div className="quality-row" key={String(l)}><span>{l}</span><strong>{v}</strong></div>
              ))}

              <h3>Mean loss per incident</h3>
              {[
                ['Downtime', currentRisk.downtime],
                ['Data breach', currentRisk.breach],
                ['Regulatory scenario', currentRisk.penalty],
                ['Reputational impact', currentRisk.reputation],
              ].map(([l, v]) => (
                <div className="quality-row" key={String(l)}><span>{l}</span><strong>{money(Number(v))}</strong></div>
              ))}

              <h3>Recommended treatments</h3>
              {data.actions.filter(a => a.effects[currentRisk.id]).map(a => (
                <button className="treatment" key={a.id} onClick={() => { setSelected([a.id]); setPage('Scenario lab'); setDetail(null); }}>
                  <span>{a.name}<small>{(a.effects[currentRisk.id] * 100).toFixed(0)}% assumed scenario reduction</small></span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
              <p className="help">Financial estimates and control assumptions require owner validation before use in implementation decisions.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
