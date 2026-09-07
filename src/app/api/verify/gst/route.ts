import { NextRequest, NextResponse } from 'next/server';

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh (old)',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};
const PAN_HOLDER: Record<string, string> = {
  C: 'Company', P: 'Individual (Person)', H: 'HUF', F: 'Partnership Firm',
  A: 'Association of Persons (AOP)', T: 'Trust', B: 'Body of Individuals', L: 'Local Authority',
  J: 'Artificial Juridical Person', G: 'Government Agency',
};

function gstCheckDigit(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = CHARSET.indexOf(first14[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const prod = val * factor;
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  const check = (36 - (sum % 36)) % 36;
  return CHARSET[check];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = String(body.gstin || '').toUpperCase().replace(/[\s-]/g, '').trim();
    if (!raw) return NextResponse.json({ verified: false, status: 'not_verified', reason: 'GSTIN required' }, { status: 400 });
    if (raw.length !== 15)
      return NextResponse.json({ verified: false, status: 'not_verified', gstin: raw, reason: `Must be 15 characters (got ${raw.length})` });

    const stateCode = raw.slice(0, 2);
    const panPart = raw.slice(2, 12);
    const entityCode = raw[12];
    const defaultZ = raw[13];
    const checkChar = raw[14];

    if (!/^\d{2}$/.test(stateCode) || !STATE_CODES[stateCode])
      return NextResponse.json({ verified: false, status: 'not_verified', gstin: raw, reason: `Invalid state code ${stateCode}` });
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panPart))
      return NextResponse.json({ verified: false, status: 'not_verified', gstin: raw, reason: 'Chars 3-12 must be a valid PAN format' });
    if (!/^[1-9A-Z]$/.test(entityCode))
      return NextResponse.json({ verified: false, status: 'not_verified', gstin: raw, reason: '13th char (entity code) invalid' });
    if (defaultZ !== 'Z')
      return NextResponse.json({ verified: false, status: 'not_verified', gstin: raw, reason: '14th char must be Z' });

    const expected = gstCheckDigit(raw.slice(0, 14));
    if (expected !== checkChar)
      return NextResponse.json({ verified: false, status: 'not_verified', gstin: raw, reason: `Checksum mismatch: expected ${expected}, got ${checkChar}. Typo or fake GSTIN.` });

    // Optional live GSTN lookup if a GSP key is configured (portal itself is captcha-protected, so no silent scrape)
    let live: any = null;
    if (process.env.GST_API_URL && process.env.GST_API_KEY) {
      try {
        const r = await fetch(`${process.env.GST_API_URL}?gstin=${raw}`, {
          headers: { Authorization: `Bearer ${process.env.GST_API_KEY}` },
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) live = await r.json();
      } catch { live = null; }
    }

    // log activity (best effort, tenant may be anon)
    try { const { logActivity } = await import('@/lib/activity'); await logActivity(request as any, 'verify.gst', { entity_type: 'gstin', entity_id: raw, entity_name: raw, details: { verified: true, state: STATE_CODES[stateCode], pan: panPart } }); } catch {}
    return NextResponse.json({
      verified: true,
      status: 'verified',
      gstin: raw,
      details: {
        state: STATE_CODES[stateCode],
        stateCode,
        pan: panPart,
        holderType: PAN_HOLDER[panPart[3]] || 'Unknown',
        entityCode,
        registrationType: /^[1-9]$/.test(entityCode) ? `Registration #${entityCode} in state` : 'Special entity',
      },
      verificationMode: live ? 'live_gstn' : 'structural_offline',
      note: live
        ? 'Live GSTN status fetched via configured GSP.'
        : 'Structural verification (state + PAN + checksum) passed. GST portal search is captcha-protected, so live Active/Cancelled status needs a GSP API key (set GST_API_URL + GST_API_KEY).',
      live,
    });
  } catch (e: any) {
    return NextResponse.json({ verified: false, status: 'not_verified', reason: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const gstin = new URL(request.url).searchParams.get('gstin') || '';
  return POST({ json: async () => ({ gstin }) } as any);
}
