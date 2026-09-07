import { NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDbAsync } from './db';
import { getRequestTenant, getSessionUser, getTokenFromRequest } from './auth';

export type ActivityAction =
  | 'user.signup'
  | 'user.login'
  | 'user.logout'
  | 'client.created'
  | 'client.deleted'
  | 'document.uploaded'
  | 'document.deleted'
  | 'reconciliation.created'
  | 'reconciliation.run'
  | 'reconciliation.completed'
  | 'transaction.updated'
  | 'review.created'
  | 'plugin.toggled'
  | 'verify.gst'
  | 'verify.pan'
  | 'whatsapp.sent'
  | 'email.sent'
  | 'export.excel'
  | 'export.tally';

export async function logActivity(
  request: NextRequest,
  action: ActivityAction,
  opts: { entity_type?: string; entity_id?: string; entity_name?: string; details?: any } = {}
) {
  try {
    const db = await getDbAsync();
    const tenantId = await getRequestTenant(request);
    const token = getTokenFromRequest(request);
    const user = await getSessionUser(token);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
    const ua = request.headers.get('user-agent') || null;
    await db
      .prepare(
        `INSERT INTO activities (id, tenant_id, user_id, action, entity_type, entity_id, entity_name, details, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        uuid(),
        tenantId,
        user?.id || null,
        action,
        opts.entity_type || null,
        opts.entity_id || null,
        opts.entity_name ? String(opts.entity_name).slice(0, 200) : null,
        opts.details ? JSON.stringify(opts.details).slice(0, 4000) : null,
        ip,
        ua
      );
  } catch (e) {
    console.warn('[activity] log failed', e);
  }
}

// Helper to fetch activities for a tenant (used by /api/activities)
export async function fetchActivities(tenantId: string, limit = 100, offset = 0, action?: string) {
  const db = await getDbAsync();
  let q = 'SELECT * FROM activities WHERE tenant_id = ?';
  const params: any[] = [tenantId];
  if (action) {
    q += ' AND action = ?';
    params.push(action);
  }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const rows = await db.prepare(q).all(...params);
  const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM activities WHERE tenant_id = ?${action ? ' AND action = ?' : ''}`).get(...(action ? [tenantId, action] : [tenantId])) as any;
  return { activities: rows, total: totalRow?.c || 0 };
}
