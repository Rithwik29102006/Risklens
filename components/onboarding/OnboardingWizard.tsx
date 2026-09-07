'use client';
import React, { useState, useEffect } from 'react';
import {
  Shield, Building2, Server, Lock, AlertTriangle, IndianRupee,
  SlidersHorizontal, CheckCircle2, ChevronRight, ChevronLeft,
  Save, RotateCcw, Plus, Trash2, HelpCircle, Eye, ArrowRight,
  Info, Sparkles, Check, FileCheck, Layers, Clock, AlertCircle
} from 'lucide-react';
import {
  OnboardingState, DEFAULT_ONBOARDING_STATE, BusinessService,
  PostureAnswer, generateCandidateScenarios, generateCandidateActions,
  auditOnboardingReadiness, CandidateRiskScenario, CandidateActionTreatment
} from '@/lib/onboarding';
import { mapOnboardingToDataset } from '@/lib/mapping';
import { Dataset, money } from '@/lib/risk';
import { toast } from 'sonner';

interface OnboardingWizardProps {
  initialDraft?: OnboardingState | null;
  onComplete: (dataset: Dataset, fullState: OnboardingState, meta: any) => void;
  onExploreDemo: () => void;
}

const STEPS = [
  { num: 1, id: 'business', label: 'Business Setup', icon: Building2 },
  { num: 2, id: 'services', label: 'Services & Assets', icon: Server },
  { num: 3, id: 'data', label: 'Data & Consequences', icon: FileCheck },
  { num: 4, id: 'posture', label: 'Security Posture', icon: Lock },
  { num: 5, id: 'financial', label: 'Financial Impact', icon: IndianRupee },
  { num: 6, id: 'scenarios', label: 'Risk Scenarios', icon: AlertTriangle },
  { num: 7, id: 'treatments', label: 'Budget & Treatments', icon: SlidersHorizontal },
  { num: 8, id: 'review', label: 'Review & Calculate', icon: Sparkles },
];

export function OnboardingWizard({ initialDraft, onComplete, onExploreDemo }: OnboardingWizardProps) {
  const [state, setState] = useState<OnboardingState>(() => initialDraft || DEFAULT_ONBOARDING_STATE);
  const [currentStep, setCurrentStep] = useState(initialDraft?.step || 1);
  const [savingDraft, setSavingDraft] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);

  // New service form state
  const [newSrv, setNewSrv] = useState<Partial<BusinessService>>({
    name: '',
    purpose: '',
    owner: 'Platform Team',
    unit: 'Digital Operations',
    supportingInfrastructure: 'Cloud Hosted (AWS / Azure)',
    internetFacing: true,
    criticality: 4,
    maxTolerableDowntimeHours: 4,
    hasManualWorkaround: 'no',
    dependencies: [],
  });

  // Whenever user reaches Step 6 or 7, generate candidates if not already populated
  useEffect(() => {
    if (currentStep === 6 && state.scenarios.length === 0) {
      const candidateScens = generateCandidateScenarios(
        state.services,
        state.posture,
        state.financialImpacts,
        state.consequences
      );
      setState(prev => ({ ...prev, scenarios: candidateScens }));
    }
  }, [currentStep, state.services, state.posture, state.financialImpacts, state.consequences, state.scenarios.length]);

  useEffect(() => {
    if (currentStep === 7 && state.actions.length === 0) {
      const candidateActs = generateCandidateActions(
        state.scenarios.length > 0 ? state.scenarios : generateCandidateScenarios(
          state.services,
          state.posture,
          state.financialImpacts,
          state.consequences
        ),
        state.profile.annualSecurityBudget || 10000000
      );
      setState(prev => ({ ...prev, actions: candidateActs }));
    }
  }, [currentStep, state.scenarios, state.services, state.posture, state.financialImpacts, state.consequences, state.profile.annualSecurityBudget, state.actions.length]);

  // Save draft to API
  async function saveDraft(showToast = true) {
    setSavingDraft(true);
    try {
      const res = await fetch('/api/onboarding/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: state.profile.orgName || 'Draft Setup',
          step: currentStep,
          state: { ...state, step: currentStep, updatedAt: new Date().toISOString() },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      if (showToast) toast.success('Onboarding progress saved successfully');
    } catch {
      if (showToast) toast.error('Could not save draft. Changes are preserved in this browser session.');
    } finally {
      setSavingDraft(false);
    }
  }

  // Navigation handlers
  function goNext() {
    if (currentStep === 1 && !state.profile.orgName.trim()) {
      toast.error('Please enter your organization name');
      return;
    }
    if (currentStep === 2 && state.services.length === 0) {
      toast.error('Please add at least one business service');
      return;
    }
    const next = Math.min(STEPS.length, currentStep + 1);
    setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goPrev() {
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Service management
  function handleAddService() {
    if (!newSrv.name?.trim()) {
      toast.error('Service name is required');
      return;
    }
    const id = `srv_${Date.now()}`;
    const srv: BusinessService = {
      id,
      name: newSrv.name.trim(),
      purpose: newSrv.purpose?.trim() || 'Core business process',
      owner: newSrv.owner?.trim() || 'Platform Team',
      unit: newSrv.unit?.trim() || 'Operations',
      supportingInfrastructure: newSrv.supportingInfrastructure?.trim() || 'Cloud / On-premise',
      internetFacing: !!newSrv.internetFacing,
      criticality: Number(newSrv.criticality) || 3,
      maxTolerableDowntimeHours: newSrv.maxTolerableDowntimeHours === 'unknown' ? 'unknown' : (Number(newSrv.maxTolerableDowntimeHours) || 8),
      hasManualWorkaround: (newSrv.hasManualWorkaround as any) || 'no',
      dependencies: newSrv.dependencies || [],
    };

    setState(prev => ({
      ...prev,
      services: [...prev.services, srv],
      consequences: {
        ...prev.consequences,
        [id]: {
          serviceId: id,
          dataType: 'customer_pii',
          recordCount: 50000,
          affectedStakeholders: ['customers'],
          hasContractualSla: false,
          incidentNotificationRequirement: false,
          applicableFrameworks: ['DPDP Act 2023', 'ISO/IEC 27001'],
        },
      },
      financialImpacts: {
        ...prev.financialImpacts,
        [id]: {
          serviceId: id,
          downtimeHours: typeof srv.maxTolerableDowntimeHours === 'number' ? srv.maxTolerableDowntimeHours : 8,
          downtimeCostPerHour: 150000,
          downtimeCostMethod: 'manual',
          breachCostLow: 1000000,
          breachCostLikely: 3000000,
          breachCostHigh: 8000000,
          regulatoryLiabilityCost: 1000000,
          reputationCustomerLossCost: 1500000,
        },
      },
    }));

    setNewSrv({
      name: '',
      purpose: '',
      owner: 'Platform Team',
      unit: 'Digital Operations',
      supportingInfrastructure: 'Cloud Hosted (AWS / Azure)',
      internetFacing: true,
      criticality: 4,
      maxTolerableDowntimeHours: 4,
      hasManualWorkaround: 'no',
      dependencies: [],
    });
    setShowAddServiceModal(false);
    toast.success(`Service "${srv.name}" added`);
  }

  function handleRemoveService(id: string) {
    if (state.services.length <= 1) {
      toast.error('You must have at least one service');
      return;
    }
    setState(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id),
    }));
    toast.info('Service removed');
  }

  // Calculate & Generate Final Assessment
  async function handleGenerateAssessment() {
    setCalculating(true);
    try {
      // 1. Ensure scenarios and actions are generated if empty
      let currentScenarios = state.scenarios;
      if (currentScenarios.length === 0) {
        currentScenarios = generateCandidateScenarios(
          state.services,
          state.posture,
          state.financialImpacts,
          state.consequences
        );
      }

      let currentActions = state.actions;
      if (currentActions.length === 0) {
        currentActions = generateCandidateActions(
          currentScenarios,
          state.profile.annualSecurityBudget || 10000000
        );
      }

      const fullUpdatedState: OnboardingState = {
        ...state,
        scenarios: currentScenarios,
        actions: currentActions,
        assumptionsConfirmed: true,
        updatedAt: new Date().toISOString(),
      };

      // 2. Perform traceable mapping to Dataset
      const transformation = mapOnboardingToDataset(fullUpdatedState);

      // 3. Save personalized assessment to backend
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'personalized',
          dataset: transformation.dataset,
          profile: fullUpdatedState.profile,
          metadata: transformation.modelMetadata,
          traceableExplanations: transformation.traceableExplanations,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as any;
        throw new Error(errJson.error || 'Server rejected assessment');
      }

      toast.success(`Personalized risk assessment generated for ${fullUpdatedState.profile.orgName}!`);
      onComplete(transformation.dataset, fullUpdatedState, transformation.modelMetadata);
    } catch (e: any) {
      toast.error(`Calculation failed: ${e.message || 'Please check assumptions and retry'}`);
    } finally {
      setCalculating(false);
    }
  }

  const readiness = auditOnboardingReadiness(state);

  return (
    <div className="onboarding-container max-w-5xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <Shield size={16} />
            <span>RiskLens Guided Business Onboarding</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mt-1">
            {state.profile.orgName ? state.profile.orgName : 'Tell Us About Your Business'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Complete these business questions to quantify your financial cyber exposure, understand risk drivers, and optimize security investments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => saveDraft(true)}
            disabled={savingDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors"
          >
            <Save size={14} className={savingDraft ? 'animate-spin' : ''} />
            <span>{savingDraft ? 'Saving...' : 'Save & Exit'}</span>
          </button>

          <button
            type="button"
            onClick={onExploreDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors border border-teal-500/30"
          >
            <Eye size={14} />
            <span>Explore Sample Business</span>
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="my-6 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center min-w-[720px] gap-1.5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.num)}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${
                  isActive
                    ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-semibold shadow-xs'
                    : isCompleted
                    ? 'border-border/70 bg-card/60 text-foreground hover:bg-muted/50'
                    : 'border-transparent text-muted-foreground hover:text-foreground opacity-70'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : isCompleted
                      ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : step.num}
                </div>
                <div className="truncate">
                  <div className="text-xs truncate">{step.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Contents */}
      <div className="bg-card border border-border/80 rounded-xl p-6 md:p-8 shadow-xs">
        {/* STEP 1: ABOUT THE BUSINESS */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Building2 className="text-teal-600 dark:text-teal-400" size={20} />
                Step A — About Your Business
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tell us about your organization. These inputs establish the financial context and business operational boundaries for risk modeling.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Organization Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex FinTech Solutions"
                  value={state.profile.orgName}
                  onChange={e => setState(p => ({ ...p, profile: { ...p.profile, orgName: e.target.value } }))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Industry & Sector
                </label>
                <select
                  value={state.profile.industry}
                  onChange={e => setState(p => ({ ...p, profile: { ...p.profile, industry: e.target.value } }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Banking & Financial Services">Banking & Financial Services (BFSI)</option>
                  <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                  <option value="E-Commerce & Digital Retail">E-Commerce & Digital Retail</option>
                  <option value="SaaS & Cloud Software">SaaS & Cloud Software</option>
                  <option value="Manufacturing & Supply Chain">Manufacturing & Supply Chain</option>
                  <option value="Government & Critical Infrastructure">Government & Critical Infrastructure</option>
                  <option value="Other">Other Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Operating Country / Primary Jurisdiction
                </label>
                <input
                  type="text"
                  value={state.profile.country}
                  onChange={e => setState(p => ({ ...p, profile: { ...p.profile, country: e.target.value } }))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="India (default INR reporting)"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Reporting currency is kept consistent in INR (₹) to avoid exchange rate assumptions.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Employee Workforce Size
                </label>
                <select
                  value={state.profile.employeeCount}
                  onChange={e => setState(p => ({ ...p, profile: { ...p.profile, employeeCount: e.target.value } }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="1-50">1 – 50 employees</option>
                  <option value="51-250">51 – 250 employees</option>
                  <option value="251-1000">251 – 1,000 employees</option>
                  <option value="1000+">Over 1,000 employees</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Approximate Annual Revenue (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">₹</span>
                  <input
                    type="number"
                    min="100000"
                    step="1000000"
                    value={state.profile.annualRevenue}
                    onChange={e => setState(p => ({ ...p, profile: { ...p.profile, annualRevenue: Math.max(0, Number(e.target.value)) } }))}
                    className="w-full pl-8 pr-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Current: <strong>{money(state.profile.annualRevenue)}</strong>. Used for downtime business interruption benchmarks.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Available First-Year Cyber Budget (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    value={state.profile.annualSecurityBudget}
                    onChange={e => setState(p => ({ ...p, profile: { ...p.profile, annualSecurityBudget: Math.max(0, Number(e.target.value)) } }))}
                    className="w-full pl-8 pr-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Current: <strong>{money(state.profile.annualSecurityBudget)}</strong>. Powers the Investment Optimizer portfolio search.
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Critical Operating Hours
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['24/7 Continuous Operations', 'Online platforms, payment APIs, hospital care'],
                    ['Extended (16x7 Operations)', 'Customer support, distributed field operations'],
                    ['Standard Business Hours (8x5)', 'Corporate back-office, B2B wholesale'],
                  ].map(([val, desc]) => (
                    <label
                      key={val}
                      className={`p-3 rounded-lg border cursor-pointer text-left transition-colors ${
                        state.profile.criticalOperatingHours === val
                          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="opHours"
                        checked={state.profile.criticalOperatingHours === val}
                        onChange={() => setState(p => ({ ...p, profile: { ...p.profile, criticalOperatingHours: val } }))}
                        className="sr-only"
                      />
                      <div className="text-xs font-semibold text-foreground">{val}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                  Primary Cyber Risk Concerns
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    ['downtime', 'Service & Revenue Interruption'],
                    ['stolen_data', 'Customer Data Breach / Theft'],
                    ['account_takeover', 'Privileged Account Hijacking'],
                    ['ransomware', 'Ransomware & Recovery Lockout'],
                    ['third_party_access', 'Supply Chain / Vendor Compromise'],
                    ['regulatory_penalties', 'Statutory Fines & Legal Sanctions'],
                  ].map(([key, label]) => {
                    const isChecked = state.profile.mainConcerns.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setState(p => ({
                            ...p,
                            profile: {
                              ...p.profile,
                              mainConcerns: isChecked
                                ? p.profile.mainConcerns.filter(c => c !== key)
                                : [...p.profile.mainConcerns, key],
                            },
                          }));
                        }}
                        className={`px-3 py-2 rounded-md border text-left flex items-center justify-between ${
                          isChecked
                            ? 'border-teal-500/80 bg-teal-500/10 text-teal-800 dark:text-teal-200 font-medium'
                            : 'border-border text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span>{label}</span>
                        {isChecked && <Check size={14} className="text-teal-600 dark:text-teal-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: IMPORTANT SERVICES & ASSETS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Server className="text-teal-600 dark:text-teal-400" size={20} />
                  Step B — Important Services & Assets
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Add the core digital services your business relies on. We generate clean internal IDs automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddServiceModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>Add Business Service</span>
              </button>
            </div>

            {/* List of Services */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              {state.services.map((srv, idx) => (
                <div key={srv.id} className="p-4 rounded-lg border border-border/80 bg-card hover:border-border transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-foreground">
                          Service #{idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-foreground">{srv.name}</h3>
                        {srv.internetFacing ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            Internet-Facing
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Internal Network
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300">
                          Criticality: Tier {srv.criticality}/5
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">{srv.purpose}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveService(srv.id)}
                      className="text-muted-foreground hover:text-red-500 p-1.5 rounded transition-colors"
                      title="Remove service"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Owner / Team:</span>
                      <strong className="text-foreground">{srv.owner}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Business Unit:</span>
                      <strong className="text-foreground">{srv.unit}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Max Tolerable Downtime:</span>
                      <strong className="text-foreground">{srv.maxTolerableDowntimeHours} hours</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Manual Workaround:</span>
                      <strong className="text-foreground capitalize">{srv.hasManualWorkaround}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal for adding service */}
            {showAddServiceModal && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">Add Critical Business Service</h3>
                    <button onClick={() => setShowAddServiceModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-muted-foreground mb-1 font-semibold uppercase">Service Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Mobile Banking App & Payment Gateway"
                        value={newSrv.name}
                        onChange={e => setNewSrv(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-muted-foreground mb-1 font-semibold uppercase">Primary Purpose</label>
                      <input
                        type="text"
                        placeholder="e.g. Handles UPI and card payment checkout"
                        value={newSrv.purpose}
                        onChange={e => setNewSrv(p => ({ ...p, purpose: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-muted-foreground mb-1 font-semibold uppercase">Responsible Team</label>
                        <input
                          type="text"
                          value={newSrv.owner}
                          onChange={e => setNewSrv(p => ({ ...p, owner: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-muted-foreground mb-1 font-semibold uppercase">Business Unit</label>
                        <input
                          type="text"
                          value={newSrv.unit}
                          onChange={e => setNewSrv(p => ({ ...p, unit: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-muted-foreground mb-1 font-semibold uppercase">Criticality Tier (1-5)</label>
                        <select
                          value={newSrv.criticality}
                          onChange={e => setNewSrv(p => ({ ...p, criticality: Number(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background"
                        >
                          <option value={5}>5 - Mission Critical (Halts Business)</option>
                          <option value={4}>4 - High Operational Impact</option>
                          <option value={3}>3 - Important Departmental Service</option>
                          <option value={2}>2 - Moderate Impact</option>
                          <option value={1}>1 - Low / Auxiliary</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-muted-foreground mb-1 font-semibold uppercase">Internet Accessible?</label>
                        <select
                          value={newSrv.internetFacing ? 'yes' : 'no'}
                          onChange={e => setNewSrv(p => ({ ...p, internetFacing: e.target.value === 'yes' }))}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background"
                        >
                          <option value="yes">Yes (Public Internet)</option>
                          <option value="no">No (Internal Corporate Only)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowAddServiceModal(false)}
                      className="px-3 py-1.5 text-xs rounded-md border border-border text-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="px-4 py-1.5 text-xs font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700"
                    >
                      Add Service
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: DATA & CONSEQUENCES */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <FileCheck className="text-teal-600 dark:text-teal-400" size={20} />
                Step C — Data Governance & Business Consequences
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                For each service, specify the type of data handled, contractual service obligations, and statutory reporting requirements.
              </p>
            </div>

            <div className="space-y-6 pt-2">
              {state.services.map((srv) => {
                const cons = state.consequences[srv.id] || {
                  serviceId: srv.id,
                  dataType: 'customer_pii',
                  recordCount: 50000,
                  affectedStakeholders: ['customers'],
                  hasContractualSla: false,
                  incidentNotificationRequirement: false,
                  applicableFrameworks: ['DPDP Act 2023'],
                };

                return (
                  <div key={srv.id} className="p-5 rounded-lg border border-border/80 bg-card space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div>
                        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase">Service</span>
                        <h3 className="text-base font-bold text-foreground">{srv.name}</h3>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded bg-muted font-medium text-foreground">
                        {srv.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Information Handled
                        </label>
                        <select
                          value={cons.dataType}
                          onChange={e => {
                            const dt = e.target.value as any;
                            setState(p => ({
                              ...p,
                              consequences: {
                                ...p.consequences,
                                [srv.id]: { ...cons, dataType: dt },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background"
                        >
                          <option value="financial_payment">Financial & Payment Card Data</option>
                          <option value="customer_pii">Customer PII (Name, Aadhaar, Phone, Email)</option>
                          <option value="health_records">Health & Medical Records</option>
                          <option value="confidential_ip">Proprietary IP & Business Secrets</option>
                          <option value="operational_only">Operational Telemetry Only</option>
                          <option value="none">No Sensitive Data</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Plausible Affected Records
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={cons.recordCount === 'unknown' ? 0 : cons.recordCount}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setState(p => ({
                              ...p,
                              consequences: {
                                ...p.consequences,
                                [srv.id]: { ...cons, recordCount: val },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Estimated records in single major breach.</span>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Obligations & Reporting
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cons.hasContractualSla}
                            onChange={e => {
                              setState(p => ({
                                ...p,
                                consequences: {
                                  ...p.consequences,
                                  [srv.id]: { ...cons, hasContractualSla: e.target.checked },
                                },
                              }));
                            }}
                            className="rounded border-input text-teal-600 focus:ring-teal-500"
                          />
                          <span>Binding contractual SLA with customer penalties</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cons.incidentNotificationRequirement}
                            onChange={e => {
                              setState(p => ({
                                ...p,
                                consequences: {
                                  ...p.consequences,
                                  [srv.id]: { ...cons, incidentNotificationRequirement: e.target.checked },
                                },
                              }));
                            }}
                            className="rounded border-input text-teal-600 focus:ring-teal-500"
                          />
                          <span>Mandatory statutory reporting (e.g. CERT-In 6-hour rule)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: CURRENT SECURITY POSTURE */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Lock className="text-teal-600 dark:text-teal-400" size={20} />
                Step D — Current Security Posture
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Answer these plain-English questions. If you are unsure about any area, select &ldquo;Unknown&rdquo; to apply a transparent provisional assumption.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                {
                  key: 'mfaPrivileged',
                  title: 'MFA for Admins & Privileged Accounts',
                  desc: 'Are phishing-resistant hardware tokens or authenticator MFA enforced on all cloud consoles, servers, and database logins?',
                },
                {
                  key: 'mfaWorkforce',
                  title: 'MFA for General Employees',
                  desc: 'Is MFA enforced for all standard workforce corporate email and single-sign-on access?',
                },
                {
                  key: 'patchManagement',
                  title: 'Patch SLA for Internet-Facing Systems',
                  desc: 'Are critical vulnerabilities on public-facing APIs and servers patched within a verified 7-day SLA?',
                },
                {
                  key: 'endpointProtection',
                  title: 'Endpoint Detection & Response (EDR)',
                  desc: 'Is modern EDR software active with automated isolation on all endpoints and servers?',
                },
                {
                  key: 'loggingMonitoring',
                  title: 'Centralized Security Logging & SIEM',
                  desc: 'Are authentication and server audit logs aggregated centrally with active threat detection alerts?',
                },
                {
                  key: 'networkSegmentation',
                  title: 'Network Segmentation (East-West)',
                  desc: 'Are database tiers and payment subnets strictly separated from user workstations and partner VPNs?',
                },
                {
                  key: 'cloudConfiguration',
                  title: 'Cloud Storage & Access Hardening',
                  desc: 'Are cloud object storage buckets and API credentials audited for least-privilege access?',
                },
                {
                  key: 'backupRestoration',
                  title: 'Isolated Backups & Recovery Testing',
                  desc: 'Are backups immutable / air-gapped and has restoration been successfully tested in the last 90 days?',
                },
                {
                  key: 'incidentResponse',
                  title: 'Incident Response Retainer & Plan',
                  desc: 'Do you have a documented incident response playbook and designated emergency responders?',
                },
                {
                  key: 'thirdPartyAccess',
                  title: 'Third-Party / Vendor Access Controls',
                  desc: 'Is contractor and external vendor access restricted with session auditing and just-in-time approval?',
                },
              ].map(({ key, title, desc }) => {
                const currentVal: PostureAnswer = (state.posture as any)[key] || 'unknown';
                return (
                  <div key={key} className="p-4 rounded-lg border border-border/80 bg-card flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2 border-t border-border/60">
                      {[
                        ['yes', 'Yes', 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30'],
                        ['partial', 'Partially', 'text-amber-700 bg-amber-500/10 border-amber-500/30'],
                        ['no', 'No', 'text-rose-700 bg-rose-500/10 border-rose-500/30'],
                        ['unknown', 'Unknown', 'text-muted-foreground bg-muted border-border'],
                      ].map(([optKey, optLabel, activeStyle]) => {
                        const isSelected = currentVal === optKey;
                        return (
                          <button
                            key={optKey}
                            type="button"
                            onClick={() => {
                              setState(p => ({
                                ...p,
                                posture: { ...p.posture, [key]: optKey as PostureAnswer },
                              }));
                            }}
                            className={`px-2 py-1.5 text-[11px] font-medium rounded-md border text-center transition-all ${
                              isSelected
                                ? `${activeStyle} font-semibold ring-1 ring-current`
                                : 'border-border text-muted-foreground hover:bg-muted/60'
                            }`}
                          >
                            {optLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Assessor Notes */}
            <div className="p-4 rounded-lg border border-border/60 bg-muted/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-semibold uppercase mb-1">Assessor Name</label>
                <input
                  type="text"
                  value={state.posture.assessorName || ''}
                  onChange={e => setState(p => ({ ...p, posture: { ...p.posture, assessorName: e.target.value } }))}
                  placeholder="e.g. Rithwik (Security Lead)"
                  className="w-full px-3 py-1.5 rounded-md border border-input bg-background"
                />
              </div>
              <div>
                <label className="block text-muted-foreground font-semibold uppercase mb-1">Observation Date</label>
                <input
                  type="date"
                  value={state.posture.observationDate || ''}
                  onChange={e => setState(p => ({ ...p, posture: { ...p.posture, observationDate: e.target.value } }))}
                  className="w-full px-3 py-1.5 rounded-md border border-input bg-background"
                />
              </div>
              <div>
                <label className="block text-muted-foreground font-semibold uppercase mb-1">Evidence Notes</label>
                <input
                  type="text"
                  value={state.posture.evidenceNotes || ''}
                  onChange={e => setState(p => ({ ...p, posture: { ...p.posture, evidenceNotes: e.target.value } }))}
                  placeholder="Self-reported questionnaire baseline"
                  className="w-full px-3 py-1.5 rounded-md border border-input bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: FINANCIAL IMPACT */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <IndianRupee className="text-teal-600 dark:text-teal-400" size={20} />
                Step E — Financial Impact Estimates
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Calibrate the financial consequences of an incident per service. We strictly separate business interruption from data breach costs to avoid double-counting.
              </p>
            </div>

            <div className="space-y-6 pt-2">
              {state.services.map((srv) => {
                const fin = state.financialImpacts[srv.id] || {
                  serviceId: srv.id,
                  downtimeHours: 8,
                  downtimeCostPerHour: 200000,
                  downtimeCostMethod: 'manual',
                  breachCostLow: 1000000,
                  breachCostLikely: 4000000,
                  breachCostHigh: 10000000,
                  regulatoryLiabilityCost: 1500000,
                  reputationCustomerLossCost: 2000000,
                };

                return (
                  <div key={srv.id} className="p-5 rounded-lg border border-border/80 bg-card space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div>
                        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase">Service Financials</span>
                        <h3 className="text-base font-bold text-foreground">{srv.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Mean Cost per Major Outage:</span>
                        <strong className="text-sm text-foreground">
                          {money(fin.downtimeHours * fin.downtimeCostPerHour + fin.breachCostLikely + fin.regulatoryLiabilityCost + fin.reputationCustomerLossCost)}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Severe Incident Downtime (Hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="720"
                          value={fin.downtimeHours}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setState(p => ({
                              ...p,
                              financialImpacts: {
                                ...p.financialImpacts,
                                [srv.id]: { ...fin, downtimeHours: val },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Max tolerable downtime: {srv.maxTolerableDowntimeHours}h</span>
                      </div>

                      <div>
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Downtime Cost per Hour (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={fin.downtimeCostPerHour}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setState(p => ({
                              ...p,
                              financialImpacts: {
                                ...p.financialImpacts,
                                [srv.id]: { ...fin, downtimeCostPerHour: val },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          Current: {money(fin.downtimeCostPerHour)}/hr. Total interruption: {money(fin.downtimeHours * fin.downtimeCostPerHour)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Forensics & Incident Response (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100000"
                          value={fin.breachCostLikely}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setState(p => ({
                              ...p,
                              financialImpacts: {
                                ...p.financialImpacts,
                                [srv.id]: { ...fin, breachCostLikely: val },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Forensic investigation, recovery, notification.</span>
                      </div>

                      <div>
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Contractual / Regulatory Sanctions (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100000"
                          value={fin.regulatoryLiabilityCost}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setState(p => ({
                              ...p,
                              financialImpacts: {
                                ...p.financialImpacts,
                                [srv.id]: { ...fin, regulatoryLiabilityCost: val },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Reviewable estimate (no invented fines).</span>
                      </div>

                      <div>
                        <label className="block text-muted-foreground font-semibold uppercase mb-1">
                          Customer Churn & Reputational Loss (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100000"
                          value={fin.reputationCustomerLossCost}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setState(p => ({
                              ...p,
                              financialImpacts: {
                                ...p.financialImpacts,
                                [srv.id]: { ...fin, reputationCustomerLossCost: val },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Estimated lost enterprise contracts / churn.</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: RISK SCENARIOS & ASSUMPTIONS */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <AlertTriangle className="text-teal-600 dark:text-teal-400" size={20} />
                  Step F — Risk Scenarios & Assumptions
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We generated candidate risk scenarios mapped directly to your services and posture answers. You can confirm, exclude, or customize any scenario.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const refreshed = generateCandidateScenarios(
                    state.services,
                    state.posture,
                    state.financialImpacts,
                    state.consequences
                  );
                  setState(p => ({ ...p, scenarios: refreshed }));
                  toast.success('Scenarios regenerated from updated posture');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted text-foreground"
              >
                <RotateCcw size={13} />
                <span>Regenerate from Posture</span>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              {state.scenarios.map((scen, idx) => {
                const srv = state.services.find(s => s.id === scen.serviceId);
                const totalLoss = scen.downtimeLoss + scen.breachLoss + scen.penaltyLoss + scen.reputationLoss;
                const lambdaEffective = scen.frequencyLambda * (0.5 + scen.cvssEquivalent / 10) * scen.threatMultiplier * (1 - scen.controlEffectiveness);
                const projectedEal = lambdaEffective * totalLoss;

                return (
                  <div
                    key={scen.id}
                    className={`p-5 rounded-lg border transition-all ${
                      scen.included
                        ? 'border-border/80 bg-card'
                        : 'border-dashed border-border/60 bg-muted/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-muted text-foreground">
                            Scenario #{idx + 1}
                          </span>
                          <h3 className="text-sm font-bold text-foreground">{scen.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium">
                            {scen.category}
                          </span>
                          {scen.isProvisional && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30">
                              Provisional Assumption
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-xs bg-muted/40 p-2.5 rounded-md border border-border/50 text-foreground/90">
                          <strong>Trigger Rationale:</strong> {scen.rationale}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setState(p => ({
                              ...p,
                              scenarios: p.scenarios.map(s => (s.id === scen.id ? { ...s, included: !s.included } : s)),
                            }));
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                            scen.included
                              ? 'border-teal-500 bg-teal-500 text-white font-semibold'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {scen.included ? 'Included in Model' : 'Excluded'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Linked Service:</span>
                        <strong className="text-foreground">{srv?.name || 'All services'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Annual Rate (λ):</span>
                        <strong className="text-foreground">{lambdaEffective.toFixed(2)} / year</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Mean Loss / Event:</span>
                        <strong className="text-foreground">{money(totalLoss)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Estimated EAL:</span>
                        <strong className="text-teal-600 dark:text-teal-400 font-bold">{money(projectedEal)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Existing Control:</span>
                        <strong className="text-foreground">{(scen.controlEffectiveness * 100).toFixed(0)}% mitigation</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 7: BUDGET & TREATMENTS */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <SlidersHorizontal className="text-teal-600 dark:text-teal-400" size={20} />
                  Step G — Budget & Treatment Options
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Confirm your cybersecurity budget and review feasible mitigation options matched to your identified risk scenarios.
                </p>
              </div>

              <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg text-xs">
                <span className="text-muted-foreground block">First-Year Available Budget:</span>
                <strong className="text-base text-teal-800 dark:text-teal-200">
                  {money(state.profile.annualSecurityBudget || 10000000)}
                </strong>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {state.actions.map((act, idx) => (
                <div key={act.id} className="p-5 rounded-lg border border-border/80 bg-card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-muted text-foreground">
                          Control #{idx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-foreground">{act.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{act.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground block">First-Year Cost</span>
                      <strong className="text-sm font-bold text-foreground">{money(act.cost)}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Owner:</span>
                      <strong className="text-foreground">{act.owner}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Implementation Time:</span>
                      <strong className="text-foreground">{act.daysToImplement} days</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Frameworks:</span>
                      <span className="text-foreground truncate block">{act.frameworks.slice(0, 2).join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Targeted Scenarios:</span>
                      <strong className="text-foreground">{Object.keys(act.effects).length} scenarios</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 8: REVIEW ASSUMPTIONS & CALCULATE */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="text-teal-600 dark:text-teal-400" size={20} />
                Step H — Review Assumptions & Calculate Assessment
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Verify the audit trail below before generating your personalized financial risk quantification.
              </p>
            </div>

            {/* Audit Readiness Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* User Provided */}
              <div className="p-4 rounded-lg border border-border/80 bg-card space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>User-Provided Inputs ({readiness.userProvided.length})</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
                  {readiness.userProvided.slice(0, 6).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                  {readiness.userProvided.length > 6 && (
                    <li className="text-[11px] italic">+ {readiness.userProvided.length - 6} more validated inputs</li>
                  )}
                </ul>
              </div>

              {/* Derived Values */}
              <div className="p-4 rounded-lg border border-border/80 bg-card space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400">
                  <Layers size={16} />
                  <span>Derived Model Inputs ({readiness.derived.length})</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
                  {readiness.derived.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Provisional Assumptions */}
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={16} />
                  <span>Provisional Assumptions ({readiness.provisional.length})</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
                  {readiness.provisional.length === 0 ? (
                    <li className="text-emerald-600">No provisional assumptions — all answers confirmed!</li>
                  ) : (
                    readiness.provisional.slice(0, 4).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))
                  )}
                </ul>
              </div>

              {/* Missing Information Status */}
              <div className="p-4 rounded-lg border border-border/80 bg-card space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Info size={16} />
                  <span>Completeness Status</span>
                </div>
                {readiness.missingBlocking.length === 0 ? (
                  <div className="p-3 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>All required fields are present. Your organization is ready for calculation.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs">
                    <strong>Blocking inputs needed:</strong>
                    <ul className="list-disc pl-4 mt-1">
                      {readiness.missingBlocking.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Traceable Math Explanation */}
            <div className="p-4 rounded-lg border border-border/70 bg-muted/30 text-xs space-y-2">
              <h4 className="font-bold text-foreground flex items-center gap-2">
                <Shield size={14} className="text-teal-600" />
                Mathematical Traceability & Anti-Double Counting Standards
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Expected Annual Loss (EAL) is computed strictly as <strong>λ (frequency) × Mean Loss per incident</strong>.
                Overlapping controls compound multiplicatively: <em>residual = baseline × Π(1 − reduction)</em>.
                Downtime interruption costs and data breach recovery costs are modeled on distinct axes to guarantee no duplicate counting.
              </p>
            </div>

            {/* Generate Action Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Clicking generate will calculate Monte Carlo loss distributions, rank risks, and persist your assessment snapshot.
              </div>

              <button
                type="button"
                onClick={handleGenerateAssessment}
                disabled={calculating || !readiness.isReadyToCalculate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className={calculating ? 'animate-spin' : ''} />
                <span>{calculating ? 'Quantifying Cyber Risk...' : 'Generate My Risk Assessment'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-8 mt-8 border-t border-border">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          <div className="text-xs text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
