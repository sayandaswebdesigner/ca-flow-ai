// Free email sender — Resend if RESEND_API_KEY exists, else mock (logs + returns code in dev)
export async function sendVerificationEmail(email: string, code: string): Promise<{ sent: boolean; mocked: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'LedgerFlow <onboarding@resend.dev>';
  if (!key) {
    console.log(`[email:mock] Verification code for ${email}: ${code}`);
    return { sent: true, mocked: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Your LedgerFlow verification code is ${code}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px"><h2 style="margin:0 0 8px">Verify your email</h2><p>Your code is <strong style="font-size:28px;letter-spacing:4px">${code}</strong></p><p style="color:#64748b;font-size:13px">Expires in 10 minutes. If you didn't request this, ignore.</p></div>`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, mocked: false, error: data.message || 'Resend failed' };
    return { sent: true, mocked: false };
  } catch (e: any) {
    return { sent: false, mocked: false, error: e.message };
  }
}
