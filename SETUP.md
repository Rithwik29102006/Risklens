# RiskLens — Local Setup Guide

**SIH Problem Statement 26105** · AI-Powered Continuous Cyber Risk Quantification and Investment Optimization

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | ≥ 22.13.0 |
| npm | ≥ 10 (bundled with Node 22) |
| sqlite3 CLI | any (for local D1 DB init) |

---

## First-time setup (3 commands)

```bash
# 1. Install dependencies (preserves exact lockfile)
npm ci

# 2. Start the dev server — this initializes Wrangler Miniflare & local D1 SQLite
npm run dev
# App URL: http://localhost:5173

# 3. In a separate terminal, apply all database migrations (assessments, plans, drafts)
npm run db:init:local
```

---

## Development workflow

```bash
# Start dev server (Vite + Cloudflare Workers via Wrangler Miniflare)
npm run dev

# Run automated tests (12 tests: financial engine, Poisson/lognormal Monte Carlo, intent model, onboarding mapping)
npm test

# TypeScript type check (zero errors)
npx tsc --noEmit

# Apply schema migrations to local SQLite
npm run db:init:local
```

---

## Database schema & storage

| Table | Purpose |
|-------|---------|
| `assessments` | Personalized assessments & snapshot history (`id`, `payload`, `eal`, `created_at`, `kind`) |
| `plans` | Saved investment portfolios with full assessment snapshot & budget parameters |
| `onboarding_drafts` | Draft progress persistence for multi-step onboarding wizard (`org_name`, `step`, `state_json`) |

---

## Testing & verification

```bash
npm test
```
Verifies:
- Statistical Poisson incident frequency × mean loss severity
- Multiplicative overlapping control compounding: `residual = baseline × Π(1 − reduction)`
- 5,000-trial seeded Monte Carlo loss distribution convergence
- Budget-constrained exact portfolio search (2^N evaluations)
- 30-day implementation delay modeling
- Naive Bayes intent classification for decision support questions
- Onboarding questionnaire to `Dataset` mapping and anti-double-counting invariants
