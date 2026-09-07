import { NextRequest, NextResponse } from 'next/server';
import { getRequestTenant } from '@/lib/auth';
import { fetchActivities } from '@/lib/activity';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getRequestTenant(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action') || undefined;
    const { activities, total } = await fetchActivities(tenantId, limit, offset, action);
    return NextResponse.json({ activities, total, limit, offset });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
