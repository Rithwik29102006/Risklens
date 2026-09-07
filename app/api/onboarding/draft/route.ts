import { database, sameOrigin } from '@/db/raw';

export async function GET(req: Request) {
  try {
    const db = database();
    const row = await db
      .prepare('SELECT id, org_name, step, state_json, created_at, updated_at FROM onboarding_drafts ORDER BY id DESC LIMIT 1')
      .first() as any;

    if (!row) {
      return Response.json({ draft: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json({
      draft: {
        id: row.id,
        orgName: row.org_name,
        step: row.step,
        state: JSON.parse(row.state_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Failed to get onboarding draft', e);
    return Response.json({ error: 'Unable to retrieve draft' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Origin not allowed' }, { status: 403 });

  try {
    const raw = await req.text();
    if (raw.length > 500000) return Response.json({ error: 'Payload exceeds limit' }, { status: 413 });

    const body = JSON.parse(raw);
    const orgName = String(body.orgName || 'Unnamed Org').slice(0, 150);
    const step = Number.isInteger(body.step) ? body.step : 1;
    const stateJson = JSON.stringify(body.state || {});
    const now = new Date().toISOString();

    const db = database();

    // Upsert or insert new draft
    const existing = await db
      .prepare('SELECT id FROM onboarding_drafts ORDER BY id DESC LIMIT 1')
      .first() as any;

    if (existing) {
      await db
        .prepare('UPDATE onboarding_drafts SET org_name = ?, step = ?, state_json = ?, updated_at = ? WHERE id = ?')
        .bind(orgName, step, stateJson, now, existing.id)
        .run();
    } else {
      await db
        .prepare('INSERT INTO onboarding_drafts (org_name, step, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(orgName, step, stateJson, now, now)
        .run();
    }

    return Response.json({ ok: true, savedAt: now });
  } catch (e) {
    console.error('Failed to save onboarding draft', e);
    return Response.json({ error: 'Unable to save draft. Please retry.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Origin not allowed' }, { status: 403 });

  try {
    const db = database();
    await db.prepare('DELETE FROM onboarding_drafts').run();
    return Response.json({ ok: true });
  } catch (e) {
    console.error('Failed to clear onboarding draft', e);
    return Response.json({ error: 'Unable to clear draft' }, { status: 500 });
  }
}
