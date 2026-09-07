import { NextRequest, NextResponse } from 'next/server';

const HOLDER: Record<string, string> = {
  C: 'Company', P: 'Individual (Person)', H: 'HUF', F: 'Partnership Firm',
  A: 'Association of Persons (AOP)', T: 'Trust', B: 'Body of Individuals', L: 'Local Authority',
  J: 'Artificial Juridical Person', G: 'Government Agency',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = String(body.pan || '').toUpperCase().replace(/[\s-]/g, '').trim();
    if (!raw) return NextResponse.json({ verified: false, status: 'not_verified', reason: 'PAN required' }, { status: 400 });
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(raw))
      return NextResponse.json({
        verified: false, status: 'not_verified', pan: raw,
        reason: 'Format must be 5 letters + 4 digits + 1 letter (e.g. AABCU1234F)',
      });

    const holderCode = raw[3];
    const holderType = HOLDER[holderCode];
    if (!holderType)
      return NextResponse.json({ verified: false, status: 'not_verified', pan: raw, reason: `4th char ${holderCode} is not a valid holder type` });

    try { const { logActivity } = await import('@/lib/activity'); await logActivity(request as any, 'verify.pan', { entity_type: 'pan', entity_id: raw, entity_name: raw, details: { holderType } }); } catch {}
    return NextResponse.json({
      verified: true,
      status: 'verified',
      pan: raw,
      details: {
        holderType,
        holderCode,
        surnameInitial: raw[4],
        serial: raw.slice(5, 9),
      },
      verificationMode: 'structural_offline',
      note: 'Structural verification (format + holder-type) passed. Name/DOB match against Income-Tax database needs NSDL/UTIITSL API access — portal has no public lookup.',
    });
  } catch (e: any) {
    return NextResponse.json({ verified: false, status: 'not_verified', reason: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const pan = new URL(request.url).searchParams.get('pan') || '';
  return POST({ json: async () => ({ pan }) } as any);
}
