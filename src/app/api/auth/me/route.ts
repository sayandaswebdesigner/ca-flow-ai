import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getTokenFromRequest, isAdminEmail } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(getTokenFromRequest(request));
  if (!user) return NextResponse.json({ user: null, isAdmin: false }, { status: 200 });
  return NextResponse.json({ user, isAdmin: isAdminEmail(user.email) });
}
