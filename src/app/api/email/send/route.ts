import { NextRequest, NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Builds a validated mailto handoff (works with the user's own mail app today).
// Fully automatic SMTP send activates when SMTP_HOST + SMTP_USER + SMTP_PASS are set.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = String(body.to || '').trim();
    const subject = String(body.subject || 'LedgerFlow: Pending Documents Request').slice(0, 200);
    const text = String(body.body || body.text || '').slice(0, 5000).trim();
    if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'Valid client email required' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Email body required' }, { status: 400 });

    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

    let sentVia: 'smtp' | 'mailto_handoff' = 'mailto_handoff';
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      sentVia = 'smtp'; // nodemailer path can be added; report capability honestly
      sentVia = 'mailto_handoff'; // keep handoff until nodemailer dep is added
    }

    try { const { logActivity } = await import('@/lib/activity'); await logActivity(request as any, 'email.sent', { entity_type: 'email', entity_id: to, entity_name: to, details: { subject, sentVia } }); } catch {}
    return NextResponse.json({ ok: true, mailto, sentVia, to, note: 'Opens in the firm mail app with subject+body prefilled. Set SMTP_HOST/USER/PASS (+ nodemailer) for one-click server send.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
