import { classify } from '@/lib/intent';
import { datasetSchema } from '@/lib/validation';
import { quantify, total, optimize, money } from '@/lib/risk';
import { sameOrigin } from '@/db/raw';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Origin not allowed' }, { status: 403 });

  try {
    const raw = await req.text();
    if (raw.length > 500000) return Response.json({ error: 'Payload too large' }, { status: 413 });

    const b = JSON.parse(raw);
    const d = datasetSchema.parse(b.dataset);
    const q = String(b.question || '').slice(0, 2000).toLowerCase();

    const risks = quantify(d);
    const base = total(d);
    const classification = classify(q);
    const topRisk = risks[0];
    const budgetVal = Number.isFinite(b.budget) && b.budget > 0 ? b.budget : 10000000;

    let answer = '';
    let refs: string[] = [];

    if (classification.intent === 'mfa') {
      const a = d.actions.find(a => /mfa|identity|credential/i.test(a.name));
      if (a) {
        const red = base - total(d, [a.id]);
        answer = `${a.name} reduces modeled annual loss by ${money(red)} for ${money(a.cost)} in first-year cost. This assumes the stated effectiveness is achieved after implementation. Target scenarios addressed: ${Object.keys(a.effects).join(', ')}.`;
        refs = Object.keys(a.effects);
      } else {
        answer = 'No multi-factor authentication intervention is defined in this assessment.';
      }
    } else if (classification.intent === 'backups') {
      const backupAct = d.actions.find(a => /backup|recovery|immutable/i.test(a.name));
      const ransomRisks = risks.filter(r => /ransomware|recovery|backup/i.test(r.name) || /ransomware/i.test(r.category));
      if (backupAct) {
        const red = base - total(d, [backupAct.id]);
        answer = `${backupAct.name} reduces modeled annual loss by ${money(red)} for ${money(backupAct.cost)} in first-year investment. It primarily cuts recovery downtime and restoration failure in severe ransomware incidents.`;
        refs = [backupAct.id, ...Object.keys(backupAct.effects)];
      } else if (ransomRisks.length > 0) {
        answer = `Your assessment has ${ransomRisks.length} recovery/ransomware scenarios totaling ${money(ransomRisks.reduce((s, r) => s + r.eal, 0))} in annual exposure. Adding immutable backups and restoration drills typically provides 60–70% modeled loss mitigation for these scenarios.`;
        refs = ransomRisks.map(r => r.id);
      } else {
        answer = 'Tested, immutable backups mitigate business interruption during disruptive incidents. In your current services, ensuring backup isolation protects against prolonged operational downtime.';
      }
    } else if (classification.intent === 'contributed') {
      if (topRisk) {
        const pct = (100 * topRisk.eal / Math.max(1, base)).toFixed(1);
        answer = `"${topRisk.name}" on service "${topRisk.asset.name}" is your highest financial risk (${money(topRisk.eal)}, ${pct}% of total EAL). Key contributing factors: (1) Self-reported finding: ${topRisk.finding}; (2) Modeled frequency: ${topRisk.lambda.toFixed(2)} events/yr; (3) Business impact per incident: ${money(topRisk.severity)} (Downtime: ${money(topRisk.downtime)}, Breach response: ${money(topRisk.breach)}, Regulatory/Contractual: ${money(topRisk.penalty)}, Reputation: ${money(topRisk.reputation)}).`;
        refs = [topRisk.id];
      } else {
        answer = 'No active risk scenarios are configured in this assessment.';
      }
    } else if (classification.intent === 'missing') {
      const provisionalRisks = risks.filter(r => r.source.includes('Questionnaire') || r.source.includes('Self-reported'));
      answer = `This assessment is based on self-reported business setup and security posture. Key items to note: (1) Control effectiveness values are self-reported estimates, not independently verified by live telemetry; (2) ${provisionalRisks.length} scenario(s) use provisional calibration; (3) Actual regulatory fines are not automated and depend on statutory determinations. Conduct periodic technical rescans to replace self-reported assumptions with verified telemetry.`;
      refs = provisionalRisks.map(r => r.id);
    } else if (classification.intent === 'delay') {
      const o = optimize(d, budgetVal);
      if (o.ids.length === 0) {
        answer = `No actions fit within the current ${money(budgetVal)} budget to model a 30-day implementation delay.`;
      } else {
        const delayedLoss = total(d, o.ids, 30);
        const immediateLoss = total(d, o.ids, 0);
        const delayPenalty = delayedLoss - immediateLoss;
        answer = `Delaying the budget-optimal portfolio by 30 days adds ${money(delayPenalty)} to first-year expected loss compared with immediate implementation. The financial model prorates 30 days at current baseline exposure and 335 days at mitigated exposure. It does not assume threat growth during the delay.`;
        refs = o.ids;
      }
    } else if (classification.intent === 'budget') {
      const o = optimize(d, budgetVal);
      const selectedNames = d.actions.filter(a => o.ids.includes(a.id)).map(a => a.name).join('; ');
      answer = `At the ${money(budgetVal)} budget, the optimal portfolio costs ${money(o.cost)} and avoids ${money(o.reduction)} in annual expected loss. Selected controls: ${selectedNames || 'none within budget'}. Overlapping control benefits compound multiplicatively, preventing double-counting.`;
      refs = o.ids;
    } else if (classification.intent === 'risk') {
      if (topRisk) {
        answer = `Expected annual loss (EAL) is ${money(base)}. The largest driver is ${topRisk.name} on ${topRisk.asset.name}, contributing ${money(topRisk.eal)} (${(100 * topRisk.eal / Math.max(1, base)).toFixed(1)}%). Finding: ${topRisk.finding}. Annual likelihood of at least one event: ${((1 - Math.exp(-topRisk.lambda)) * 100).toFixed(1)}%; mean loss per event: ${money(topRisk.severity)}.`;
        refs = [topRisk.id];
      } else {
        answer = `Total expected annual loss is ${money(base)}. No active risks found.`;
      }
    } else {
      answer = 'I can answer questions grounded in your assessment: ask why an item is your highest risk, which answers contributed, what information is provisional or missing, which actions fit your budget, or how better backups reduce exposure.';
    }

    return Response.json({
      answer,
      refs,
      intent: classification.intent,
      mode: 'Local Naive Bayes classifier + Grounded financial calculations (no hallucinations)',
    });
  } catch (e) {
    console.error('Assistant error', e);
    return Response.json({ error: 'Could not analyze this request. Please check the assessment and retry.' }, { status: 400 });
  }
}
