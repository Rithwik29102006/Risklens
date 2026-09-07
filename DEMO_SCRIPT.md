# RiskLens — 5-Minute Judge Demo Script

**SIH Problem Statement 26105** · AI-Powered Continuous Cyber Risk Quantification and Investment Optimization  
**Team:** Meridian | **App URL:** http://localhost:5173

---

## 5-Minute Demo Timeline Overview

```
0:00 ── Business-First Guided Onboarding (Step A → Step H)
1:15 ── Review Assumptions & Mathematical Traceability
2:00 ── Personalized Executive Dashboard (EAL, VaR95, Loss Curve)
3:00 ── Scenario Lab & 30-Day Delay Modeling
3:45 ── Investment Optimizer (Budget-Constrained Portfolio & ROSI)
4:30 ── Grounded AI Risk Assistant (Zero Hallucinations) & Sample Isolation
5:00 ── Wrap-up & Q&A
```

---

## Minute 1 (0:00 – 1:15): The Business-First Journey

> **What judges see:** A new user is greeted with *"Tell Us About Your Business"*, NOT another company's sample data.

### Speaking Points
*"Judges, most cyber risk tools drop users into a dashboard filled with another company's synthetic data or demand complex JSON file imports.*

*RiskLens reimagines this with an 8-step business-first journey. We ask straightforward business questions: organization size, annual revenue, core digital services, data sensitivity, and current security posture.*

*Notice how services are registered in plain business terms—like 'Customer Web Portal' and 'Transaction Database'—with internal IDs generated automatically. We don't ask users for API keys or secrets."*

### Click Actions
1. Show **Step A (Business Setup)**: Point out Organization Name (`Acme FinTech Solutions`), Annual Revenue (`₹50 Cr`), and First-Year Budget (`₹1.5 Cr`).
2. Click **Next** through **Step B (Services)** and **Step C (Data & Consequences)**: Highlight how DPDP Act 2023 and CERT-In reporting obligations are identified based on sensitive customer records.
3. In **Step D (Security Posture)**: Note the clean *Yes / Partially / No / Unknown* options. Explain that *"Unknown"* doesn't become zero; it becomes an explicit, reviewable provisional assumption.
4. In **Step E (Financial Impact)**: Show how downtime costs and data breach recovery are kept on separate axes to prevent double-counting.

---

## Minute 2 (1:15 – 2:00): Review Assumptions & Calculate

> **What judges see:** Step H audit breakdown distinguishing User-Provided, Derived, Provisional, and Missing inputs.

### Speaking Points
*"Before calculating anything, RiskLens audits its own inputs. We distinguish what was directly provided by the user, what was derived, and what remains provisional.*

*Our core mathematical formula is transparent:*  
**Expected Annual Loss (EAL) = Annual Incident Rate (λ) × Mean Loss per Incident.**  
*Annual incident likelihood is Poisson probability: $1 - e^{-\lambda}$. We do not pretend questionnaire answers are live telemetry; self-reported controls are clearly labeled.*

*Let's click 'Generate My Risk Assessment'."*

### Click Actions
1. Review the audit cards in **Step H**.
2. Click the teal button: **"Generate My Risk Assessment"**.
3. Watch the Personalized Dashboard immediately load with `Acme FinTech Solutions workspace` and `PERSONALIZED ASSESSMENT` badge.

---

## Minute 3 (2:00 – 3:00): Personalized Executive Dashboard

> **What judges see:** Board-ready financial metrics computed live from the financial engine.

### Speaking Points
*"RiskLens has now personalized the entire platform for Acme FinTech Solutions:*
- *Expected Annual Loss: **₹5.96 Cr***
- *95th-Percentile Loss (VaR95): computed across 5,000 Monte Carlo trials.*
- *Achievable Risk Reduction: **₹4.00 Cr** within our ₹1.5 Cr budget.*

*In the Risk Register, our scenarios are ranked by annual financial loss, not arbitrary high/medium/low colors. Let's inspect our top risk driver."*

### Click Actions
1. Point to the 4 headline metric cards on the **Overview** page.
2. Click on **Risk Register** in the sidebar.
3. Click the top-ranked risk (*Unauthorized exposure or exfiltration of customer PII*).
4. The side drawer opens: show the observed finding, Poisson likelihood inputs, and per-incident loss breakdown (Downtime vs Breach vs Penalties vs Reputation).

---

## Minute 4 (3:00 – 4:00): Scenario Lab & Investment Optimizer

> **What judges see:** What-if modeling, 30-day implementation delay cost, and budget optimization with compounding control overlap.

### Speaking Points
*"Security leaders need to justify investments before spending money. In the Scenario Lab, we can model the financial impact of specific controls.*

*What if our procurement or deployment is delayed by 30 days? By moving the delay slider, RiskLens computes the exact financial penalty: 30 days at full baseline exposure plus 335 days of mitigated exposure.*

*In the Investment Optimizer, we evaluate all $2^N$ possible control portfolios. Crucially, overlapping controls compound multiplicatively—they never add linearly. A 75% MFA control and a 50% segmentation control compound to 87.5% reduction, preventing double-counted benefits.*

*Clicking 'Apply optimal portfolio' immediately finds the highest ROSI combination within our ₹1.5 Cr budget."*

### Click Actions
1. Navigate to **Scenario Lab**: move the **Implementation delay** slider to 30 days and show the residual EAL update.
2. Navigate to **Investment Optimizer**: click **"Apply optimal portfolio"**.
3. Review the selected controls, total spend (e.g. ₹88 L), and avoided annual loss (₹4.0 Cr).

---

## Minute 5 (4:00 – 5:00): Grounded AI Assistant & Sample Isolation

> **What judges see:** A local intent model answering strategic executive questions with zero hallucinations, plus isolated sample enterprise exploration.

### Speaking Points
*"Finally, executive decision-makers can query the assessment in plain language. RiskLens uses a local Naive Bayes intent classifier—no external cloud LLM, no data leakage, and zero hallucinations.*

*Let's ask: 'Why is this my largest financial risk?'*  
*The assistant identifies the exact scenario, the self-reported findings that caused it, and breaks down the business impact.*

*Let's ask: 'How would better backups affect my exposure?'*  
*It models the specific loss avoided on ransomware recovery.*

*And if a judge or evaluator wants to explore our sample benchmark enterprise, clicking 'Explore Sample Enterprise' switches to a strictly isolated, read-only mode for Meridian Financial with a prominent banner, ensuring real business data is never overwritten."*

### Click Actions
1. Navigate to **Risk assistant**.
2. Click **"Why is this my largest financial risk?"** → View grounded answer citing exact numbers and scenario findings.
3. Click **"How would better backups affect my exposure?"** → View backup recovery impact.
4. Click **"Explore Sample Enterprise"** in top bar → Show amber synthetic banner and click **"Return to Your Business"** to demonstrate clean state isolation.

---

## Key Questions Judges Might Ask (Q&A Preparation)

### Q1: "Where do the probabilities (λ) come from if you only have a questionnaire?"
**Answer:** *"We are completely transparent that questionnaire answers are self-reported calibration heuristics, not live automated telemetry. The base frequency is established from asset exposure (internet-facing vs internal) and industry threat context, discounted by the self-reported control effectiveness. Scenarios with unverified controls are explicitly tagged as 'Provisional Assumptions' until validated."*

### Q2: "How do you avoid double-counting overlapping controls?"
**Answer:** *"In `lib/risk.ts`, controls compound multiplicatively:  
$\text{Residual Loss} = \text{Baseline} \times \prod_{i=1}^{k} (1 - \text{reduction}_i)$.  
If Control A reduces risk by 70% and Control B by 50%, the residual risk is $(1 - 0.70) \times (1 - 0.50) = 15\%$, representing an 85% combined reduction—never $70\% + 50\% = 120\%$."*

### Q3: "How is downtime loss calculated without inventing fake figures?"
**Answer:** *"We offer two methods: (1) direct analyst estimate of cost per outage hour, or (2) operating revenue share: annual revenue divided by operating hours times the service revenue share. We strictly forbid dividing total annual revenue by 8,760 universally."*
