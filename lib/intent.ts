/** Multinomial naive Bayes intent classifier trained on curated risk assessment questions.
 * This classifies queries into supported analytical tasks; it does not generate hallucinations.
 */
const examples: Record<string, string[]> = {
  risk: [
    'What is our highest financial cyber risk today',
    'Which vulnerabilities contribute most to expected losses',
    'Show the top exposure drivers',
    'Explain our annual loss estimate',
    'What asset has the greatest risk',
    'Which business service is at risk',
    'Why is this our top exposure',
  ],
  contributed: [
    'Which answers contributed to this estimate',
    'Why is this my largest financial risk',
    'What questionnaire answers created this risk',
    'How did our security posture influence this number',
    'Show the evidence findings for this calculation',
    'Explain the source of this estimate',
  ],
  missing: [
    'What information is missing',
    'Are there any provisional assumptions',
    'Which inputs are unknown or unverified',
    'What data gaps should we address',
    'Show missing information',
    'Is any data missing from our assessment',
  ],
  backups: [
    'How would better backups affect my exposure',
    'What if we test our backup restoration',
    'How does immutable recovery reduce ransomware losses',
    'What is the benefit of isolated backups',
    'Can better backups lower our business interruption',
  ],
  mfa: [
    'What happens if MFA is implemented across all privileged accounts',
    'What if we implement privileged MFA',
    'How does multifactor authentication reduce losses',
    'Show benefits of enforcing MFA',
    'What does privileged access authentication cost',
  ],
  delay: [
    'How will delaying remediation by 30 days affect our financial exposure',
    'What is the impact of a 30 day delay',
    'What if we postpone remediation',
    'Cost of delaying the control rollout',
    'How much does waiting to patch cost',
  ],
  budget: [
    'Which investments fit our budget',
    'Which actions fit my budget',
    'Recommend the best investment portfolio',
    'Optimize my security spending',
    'What should we prioritize with one crore',
    'Which controls should we fund',
    'Suggest cost effective mitigation under our budget',
  ],
};

const stop = new Set('a an the is are our my we with to of in on for does do how what which if will has would can'.split(' '));
const tokenize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !stop.has(w));
const vocab = new Set<string>();
const counts: Record<string, Record<string, number>> = {};
const totals: Record<string, number> = {};

for (const [label, rows] of Object.entries(examples)) {
  counts[label] = {};
  totals[label] = 0;
  for (const row of rows) {
    for (const token of tokenize(row)) {
      vocab.add(token);
      counts[label][token] = (counts[label][token] || 0) + 1;
      totals[label]++;
    }
  }
}

export function classify(question: string) {
  const tokens = tokenize(question).filter(t => vocab.has(t));
  if (!tokens.length) return { intent: 'unknown', score: 0 };
  const scores = Object.keys(examples).map(label => ({
    label,
    score: tokens.reduce(
      (sum, t) => sum + Math.log(((counts[label][t] || 0) + 1) / (totals[label] + vocab.size)),
      Math.log(1 / Object.keys(examples).length)
    ),
  })).sort((a, b) => b.score - a.score);

  const maximum = scores[0].score;
  const den = scores.reduce((s, r) => s + Math.exp(r.score - maximum), 0);
  const score = 1 / den;
  return { intent: score < 0.35 ? 'unknown' : scores[0].label, score };
}
