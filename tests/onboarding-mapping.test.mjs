import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const load = (name) => {
  const source = readFileSync(new URL('../lib/' + name + '.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const customRequire = (spec) => {
    if (spec.startsWith('.')) {
      const clean = spec.replace(/^\.\//, '');
      return load(clean);
    }
    return require(spec);
  };
  const fn = vm.runInThisContext(`(function(exports, require, module) { ${js}\n})`);
  fn(mod.exports, customRequire, mod);
  return mod.exports;
};

const {
  DEFAULT_ONBOARDING_STATE,
  generateCandidateScenarios,
  generateCandidateActions,
  auditOnboardingReadiness,
} = load('onboarding');
const { mapOnboardingToDataset } = load('mapping');
const { datasetSchema } = load('validation');
const { quantify, total, optimize } = load('risk');

test('candidate scenario generation generates internet-facing and identity scenarios', () => {
  const state = JSON.parse(JSON.stringify(DEFAULT_ONBOARDING_STATE));
  const scens = generateCandidateScenarios(state.services, state.posture, state.financialImpacts, state.consequences);

  assert.ok(scens.length >= 3, 'Should generate at least 3 scenarios');
  const exploitScen = scens.find(s => s.category === 'Application compromise');
  assert.ok(exploitScen, 'Should include Application compromise scenario for internet-facing service');
  assert.ok(exploitScen.rationale.includes('internet-facing'), 'Rationale should mention internet-facing condition');

  const atoScen = scens.find(s => s.category === 'Identity compromise');
  assert.ok(atoScen, 'Should include Identity compromise scenario');

  const breachScen = scens.find(s => s.category === 'Data breach');
  assert.ok(breachScen, 'Should include Data breach scenario for sensitive data service');
});

test('candidate action generator binds controls to active scenarios', () => {
  const state = JSON.parse(JSON.stringify(DEFAULT_ONBOARDING_STATE));
  const scens = generateCandidateScenarios(state.services, state.posture, state.financialImpacts, state.consequences);
  const actions = generateCandidateActions(scens, state.profile.annualSecurityBudget);

  assert.ok(actions.length >= 3, 'Should generate candidate treatment actions');
  const mfaAct = actions.find(a => a.id === 'act_mfa_privileged');
  assert.ok(mfaAct, 'Should generate privileged MFA action');
  assert.ok(mfaAct.cost > 0 && mfaAct.cost <= state.profile.annualSecurityBudget, 'Cost should respect budget scale');

  // Verify effects link to actual scenarios
  const scenIds = new Set(scens.map(s => s.id));
  for (const act of actions) {
    for (const sid of Object.keys(act.effects)) {
      assert.ok(scenIds.has(sid), `Action effect should point to valid scenario: ${sid}`);
    }
  }
});

test('mapping onboarding state to dataset produces schema-valid, quantifiable dataset', () => {
  const state = JSON.parse(JSON.stringify(DEFAULT_ONBOARDING_STATE));
  state.profile.orgName = 'FinEdge Payments';
  state.scenarios = generateCandidateScenarios(state.services, state.posture, state.financialImpacts, state.consequences);
  state.actions = generateCandidateActions(state.scenarios, state.profile.annualSecurityBudget);

  const result = mapOnboardingToDataset(state);

  // Validate against Zod schema
  assert.doesNotThrow(() => datasetSchema.parse(result.dataset), 'Dataset must pass datasetSchema validation');

  // Validate financial quantification
  const risks = quantify(result.dataset);
  assert.ok(risks.length > 0, 'Should quantify risks');
  const baseLoss = total(result.dataset);
  assert.ok(baseLoss > 0, 'Base expected annual loss should be positive');

  // Verify traceable explanations
  assert.equal(result.traceableExplanations.length, risks.length);
  for (const exp of result.traceableExplanations) {
    assert.ok(exp.meanLossPerIncident > 0);
    assert.ok(exp.eal > 0);
    assert.ok(exp.derivationTrail.preventedDoubleCountingNotes.length > 0);
  }

  // Verify optimization executes correctly
  const opt = optimize(result.dataset, state.profile.annualSecurityBudget);
  assert.ok(opt.cost <= state.profile.annualSecurityBudget, 'Optimized cost must not exceed budget');
});

test('readiness check flags blocking missing fields vs provisional assumptions', () => {
  const state = JSON.parse(JSON.stringify(DEFAULT_ONBOARDING_STATE));
  state.profile.orgName = ''; // missing org name

  const audit1 = auditOnboardingReadiness(state);
  assert.equal(audit1.isReadyToCalculate, false, 'Empty org name must block calculation');
  assert.ok(audit1.missingBlocking.some(m => m.includes('Organization name')));

  state.profile.orgName = 'Valid Org';
  state.posture.patchManagement = 'unknown'; // provisional posture
  const audit2 = auditOnboardingReadiness(state);
  assert.ok(audit2.provisional.some(p => p.includes('Patch Management')), 'Unknown posture should be flagged as provisional');
});
