import { database, sameOrigin } from '@/db/raw';
import { datasetSchema } from '@/lib/validation';
import { demo } from '@/lib/demo';
import { total } from '@/lib/risk';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    const db = database();

    // Fetch latest draft if any
    const draftRow = await db
      .prepare('SELECT org_name, step, state_json, updated_at FROM onboarding_drafts ORDER BY id DESC LIMIT 1')
      .first() as any;
    const draft = draftRow
      ? { orgName: draftRow.org_name, step: draftRow.step, state: JSON.parse(draftRow.state_json), updatedAt: draftRow.updated_at }
      : null;

    // Fetch history and plans
    const h = await db.prepare('SELECT id, eal, created_at AS createdAt, kind FROM assessments ORDER BY id DESC LIMIT 60').all();
    const p = await db.prepare('SELECT payload, created_at AS createdAt FROM plans ORDER BY id DESC LIMIT 20').all();

    if (mode === 'demo') {
      return Response.json({
        hasAssessment: true,
        isDemo: true,
        dataset: demo,
        updatedAt: null,
        draft,
        history: h.results.reverse(),
        plans: p.results.map((r: any) => ({ ...JSON.parse(r.payload), createdAt: r.createdAt })),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Try finding the latest assessment (prioritising 'personalized')
    const row = await db
      .prepare("SELECT payload, created_at, kind FROM assessments ORDER BY id DESC LIMIT 1")
      .first() as any;

    if (!row) {
      return Response.json({
        hasAssessment: false,
        dataset: null,
        updatedAt: null,
        draft,
        history: [],
        plans: [],
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(String(row.payload));
    } catch {
      parsedPayload = null;
    }

    const dataset = parsedPayload?.dataset ? parsedPayload.dataset : parsedPayload;
    const metadata = parsedPayload?.metadata || null;
    const profile = parsedPayload?.profile || null;
    const traceableExplanations = parsedPayload?.traceableExplanations || [];

    return Response.json({
      hasAssessment: true,
      isDemo: row.kind === 'demo',
      dataset,
      metadata,
      profile,
      traceableExplanations,
      updatedAt: row.created_at || null,
      draft,
      history: h.results.reverse(),
      plans: p.results.map((r: any) => ({ ...JSON.parse(r.payload), createdAt: r.createdAt })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Load assessment failed', e);
    return Response.json({ error: 'Unable to load saved assessments. Please retry.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Origin not allowed' }, { status: 403 });

  try {
    const raw = await req.text();
    if (raw.length > 500000) return Response.json({ error: 'Payload exceeds 500 KB' }, { status: 413 });

    const b = JSON.parse(raw);
    const db = database();
    const now = new Date().toISOString();

    if (b.kind === 'plan') {
      const d = datasetSchema.parse(b.dataset);
      if (
        !Array.isArray(b.selected) ||
        b.selected.some((id: unknown) => typeof id !== 'string' || !d.actions.some(a => a.id === id)) ||
        !Number.isFinite(b.budget) ||
        b.budget < 0 ||
        !Number.isInteger(b.delay) ||
        b.delay < 0 ||
        b.delay > 365
      ) {
        throw new Error('Invalid plan');
      }

      const selected = [...new Set(b.selected)] as string[];
      const cost = d.actions.filter(a => selected.includes(a.id)).reduce((s, a) => s + a.cost, 0);
      if (cost > b.budget) throw new Error('Invalid plan: cost exceeds budget');

      const plan = {
        name: String(b.name || 'Investment plan').slice(0, 100),
        selected,
        budget: b.budget,
        delay: b.delay,
        cost,
        base: total(d),
        residual: total(d, selected, b.delay),
        dataset: d,
      };

      await db
        .prepare('INSERT INTO plans (payload, created_at) VALUES (?, ?)')
        .bind(JSON.stringify(plan), now)
        .run();
    } else {
      // Assessment saving (personalized, demo, or snapshot)
      const d = datasetSchema.parse(b.dataset);
      const ealVal = total(d);

      // Pack payload with metadata if provided
      const fullPayload = {
        dataset: d,
        profile: b.profile || null,
        metadata: b.metadata || null,
        traceableExplanations: b.traceableExplanations || [],
        version: '2.0',
      };

      const kind = b.kind === 'demo' ? 'demo' : (b.kind === 'personalized' ? 'personalized' : (d.demo ? 'demo' : 'import'));

      await db
        .prepare('INSERT INTO assessments (payload, eal, created_at, kind) VALUES (?, ?, ?, ?)')
        .bind(JSON.stringify(fullPayload), ealVal, now, kind)
        .run();
    }

    return Response.json({ ok: true, createdAt: now });
  } catch (e: any) {
    if (e instanceof SyntaxError || e?.name === 'ZodError' || e?.message?.includes('Invalid')) {
      return Response.json({ error: `Validation error: ${e.message || 'Check inputs'}` }, { status: 400 });
    }
    console.error('Save failed', e);
    return Response.json({ error: 'Unable to save. Your inputs have been preserved; please retry.' }, { status: 503 });
  }
}
