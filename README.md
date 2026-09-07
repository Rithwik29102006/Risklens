# RiskLens — Continuous Cyber Risk Intelligence

Working cloud-ready MVP for SIH problem statement 26105. Private web workspace with a React interface, Worker HTTP backend, durable SQLite/D1 assessment history, a financial risk engine, and a local AI intent classifier.

## Implemented

- Executive overview, financial risk register, evidence drill-down, business assets and service dependencies.
- Expected Annual Loss, annual incident probability, model-defined risk index, Monte Carlo annual loss percentiles (5,000 Poisson/lognormal trials).
- Scenario selection, explicit implementation delay, first-year ROSI, exhaustive budget optimization with multiplicative overlap handling.
- Local multinomial naive Bayes NLP intent model with grounded financial responses for risk drivers, MFA, delay and investments. No third-party AI account required.
- Historical assessments and a least-squares 30-day trend when enough time-separated snapshots exist.
- Validated full-assessment JSON import, 60-second saved-data polling, saved investment plans, JSON executive reports.
- Illustrative control mappings for NIST CSF 2.0, ISO/IEC 27001:2022, CIS 8.1 and thematic RBI/SEBI review. Official references appear in the app.
- Owner-private access enforced by the hosting gateway. Same-origin mutation checks, prepared SQL statements, bounded payloads, cross-reference validation.

## Run and validate

Node 22.13 or later. Preserve the lockfile. Install with `npm ci`, then run `npm run dev` in a compatible Cloudflare development environment. Production build: `npm run build`. Financial model tests: `node --test tests/risk-engine.test.mjs`. Static type check: `npx tsc --noEmit`.

Logical database binding: DB in `.openai/hosting.json`. Schema lives in `db/schema.ts`; generated SQL in `drizzle/`. Schema changes use `npm run db:generate`; review migrations before applying. The hosting workflow applies schema migrations before publishing. Never initialize schema in request handlers.

## API

`GET /api/assessment` returns the active assessment, up to 60 historical snapshots, and the 10 most recent plans. With no saved assessment it returns the bundled sample without pretending it is live data.

`POST /api/assessment` with `{ "dataset": { ... } }` validates and saves a complete assessment; it becomes active. It retains older snapshots. Download the sample JSON from Data sources for the exact contract.

`POST /api/assessment` with `{ "kind": "plan", "name": "...", "dataset": { ... }, "selected": ["patch"], "budget": 10000000, "delay": 0 }` saves the scenario and the exact assessment used. Costs and results are recomputed on the server.

`POST /api/assistant` with `{ "question": "...", "dataset": { ... }, "budget": 10000000 }` classifies the request locally and returns a calculated answer and referenced risk/action IDs. It does not execute recommendations.

All endpoints inherit the private site's gateway access. Unauthenticated machine-to-machine vendor access has not been enabled. Production service tokens, RBAC, rate limits and vendor adapter setup are separate deployment work.

## Data contract

Top level: name, demo (true for synthetic data), assets, risks, actions.

Assets: unique ID, name, business unit, owner, service, criticality 1–5, valid dependency IDs.

Risks: unique ID, valid asset ID, name, category, source, finding, base annual frequency 0–10, CVSS 0–10, threat multiplier 0–3, control effectiveness 0–1, nonnegative INR mean losses (downtime, breach, penalty, reputation), lognormal sigma 0–1.5, ISO observation timestamp.

Actions: unique ID, name, description, first-year cost, effects mapping risk IDs to reductions 0–1, estimated delivery days, owner, framework labels.

Bounds: 100 assets, 100 scenarios, 12 interventions, 500 KB. Financial values up to ₹1 trillion. Unknown references and duplicate IDs are rejected. No secrets belong in this data.

## Model assumptions and boundaries

The incident rate is a transparent analyst-calibrated heuristic, not a trained incident prediction model. CVSS does not equal incident probability. Monetary losses and control reductions are supplied assumptions. Dependencies are displayed but do not cascade losses. Events are independent; correlated incidents may have heavier loss tails. Scenario costs are first-year totals. Delay is a prorated timing assumption, not a threat-growth forecast. Naive Bayes classifies user intent only; its training corpus is small, and unsupported requests fall back.

The budget solver is exact only for the supplied interventions and multiplicative model. The chart samples optimum portfolios at ₹20 lakh budget increments. The scoped planner retains full intervention costs even if benefits are scoped to a single unit; shared controls still incur their full stated cost.

VaR95 is a percentile of annual realized loss, not an EAL confidence interval. Framework coverage is deliberately not presented as a compliance score. RBI and SEBI mappings are thematic and require applicability review; ISO control mappings require validation against licensed requirements. Reports are review artifacts, not regulator-ready filings.

## Production integration work

Actual SIEM/IAM/EDR/CSPM/scanner connectors need approved API access and adapters into this contract. Add organization-specific roles, service credentials, ingestion deduplication, source health monitoring, scheduled collectors, retention policy, model calibration/backtesting, correlation modeling and complete compliance catalogs before enterprise operational use. The delivered interface labels sample data and these limits. External LLM generation is not configured; the included local intent model works without it.

## Demonstration flow

1. Open the financial overview and inspect the largest driver.
2. Open a risk to show its telemetry, likelihood, cost components and treatment options.
3. In Scenario lab select privileged MFA; compare loss, first-year ROSI and a 30-day delay.
4. In Investment optimizer choose ₹1 crore, apply the exact optimal portfolio, name and save it.
5. Ask the assistant which investments fit the current budget.
6. Show framework evidence links, import the sample contract, and export a board report.
