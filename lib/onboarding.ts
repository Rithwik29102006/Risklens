export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type PostureAnswer = 'yes' | 'partial' | 'no' | 'unknown';

export interface BusinessProfile {
  orgName: string;
  industry: string;
  businessModel: string;
  country: string;
  currency: CurrencyCode;
  employeeCount: string;
  annualRevenue: number; // in chosen currency (INR default)
  criticalOperatingHours: string;
  annualSecurityBudget: number; // in chosen currency
  mainConcerns: string[];
}

export interface BusinessService {
  id: string;
  name: string;
  purpose: string;
  owner: string;
  unit: string;
  supportingInfrastructure: string;
  internetFacing: boolean;
  criticality: number; // 1 to 5
  maxTolerableDowntimeHours: number | 'unknown';
  hasManualWorkaround: 'yes' | 'partial' | 'no';
  dependencies: string[]; // array of other service IDs
}

export interface ServiceDataConsequences {
  serviceId: string;
  dataType: 'none' | 'customer_pii' | 'financial_payment' | 'health_records' | 'confidential_ip' | 'operational_only';
  recordCount: number | 'unknown';
  affectedStakeholders: string[];
  hasContractualSla: boolean;
  incidentNotificationRequirement: boolean;
  applicableFrameworks: string[];
}

export interface SecurityPosture {
  mfaPrivileged: PostureAnswer;
  mfaWorkforce: PostureAnswer;
  patchManagement: PostureAnswer;
  endpointProtection: PostureAnswer;
  loggingMonitoring: PostureAnswer;
  networkSegmentation: PostureAnswer;
  cloudConfiguration: PostureAnswer;
  backupRestoration: PostureAnswer;
  incidentResponse: PostureAnswer;
  thirdPartyAccess: PostureAnswer;
  incidentHistory: 'none' | 'minor' | 'major' | 'unknown';
  assessorName?: string;
  observationDate?: string;
  evidenceNotes?: string;
}

export interface FinancialImpactEstimate {
  serviceId: string;
  downtimeHours: number;
  downtimeCostPerHour: number; // in currency
  downtimeCostMethod: 'manual' | 'revenue_share';
  revenueSharePercent?: number;
  breachCostLow: number;
  breachCostLikely: number;
  breachCostHigh: number;
  regulatoryLiabilityCost: number;
  reputationCustomerLossCost: number;
}

export interface CandidateRiskScenario {
  id: string;
  serviceId: string;
  name: string;
  category: string;
  rationale: string;
  source: string;
  findingEvidence: string;
  frequencyLambda: number; // annual rate
  cvssEquivalent: number;
  threatMultiplier: number;
  controlEffectiveness: number; // 0 to 1
  downtimeLoss: number;
  breachLoss: number;
  penaltyLoss: number;
  reputationLoss: number;
  uncertaintySigma: number;
  included: boolean;
  isProvisional: boolean;
}

export interface CandidateActionTreatment {
  id: string;
  name: string;
  description: string;
  cost: number;
  daysToImplement: number;
  owner: string;
  frameworks: string[];
  effects: Record<string, number>; // scenarioId -> reduction percentage (0 to 1)
  isIncluded: boolean;
  isFunded: boolean;
  feasibilityNotes?: string;
}

export interface OnboardingState {
  version: string;
  step: number; // 1 to 8
  profile: BusinessProfile;
  services: BusinessService[];
  consequences: Record<string, ServiceDataConsequences>; // keyed by serviceId
  posture: SecurityPosture;
  financialImpacts: Record<string, FinancialImpactEstimate>; // keyed by serviceId
  scenarios: CandidateRiskScenario[];
  actions: CandidateActionTreatment[];
  assumptionsConfirmed: boolean;
  updatedAt: string;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  version: '2.0',
  step: 1,
  profile: {
    orgName: '',
    industry: 'Banking & Financial Services',
    businessModel: 'B2B & B2C Digital Services',
    country: 'India',
    currency: 'INR',
    employeeCount: '51-250',
    annualRevenue: 500000000, // ₹50 Cr
    criticalOperatingHours: '24/7 Continuous Operations',
    annualSecurityBudget: 15000000, // ₹1.5 Cr
    mainConcerns: ['downtime', 'stolen_data', 'account_takeover', 'ransomware'],
  },
  services: [
    {
      id: 'srv_1',
      name: 'Customer Web Portal & API',
      purpose: 'Core customer authentication, account access, and service requests',
      owner: 'Platform Engineering',
      unit: 'Digital Operations',
      supportingInfrastructure: 'Cloud Hosted (AWS / Azure) + Kubernetes',
      internetFacing: true,
      criticality: 5,
      maxTolerableDowntimeHours: 4,
      hasManualWorkaround: 'no',
      dependencies: ['srv_2'],
    },
    {
      id: 'srv_2',
      name: 'Transaction Database & Records',
      purpose: 'Persistent customer records, transaction ledger, and payment balances',
      owner: 'Database Administration',
      unit: 'Core Infrastructure',
      supportingInfrastructure: 'Managed PostgreSQL cluster with read-replicas',
      internetFacing: false,
      criticality: 5,
      maxTolerableDowntimeHours: 2,
      hasManualWorkaround: 'no',
      dependencies: [],
    },
    {
      id: 'srv_3',
      name: 'Workforce Identity & Workspace',
      purpose: 'Internal employee login, corporate email, and admin console access',
      owner: 'IT Operations',
      unit: 'Corporate IT',
      supportingInfrastructure: 'Cloud IdP (Okta / Entra ID) + Endpoint Fleet',
      internetFacing: true,
      criticality: 4,
      maxTolerableDowntimeHours: 12,
      hasManualWorkaround: 'partial',
      dependencies: [],
    },
  ],
  consequences: {
    srv_1: {
      serviceId: 'srv_1',
      dataType: 'financial_payment',
      recordCount: 250000,
      affectedStakeholders: ['customers', 'business_partners'],
      hasContractualSla: true,
      incidentNotificationRequirement: true,
      applicableFrameworks: ['RBI Cyber Security Framework', 'DPDP Act 2023', 'CERT-In Directions', 'PCI-DSS'],
    },
    srv_2: {
      serviceId: 'srv_2',
      dataType: 'customer_pii',
      recordCount: 500000,
      affectedStakeholders: ['customers'],
      hasContractualSla: true,
      incidentNotificationRequirement: true,
      applicableFrameworks: ['DPDP Act 2023', 'ISO/IEC 27001', 'CERT-In Directions'],
    },
    srv_3: {
      serviceId: 'srv_3',
      dataType: 'confidential_ip',
      recordCount: 1500,
      affectedStakeholders: ['employees'],
      hasContractualSla: false,
      incidentNotificationRequirement: false,
      applicableFrameworks: ['ISO/IEC 27001', 'CIS Critical Security Controls'],
    },
  },
  posture: {
    mfaPrivileged: 'partial',
    mfaWorkforce: 'partial',
    patchManagement: 'partial',
    endpointProtection: 'yes',
    loggingMonitoring: 'partial',
    networkSegmentation: 'partial',
    cloudConfiguration: 'partial',
    backupRestoration: 'partial',
    incidentResponse: 'yes',
    thirdPartyAccess: 'partial',
    incidentHistory: 'none',
    assessorName: 'Lead Security Assessor',
    observationDate: new Date().toISOString().split('T')[0],
    evidenceNotes: 'Baseline self-assessment conducted across engineering and corporate IT.',
  },
  financialImpacts: {
    srv_1: {
      serviceId: 'srv_1',
      downtimeHours: 8,
      downtimeCostPerHour: 450000, // ₹4.5 L/hr
      downtimeCostMethod: 'revenue_share',
      revenueSharePercent: 70,
      breachCostLow: 2500000,
      breachCostLikely: 6000000,
      breachCostHigh: 12000000,
      regulatoryLiabilityCost: 2500000,
      reputationCustomerLossCost: 3500000,
    },
    srv_2: {
      serviceId: 'srv_2',
      downtimeHours: 6,
      downtimeCostPerHour: 300000, // ₹3 L/hr
      downtimeCostMethod: 'manual',
      breachCostLow: 5000000,
      breachCostLikely: 14000000,
      breachCostHigh: 25000000,
      regulatoryLiabilityCost: 4000000,
      reputationCustomerLossCost: 5000000,
    },
    srv_3: {
      serviceId: 'srv_3',
      downtimeHours: 12,
      downtimeCostPerHour: 80000, // ₹80k/hr
      downtimeCostMethod: 'manual',
      breachCostLow: 1000000,
      breachCostLikely: 2500000,
      breachCostHigh: 5000000,
      regulatoryLiabilityCost: 500000,
      reputationCustomerLossCost: 1000000,
    },
  },
  scenarios: [],
  actions: [],
  assumptionsConfirmed: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Generate candidate risk scenarios from business services and security posture
 */
export function generateCandidateScenarios(
  services: BusinessService[],
  posture: SecurityPosture,
  financials: Record<string, FinancialImpactEstimate>,
  consequences: Record<string, ServiceDataConsequences>
): CandidateRiskScenario[] {
  const scenarios: CandidateRiskScenario[] = [];

  // Helper to convert posture answer to control factor
  const controlScore = (ans: PostureAnswer, full = 0.75, part = 0.40, zero = 0.10, unk = 0.25) => {
    switch (ans) {
      case 'yes': return full;
      case 'partial': return part;
      case 'no': return zero;
      default: return unk;
    }
  };

  services.forEach((srv) => {
    const fin = financials[srv.id] || {
      downtimeHours: 8,
      downtimeCostPerHour: 100000,
      breachCostLikely: 2000000,
      regulatoryLiabilityCost: 500000,
      reputationCustomerLossCost: 1000000,
      breachCostLow: 1000000,
      breachCostHigh: 5000000,
    };
    const cons = consequences[srv.id] || {
      dataType: 'customer_pii',
      hasContractualSla: false,
      incidentNotificationRequirement: false,
      applicableFrameworks: [],
    };

    // Scenario 1: External Exploitation & Interruption (if internet facing or critical)
    if (srv.internetFacing || srv.criticality >= 4) {
      const ctrl = controlScore(posture.patchManagement, 0.70, 0.40, 0.15, 0.25);
      const isProv = posture.patchManagement === 'unknown';
      const lambda = srv.internetFacing ? (0.65 * (1 - ctrl * 0.5)) : (0.35 * (1 - ctrl * 0.5));
      const dtLoss = fin.downtimeHours * fin.downtimeCostPerHour;
      
      scenarios.push({
        id: `scen_${srv.id}_exploit`,
        serviceId: srv.id,
        name: `Service disruption via ${srv.internetFacing ? 'internet-facing' : 'application'} vulnerability`,
        category: 'Application compromise',
        rationale: srv.internetFacing
          ? `Generated because "${srv.name}" is internet-facing and patch management is marked as "${posture.patchManagement}".`
          : `Generated because "${srv.name}" is high-criticality (tier ${srv.criticality}) with potential service interruption.`,
        source: 'Self-reported architecture & posture',
        findingEvidence: `Patch management is self-reported as ${posture.patchManagement.toUpperCase()}. Maximum tolerable downtime is ${srv.maxTolerableDowntimeHours} hours.`,
        frequencyLambda: Number(lambda.toFixed(2)),
        cvssEquivalent: srv.internetFacing ? 8.8 : 7.2,
        threatMultiplier: 1.25,
        controlEffectiveness: ctrl,
        downtimeLoss: Math.round(dtLoss),
        breachLoss: Math.round(fin.breachCostLikely * 0.3),
        penaltyLoss: cons.hasContractualSla ? fin.regulatoryLiabilityCost : 0,
        reputationLoss: Math.round(fin.reputationCustomerLossCost * 0.5),
        uncertaintySigma: 0.65,
        included: true,
        isProvisional: isProv,
      });
    }

    // Scenario 2: Privileged Account Takeover & Unauthorized Access
    if (srv.criticality >= 3) {
      const ctrl = controlScore(posture.mfaPrivileged, 0.80, 0.45, 0.12, 0.25);
      const isProv = posture.mfaPrivileged === 'unknown';
      const lambda = 0.55 * (1 - ctrl * 0.6);

      scenarios.push({
        id: `scen_${srv.id}_ato`,
        serviceId: srv.id,
        name: `Privileged account takeover and unauthorized configuration changes on ${srv.name}`,
        category: 'Identity compromise',
        rationale: `Generated because "${srv.name}" is owned by ${srv.owner} and privileged MFA is marked as "${posture.mfaPrivileged}".`,
        source: 'IAM posture assessment',
        findingEvidence: `Privileged MFA enforcement status: ${posture.mfaPrivileged.toUpperCase()}. Supports ${srv.supportingInfrastructure}.`,
        frequencyLambda: Number(lambda.toFixed(2)),
        cvssEquivalent: 8.2,
        threatMultiplier: 1.20,
        controlEffectiveness: ctrl,
        downtimeLoss: Math.round(fin.downtimeHours * fin.downtimeCostPerHour * 0.5),
        breachLoss: Math.round(fin.breachCostLikely * 0.6),
        penaltyLoss: Math.round(fin.regulatoryLiabilityCost * 0.4),
        reputationLoss: Math.round(fin.reputationCustomerLossCost * 0.4),
        uncertaintySigma: 0.60,
        included: true,
        isProvisional: isProv,
      });
    }

    // Scenario 3: Data Exfiltration / Exposure (if holds sensitive data)
    if (cons.dataType !== 'none' && cons.dataType !== 'operational_only') {
      const ctrl = (controlScore(posture.cloudConfiguration) + controlScore(posture.loggingMonitoring)) / 2;
      const isProv = posture.cloudConfiguration === 'unknown' || posture.loggingMonitoring === 'unknown';
      const lambda = 0.45 * (1 - ctrl * 0.5);

      scenarios.push({
        id: `scen_${srv.id}_exfil`,
        serviceId: srv.id,
        name: `Unauthorized exposure or exfiltration of ${cons.dataType.replace(/_/g, ' ')}`,
        category: 'Data breach',
        rationale: `Generated because "${srv.name}" holds ${cons.dataType.replace(/_/g, ' ')} with ~${cons.recordCount} plausible affected records.`,
        source: 'Data governance & cloud posture',
        findingEvidence: `Cloud configuration review: ${posture.cloudConfiguration.toUpperCase()}. Monitoring & SIEM: ${posture.loggingMonitoring.toUpperCase()}. Statutory notification required: ${cons.incidentNotificationRequirement ? 'YES' : 'NO'}.`,
        frequencyLambda: Number(lambda.toFixed(2)),
        cvssEquivalent: 7.8,
        threatMultiplier: 1.15,
        controlEffectiveness: Number(ctrl.toFixed(2)),
        downtimeLoss: Math.round(fin.downtimeCostPerHour * 2),
        breachLoss: fin.breachCostLikely,
        penaltyLoss: fin.regulatoryLiabilityCost,
        reputationLoss: fin.reputationCustomerLossCost,
        uncertaintySigma: 0.75,
        included: true,
        isProvisional: isProv,
      });
    }

    // Scenario 4: Ransomware / Destructive Malware (for services with low recovery testing or high tier)
    if (srv.criticality >= 4 && posture.backupRestoration !== 'yes') {
      const ctrl = (controlScore(posture.backupRestoration) + controlScore(posture.endpointProtection)) / 2;
      const isProv = posture.backupRestoration === 'unknown';
      const lambda = 0.40 * (1 - ctrl * 0.5);

      scenarios.push({
        id: `scen_${srv.id}_ransomware`,
        serviceId: srv.id,
        name: `Ransomware encryption and prolonged recovery failure affecting ${srv.name}`,
        category: 'Ransomware & recovery failure',
        rationale: `Generated because backup restoration testing is marked "${posture.backupRestoration}" and manual workaround is "${srv.hasManualWorkaround}".`,
        source: 'Business continuity & endpoint assessment',
        findingEvidence: `Backup isolation and restoration testing: ${posture.backupRestoration.toUpperCase()}. Manual workaround: ${srv.hasManualWorkaround.toUpperCase()}.`,
        frequencyLambda: Number(lambda.toFixed(2)),
        cvssEquivalent: 8.5,
        threatMultiplier: 1.30,
        controlEffectiveness: Number(ctrl.toFixed(2)),
        downtimeLoss: Math.round(fin.downtimeHours * 1.5 * fin.downtimeCostPerHour),
        breachLoss: Math.round(fin.breachCostLikely * 0.4),
        penaltyLoss: Math.round(fin.regulatoryLiabilityCost * 0.3),
        reputationLoss: Math.round(fin.reputationCustomerLossCost * 0.7),
        uncertaintySigma: 0.70,
        included: true,
        isProvisional: isProv,
      });
    }
  });

  return scenarios;
}

/**
 * Generate candidate treatment actions tailored to the scenarios and business budget
 */
export function generateCandidateActions(
  scenarios: CandidateRiskScenario[],
  budget: number
): CandidateActionTreatment[] {
  const actions: CandidateActionTreatment[] = [];

  // 1. Phishing-Resistant MFA
  const atoScenarios = scenarios.filter(s => s.category === 'Identity compromise');
  if (atoScenarios.length > 0) {
    const effects: Record<string, number> = {};
    atoScenarios.forEach(s => { effects[s.id] = 0.75; });
    actions.push({
      id: 'act_mfa_privileged',
      name: 'Enforce Phishing-Resistant MFA on Privileged Accounts',
      description: 'Require hardware security keys (FIDO2 / WebAuthn) for all cloud, admin, and database access; revoke legacy session tokens.',
      cost: Math.min(budget * 0.2, 2000000), // ~₹20 L or 20% budget
      daysToImplement: 14,
      owner: 'Identity & Access Management',
      frameworks: ['NIST CSF PR.AA', 'RBI CSF Annex 1 (IAM)', 'DPDP Security Safeguards', 'ISO 27001 A.8.5'],
      effects,
      isIncluded: true,
      isFunded: false,
      feasibilityNotes: 'Requires roll-out of FIDO2 security keys and IdP conditional access policies.',
    });
  }

  // 2. Critical Vulnerability Patching SLA
  const exploitScenarios = scenarios.filter(s => s.category === 'Application compromise');
  if (exploitScenarios.length > 0) {
    const effects: Record<string, number> = {};
    exploitScenarios.forEach(s => { effects[s.id] = 0.70; });
    actions.push({
      id: 'act_patch_automation',
      name: 'Automated Vulnerability Management & Rapid Patching SLA',
      description: 'Implement automated dependency vulnerability scanning and a strict 72-hour SLA for critical internet-facing flaws.',
      cost: Math.min(budget * 0.15, 1500000),
      daysToImplement: 10,
      owner: 'DevSecOps & Platform Engineering',
      frameworks: ['NIST CSF PR.PS', 'CERT-In Vulnerability Remediation', 'ISO 27001 A.8.8'],
      effects,
      isIncluded: true,
      isFunded: false,
      feasibilityNotes: 'Integrates with CI/CD deployment pipelines and production container registries.',
    });
  }

  // 3. Isolated Immutable Backups & Restoration Testing
  const ransomScenarios = scenarios.filter(s => s.category === 'Ransomware & recovery failure');
  if (ransomScenarios.length > 0) {
    const effects: Record<string, number> = {};
    ransomScenarios.forEach(s => { effects[s.id] = 0.65; });
    actions.push({
      id: 'act_immutable_backups',
      name: 'Air-Gapped Immutable Backups & Quarterly Restoration Drills',
      description: 'Deploy write-once-read-many (WORM) storage replication for critical databases and mandate quarterly live restoration drills.',
      cost: Math.min(budget * 0.25, 2500000),
      daysToImplement: 21,
      owner: 'Infrastructure & Business Continuity',
      frameworks: ['NIST CSF RC.RP', 'RBI CSF Resilience Mandates', 'ISO 27001 A.8.13'],
      effects,
      isIncluded: true,
      isFunded: false,
      feasibilityNotes: 'Assumes support for object-lock storage and isolated test VPC restoration.',
    });
  }

  // 4. Data Loss Prevention & Egress Monitoring
  const exfilScenarios = scenarios.filter(s => s.category === 'Data breach');
  if (exfilScenarios.length > 0) {
    const effects: Record<string, number> = {};
    exfilScenarios.forEach(s => { effects[s.id] = 0.60; });
    actions.push({
      id: 'act_egress_monitoring',
      name: 'Cloud Data Access Hardening & Egress Anomaly Detection',
      description: 'Enforce least-privilege IAM storage policies and alert on anomalous bulk data downloads or external database egress.',
      cost: Math.min(budget * 0.18, 1800000),
      daysToImplement: 14,
      owner: 'Cloud Security & SOC',
      frameworks: ['NIST CSF DE.CM', 'DPDP Act 2023 Sec 8', 'CERT-In 6-Hour Reporting Baseline'],
      effects,
      isIncluded: true,
      isFunded: false,
      feasibilityNotes: 'Requires SIEM ingestion of cloud audit trail and database connection logs.',
    });
  }

  // 5. Network Microsegmentation
  if (scenarios.length >= 3) {
    const effects: Record<string, number> = {};
    scenarios.forEach(s => {
      effects[s.id] = 0.25; // Broad lateral movement mitigation across scenarios
    });
    actions.push({
      id: 'act_network_segmentation',
      name: 'Zero-Trust Network Microsegmentation',
      description: 'Restrict east-west traffic between application tiers, database clusters, and corporate user subnets.',
      cost: Math.min(budget * 0.3, 3500000),
      daysToImplement: 30,
      owner: 'Network Security Team',
      frameworks: ['NIST CSF PR.IR', 'RBI CSF Network Security', 'CIS 12'],
      effects,
      isIncluded: true,
      isFunded: false,
      feasibilityNotes: 'Phased rollout starting from non-production VPCs to avoid service interruption.',
    });
  }

  return actions;
}

/**
 * Check completeness and classify inputs into User-Provided, Derived, Provisional, and Missing
 */
export function auditOnboardingReadiness(state: OnboardingState) {
  const userProvided: string[] = [];
  const derived: string[] = [];
  const provisional: string[] = [];
  const missingBlocking: string[] = [];
  const missingProvisional: string[] = [];

  // Profile check
  if (!state.profile.orgName?.trim()) {
    missingBlocking.push('Organization name is required');
  } else {
    userProvided.push(`Organization: "${state.profile.orgName}" (${state.profile.industry})`);
  }

  if (state.profile.annualRevenue > 0) {
    userProvided.push(`Annual Revenue: ₹${(state.profile.annualRevenue / 1e7).toFixed(1)} Cr`);
  } else {
    missingBlocking.push('Annual revenue must be greater than zero');
  }

  if (state.profile.annualSecurityBudget > 0) {
    userProvided.push(`Cybersecurity Budget: ₹${(state.profile.annualSecurityBudget / 1e7).toFixed(2)} Cr`);
  } else {
    missingProvisional.push('Cybersecurity budget not confirmed (defaulted to ₹1 Cr provisional)');
  }

  // Services check
  if (state.services.length === 0) {
    missingBlocking.push('At least one critical business service must be registered');
  } else {
    userProvided.push(`${state.services.length} business services defined`);
  }

  // Posture check
  const postureKeys = [
    ['mfaPrivileged', 'Privileged MFA'],
    ['patchManagement', 'Patch Management'],
    ['endpointProtection', 'Endpoint Protection'],
    ['loggingMonitoring', 'SIEM & Logging'],
    ['backupRestoration', 'Backup & Recovery Testing'],
  ] as const;

  postureKeys.forEach(([key, label]) => {
    const val = state.posture[key];
    if (val === 'unknown') {
      provisional.push(`${label} is UNKNOWN (using conservative provisional effectiveness)`);
    } else {
      userProvided.push(`${label}: ${val.toUpperCase()}`);
    }
  });

  // Financial impact check
  state.services.forEach(srv => {
    const fin = state.financialImpacts[srv.id];
    if (!fin) {
      missingProvisional.push(`Financial estimates missing for service "${srv.name}" (using standard baseline)`);
    } else if (fin.downtimeCostMethod === 'revenue_share') {
      derived.push(`Downtime cost for "${srv.name}" derived from annual revenue (${fin.revenueSharePercent}% share)`);
    } else {
      userProvided.push(`Downtime cost for "${srv.name}": ₹${(fin.downtimeCostPerHour / 1e5).toFixed(1)} L/hr`);
    }
  });

  // Scenarios check
  const activeScenarios = state.scenarios.filter(s => s.included);
  if (activeScenarios.length === 0) {
    missingBlocking.push('At least one risk scenario must be confirmed');
  } else {
    derived.push(`${activeScenarios.length} active risk scenarios generated and mapped`);
    activeScenarios.forEach(s => {
      if (s.isProvisional) {
        provisional.push(`Scenario "${s.name}": provisional likelihood based on self-reported inputs`);
      }
    });
  }

  return {
    isReadyToCalculate: missingBlocking.length === 0,
    userProvided,
    derived,
    provisional,
    missingBlocking,
    missingProvisional,
  };
}
