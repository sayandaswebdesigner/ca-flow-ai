import { NextRequest, NextResponse } from 'next/server';

function normalize(phone: string): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const n = digits.length === 10 ? `91${digits}` : digits;
  return n.length >= 10 && n.length <= 13 ? n : null;
}

// Logs the message server-side and returns a wa.me deep link.
// Direct device send needs Meta WhatsApp Business API (WHATSAPP_API_KEY); without it we hand back the link.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = normalize(body.to || body.phone || '');
    const message = String(body.message || '').slice(0, 2000).trim();
    if (!to) return NextResponse.json({ error: 'Valid client phone required' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const waLink = `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
    let sentVia: 'meta_api' | 'deep_link' = 'deep_link';
    let metaId: string | null = null;

    if (process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_ID) {
      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }),
          signal: AbortSignal.timeout(10000),
        });
        if (r.ok) {
          const d = await r.json();
          metaId = d.messages?.[0]?.id || null;
          sentVia = 'meta_api';
        }
      } catch { /* fall through to deep_link */ }
    }

    return NextResponse.json({ ok: true, waLink, sentVia, metaId, to, note: sentVia === 'deep_link' ? 'Opened via wa.me — set WHATSAPP_API_KEY + WHATSAPP_PHONE_ID for fully automatic send.' : 'Sent via Meta WhatsApp Business API.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
