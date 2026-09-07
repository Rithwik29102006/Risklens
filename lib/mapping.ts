import { Asset, Risk, Action, Dataset, money } from './risk';
import { OnboardingState, CandidateRiskScenario, CandidateActionTreatment } from './onboarding';

export interface TraceableScenarioExplanation {
  scenarioId: string;
  scenarioName: string;
  serviceName: string;
  unit: string;
  criticality: number;
  frequencyLambda: number;
  annualLikelihoodPercent: number; // (1 - e^-lambda) * 100
  meanLossPerIncident: number;
  eal: number;
  lossBreakdown: {
    downtime: number;
    breachAndResponse: number;
    statutoryLiability: number;
    reputationAndAttrition: number;
  };
  derivationTrail: {
    questionnaireAnswers: string[];
    controlEffectivenessApplied: number;
    threatMultiplierApplied: number;
    uncertaintySigma: number;
    provisionalStatus: string;
    preventedDoubleCountingNotes: string;
  };
}

export interface TransformationResult {
  dataset: Dataset;
  orgName: string;
  generatedAt: string;
  traceableExplanations: TraceableScenarioExplanation[];
  modelMetadata: {
    modelVersion: string;
    currency: string;
    totalBaseEal: number;
    topRiskDriver: string;
    activeScenarioCount: number;
    activeControlCount: number;
  };
}

/**
 * Transforms validated OnboardingState into a financial calculation Dataset
 * with comprehensive mathematical traceability.
 */
export function mapOnboardingToDataset(state: OnboardingState): TransformationResult {
  const orgName = state.profile.orgName || 'Organization';
  const currency = state.profile.currency || 'INR';

  // 1. Map Business Services to Assets
  const assets: Asset[] = state.services.map(srv => ({
    id: srv.id,
    name: srv.name,
    unit: srv.unit || 'Digital Operations',
    owner: srv.owner || 'Platform Team',
    service: srv.purpose || srv.name,
    criticality: srv.criticality || 3,
    dependencies: srv.dependencies || [],
  }));

  const assetMap = new Map(assets.map(a => [a.id, a]));

  // Ensure active scenarios exist
  const activeScenarios: CandidateRiskScenario[] = state.scenarios.filter(s => s.included);

  // 2. Map Scenarios to Risks
  const risks: Risk[] = activeScenarios.map((scen, idx) => {
    const srv = assetMap.get(scen.serviceId);
    const assetId = srv ? srv.id : (assets[0]?.id || 'srv_default');

    // Severity components
    const downtime = Math.max(0, scen.downtimeLoss || 0);
    const breach = Math.max(0, scen.breachLoss || 0);
    const penalty = Math.max(0, scen.penaltyLoss || 0);
    const reputation = Math.max(0, scen.reputationLoss || 0);

    return {
      id: scen.id || `r_${idx + 1}`,
      assetId,
      name: scen.name,
      category: scen.category || 'Cyber incident',
      source: scen.source || 'Questionnaire & Posture Review',
      finding: scen.findingEvidence || scen.rationale || 'Self-reported business posture',
      frequency: Number(scen.frequencyLambda.toFixed(2)) || 0.5,
      cvss: Number(scen.cvssEquivalent.toFixed(1)) || 7.5,
      threat: Number(scen.threatMultiplier.toFixed(2)) || 1.1,
      control: Number(scen.controlEffectiveness.toFixed(2)) || 0.4,
      downtime,
      breach,
      penalty,
      reputation,
      uncertainty: Number(scen.uncertaintySigma.toFixed(2)) || 0.65,
      observedAt: new Date().toISOString(),
    };
  });

  // 3. Map Treatment Actions
  const activeActions: CandidateActionTreatment[] = state.actions.filter(a => a.isIncluded);
  const actions: Action[] = activeActions.map((act, idx) => {
    // Filter effects to only reference existing risks
    const validEffects: Record<string, number> = {};
    const riskIdSet = new Set(risks.map(r => r.id));
    Object.entries(act.effects || {}).forEach(([rid, val]) => {
      if (riskIdSet.has(rid)) {
        validEffects[rid] = Math.min(0.99, Math.max(0, val));
      }
    });

    return {
      id: act.id || `act_${idx + 1}`,
      name: act.name,
      description: act.description || 'Proactive risk mitigation control',
      cost: Math.max(0, act.cost || 0),
      effects: validEffects,
      days: Math.max(0, act.daysToImplement || 7),
      owner: act.owner || 'Security Operations',
      frameworks: act.frameworks || ['NIST CSF 2.0'],
    };
  });

  const dataset: Dataset = {
    name: `${orgName} • Personalized assessment`,
    demo: false,
    assets,
    risks,
    actions,
  };

  // 4. Traceable scenario explanations
  const traceableExplanations: TraceableScenarioExplanation[] = risks.map(r => {
    const a = assetMap.get(r.assetId);
    const meanLoss = r.downtime + r.breach + r.penalty + r.reputation;
    const lambda = r.frequency * (0.5 + r.cvss / 10) * r.threat * (1 - r.control) * ((a?.criticality || 3) / 3);
    const eal = lambda * meanLoss;
    const annualProb = (1 - Math.exp(-lambda)) * 100;

    return {
      scenarioId: r.id,
      scenarioName: r.name,
      serviceName: a ? a.name : 'Unknown service',
      unit: a ? a.unit : 'Operations',
      criticality: a ? a.criticality : 3,
      frequencyLambda: Number(lambda.toFixed(3)),
      annualLikelihoodPercent: Number(annualProb.toFixed(1)),
      meanLossPerIncident: meanLoss,
      eal: Math.round(eal),
      lossBreakdown: {
        downtime: r.downtime,
        breachAndResponse: r.breach,
        statutoryLiability: r.penalty,
        reputationAndAttrition: r.reputation,
      },
      derivationTrail: {
        questionnaireAnswers: [
          `Linked asset: ${a?.name || 'N/A'} (Tier ${a?.criticality || 3})`,
          `Observed finding: ${r.finding}`,
        ],
        controlEffectivenessApplied: r.control,
        threatMultiplierApplied: r.threat,
        uncertaintySigma: r.uncertainty,
        provisionalStatus: r.source.includes('Questionnaire')
          ? 'Provisional self-reported calibration (review recommended)'
          : 'Validated audit assessment',
        preventedDoubleCountingNotes:
          'Downtime reflects operating interruption hours; Breach reflects incident response & notification; Statutory liability accounts for contractual SLAs; Reputation captures customer churn without duplicating interruption loss.',
      },
    };
  });

  traceableExplanations.sort((a, b) => b.eal - a.eal);

  const totalBaseEal = traceableExplanations.reduce((sum, t) => sum + t.eal, 0);

  return {
    dataset,
    orgName,
    generatedAt: new Date().toISOString(),
    traceableExplanations,
    modelMetadata: {
      modelVersion: '2.0.0-TraceableFinancial',
      currency,
      totalBaseEal,
      topRiskDriver: traceableExplanations[0]?.scenarioName || 'N/A',
      activeScenarioCount: risks.length,
      activeControlCount: actions.length,
    },
  };
}
