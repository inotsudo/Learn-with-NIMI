// Sends transactional emails via SendGrid.
// Requires SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in environment.

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM   = process.env.SENDGRID_FROM_EMAIL ?? "support@nimipiko.com";
const SENDGRID_URL    = "https://api.sendgrid.com/v3/mail/send";

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!SENDGRID_API_KEY) return;
  try {
    await fetch(SENDGRID_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: SENDGRID_FROM, name: "NIMIPIKO" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
  } catch (err) {
    console.error("[email] SendGrid send failed:", err);
  }
}


// ── Shared branded wrapper for auth emails ───────────────────────────────────
function authBase(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <div style="display:inline-block;background:#22c55e;border-radius:16px;padding:12px 24px;">
      <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">🌿 NIMIPIKO</span>
    </div>
  </td></tr>
  <tr><td style="background:#ffffff;border-radius:20px;padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">${body}</td></tr>
  <tr><td align="center" style="padding-top:24px;">
    <p style="margin:0;font-size:12px;color:#6b7280;">© 2025 NIMIPIKO · <a href="https://nimipiko.com" style="color:#22c55e;text-decoration:none;">nimipiko.com</a></p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Questions? <a href="mailto:support@nimipiko.com" style="color:#22c55e;text-decoration:none;">support@nimipiko.com</a></p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 28px;">
    <a href="${href}" style="display:inline-block;background:#22c55e;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:14px;letter-spacing:0.2px;">${label}</a>
  </td></tr></table>`;
}

// ── Auth: Confirm signup ─────────────────────────────────────────────────────
export async function sendAuthConfirmSignup(to: string, confirmUrl: string): Promise<void> {
  await send(to, "Confirm your NIMIPIKO account", authBase("Confirm your NIMIPIKO account", `
    <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#14532d;text-align:center;">Welcome aboard! 🎉</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">You're one step away from unlocking a world of stories, missions, and learning adventures for your child.</p>
    ${ctaButton(confirmUrl, "Confirm my account")}
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">This link expires in 24 hours. If you didn't create a NIMIPIKO account, you can safely ignore this email.</p>
  `));
}

// ── Auth: Reset password ─────────────────────────────────────────────────────
export async function sendAuthResetPassword(to: string, resetUrl: string): Promise<void> {
  await send(to, "Reset your NIMIPIKO password", authBase("Reset your NIMIPIKO password", `
    <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#14532d;text-align:center;">Password reset 🔐</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">We received a request to reset the password for your NIMIPIKO account. Click the button below to choose a new one.</p>
    ${ctaButton(resetUrl, "Reset my password")}
    <div style="background:#fef9c3;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.6;">⚠️ This link expires in <strong>1 hour</strong>. If you didn't request this, your account is safe — just ignore this email.</p>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">For security, this link can only be used once.</p>
  `));
}

// ── Auth: Magic link ─────────────────────────────────────────────────────────
export async function sendAuthMagicLink(to: string, magicUrl: string): Promise<void> {
  await send(to, "Your NIMIPIKO magic link", authBase("Your NIMIPIKO magic link", `
    <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#14532d;text-align:center;">Your magic link ✨</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">Click the button below to sign in to your NIMIPIKO account instantly — no password needed.</p>
    ${ctaButton(magicUrl, "Sign in to NIMIPIKO")}
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore it.</p>
  `));
}

// ── Auth: Change email ───────────────────────────────────────────────────────
export async function sendAuthChangeEmail(to: string, confirmUrl: string): Promise<void> {
  await send(to, "Confirm your new email — NIMIPIKO", authBase("Confirm your new email — NIMIPIKO", `
    <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#14532d;text-align:center;">Confirm your new email 📧</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">You requested to update the email address on your NIMIPIKO account. Click below to confirm and apply the change.</p>
    ${ctaButton(confirmUrl, "Confirm new email")}
    <div style="background:#fef9c3;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.6;">⚠️ If you did not request this change, contact us immediately at <a href="mailto:support@nimipiko.com" style="color:#854d0e;">support@nimipiko.com</a></p>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">This link expires in 24 hours.</p>
  `));
}

// ── Auth: Invite user ────────────────────────────────────────────────────────
export async function sendAuthInvite(to: string, inviteUrl: string): Promise<void> {
  await send(to, "You've been invited to NIMIPIKO", authBase("You've been invited to NIMIPIKO", `
    <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#14532d;text-align:center;">You're invited! 🌟</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">You've been invited to join NIMIPIKO — a joyful learning platform featuring stories, missions, and language adventures for children.</p>
    ${ctaButton(inviteUrl, "Accept invitation")}
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">This invitation expires in 24 hours. If you weren't expecting this, you can safely ignore it.</p>
  `));
}

// ── Welcome email sent after signup ─────────────────────────────────────────
export async function sendWelcomeEmail(to: string, parentName: string): Promise<void> {
  await send(
    to,
    "Welcome to NIMIPIKO — your 7-day free trial has started! 🌿",
    authBase(
      "Welcome to NIMIPIKO",
      `<p style="margin:0 0 6px;font-size:26px;font-weight:900;color:#14532d;text-align:center;">Welcome, ${parentName}! 🎉</p>
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">Your child's learning adventure starts now</p>
      <div style="background:#ecfdf5;border:2px solid #6ee7b7;border-radius:14px;padding:18px 20px;margin-bottom:22px">
        <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#065f46;">🎁 Your 7-day free trial is active</p>
        <p style="margin:0;font-size:14px;color:#047857;line-height:1.6;">For the next 7 days you have <strong>full Club access</strong> — every story, every language, unlimited Nimi AI chats, and certificate downloads. No credit card needed.</p>
      </div>
      <p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.6;">Here's what to do first:</p>
      <ol style="margin:0 0 20px;font-size:14px;line-height:1.9;color:#374151;padding-left:20px">
        <li>Create your child's profile — choose their name, age &amp; language</li>
        <li>Open any story and follow along together</li>
        <li>Chat with Nimi, earn stars, and download your first certificate</li>
      </ol>
      ${ctaButton("https://nimipiko.com/stories", "🚀 Start exploring")}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">After 7 days you'll move to the free plan (3 stories, 10 Nimi chats/day) unless you subscribe. You can upgrade any time from <a href="https://nimipiko.com/pricing" style="color:#22c55e">Pricing</a>.</p>`,
    ),
  );
}

// ── Trial ending soon (sent 3 days and 1 day before expiry) ─────────────────
export async function sendTrialEndingSoon(opts: {
  to: string;
  parentName: string;
  daysLeft: number;
  expiresOn: string; // ISO date string
}): Promise<void> {
  const { to, parentName, daysLeft, expiresOn } = opts;
  const expiryDate = new Date(expiresOn).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const urgency = daysLeft <= 1;

  await send(
    to,
    urgency
      ? `⚠️ Your NIMIPIKO free trial ends tomorrow`
      : `Your NIMIPIKO free trial ends in ${daysLeft} days`,
    authBase(
      "Trial ending soon",
      `<p style="margin:0 0 6px;font-size:${urgency ? "24px" : "22px"};font-weight:900;color:${urgency ? "#991b1b" : "#92400e"};text-align:center;">${urgency ? "⚠️ Last chance!" : "⏳ Trial ending soon"}</p>
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">Hi ${parentName} — your free trial expires on <strong>${expiryDate}</strong>.</p>
      <div style="background:${urgency ? "#fef2f2" : "#fffbeb"};border:2px solid ${urgency ? "#fca5a5" : "#fcd34d"};border-radius:14px;padding:18px 20px;margin-bottom:22px">
        <p style="margin:0 0 8px;font-size:14px;font-weight:800;color:${urgency ? "#991b1b" : "#92400e"};">After your trial, you'll move to the free plan:</p>
        <ul style="margin:0;font-size:14px;color:${urgency ? "#7f1d1d" : "#78350f"};line-height:1.8;padding-left:18px">
          <li>3 stories (instead of all ${urgency ? "stories" : "of them"})</li>
          <li>10 Nimi AI chats per day (instead of unlimited)</li>
          <li>Certificate downloads paused</li>
        </ul>
      </div>
      <p style="margin:0 0 4px;font-size:15px;color:#374151;text-align:center;">Subscribe now to keep full access — your child's progress is never lost.</p>
      ${ctaButton("https://nimipiko.com/pricing", "👑 Keep full access →")}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">If you choose not to subscribe, your account stays open on the free plan forever.</p>`,
    ),
  );
}

// ── Trial expired (sent the day the trial transitions to expired) ─────────────
export async function sendTrialExpired(opts: {
  to: string;
  parentName: string;
}): Promise<void> {
  const { to, parentName } = opts;

  await send(
    to,
    "Your NIMIPIKO free trial has ended",
    authBase(
      "Trial ended",
      `<p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#374151;text-align:center;">Your free trial has ended</p>
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">Hi ${parentName} — your 7-day NIMIPIKO trial is now over.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;margin-bottom:22px">
        <p style="margin:0 0 10px;font-size:14px;font-weight:800;color:#374151;">You're now on the free plan:</p>
        <ul style="margin:0;font-size:14px;color:#4b5563;line-height:1.8;padding-left:18px">
          <li>✅ 3 free stories — always accessible</li>
          <li>✅ 10 Nimi AI chats per day</li>
          <li>✅ All child progress &amp; stars saved</li>
          <li>⏸ Premium stories paused</li>
          <li>⏸ Certificate downloads paused</li>
        </ul>
      </div>
      <p style="margin:0 0 4px;font-size:15px;color:#374151;text-align:center;">Subscribe to restore full access instantly — no setup needed.</p>
      ${ctaButton("https://nimipiko.com/pricing", "👑 Restore full access")}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Your child's account stays open on the free plan with no action needed.</p>`,
    ),
  );
}

// ── Subscription payment receipt ─────────────────────────────────────────────
export async function sendPaymentReceipt(opts: {
  to: string;
  parentName: string;
  amount: string;
  currency: string;
  provider: string;
  periodEnd: string;
}): Promise<void> {
  const { to, parentName, amount, currency, provider, periodEnd } = opts;
  const renewDate = new Date(periodEnd).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  await send(
    to,
    `Your NIMIPIKO Club receipt — ${amount} ${currency}`,
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:#15803d;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:24px">👑 NIMIPIKO Club Activated</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Thank you, ${parentName}!</p>
  </div>
  <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">Plan</td><td style="padding:10px 0;font-weight:700;text-align:right">NIMIPIKO Club (Monthly)</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">Amount</td><td style="padding:10px 0;font-weight:700;text-align:right">${amount} ${currency}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">Payment</td><td style="padding:10px 0;font-weight:700;text-align:right">${provider === "mtn_momo" ? "MTN Mobile Money" : "Credit / Debit Card"}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280">Next renewal</td><td style="padding:10px 0;font-weight:700;text-align:right">${renewDate}</td></tr>
    </table>
    <p style="font-size:14px;color:#374151;margin-top:20px">Your child now has full access to all NIMIPIKO stories, songs, coloring books, Nimi AI, and achievement certificates.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="https://nimipiko.com/stories" style="background:#15803d;color:#fff;padding:14px 32px;border-radius:9999px;font-weight:700;font-size:15px;text-decoration:none;display:inline-block">
        📖 Start Exploring
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center">You can cancel anytime from <a href="https://nimipiko.com/settings" style="color:#15803d">Account Settings</a>. Questions? <a href="mailto:support@nimipiko.com" style="color:#15803d">support@nimipiko.com</a></p>
  </div>
</div>
    `.trim(),
  );
}

// ── Subscription renewal confirmation ────────────────────────────────────────
export async function sendRenewalConfirmation(opts: {
  to: string;
  parentName: string;
  amount: string;
  currency: string;
  periodEnd: string;
}): Promise<void> {
  const { to, parentName, amount, currency, periodEnd } = opts;
  const renewDate = new Date(periodEnd).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  await send(
    to,
    "NIMIPIKO Club renewed ✓",
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:#15803d;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">✓ Membership Renewed</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px">Hi ${parentName}, your NIMIPIKO Club membership has been renewed for another month.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr><td style="padding:8px 0;color:#6b7280">Charged</td><td style="font-weight:700;text-align:right">${amount} ${currency}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Next renewal</td><td style="font-weight:700;text-align:right">${renewDate}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b7280">To cancel, visit <a href="https://nimipiko.com/settings" style="color:#15803d">Account Settings</a>.</p>
  </div>
</div>
    `.trim(),
  );
}

// ── Gift notification (to recipient) ─────────────────────────────────────────
export async function sendGiftNotification(opts: {
  to: string;
  recipientName: string | null;
  giverName: string;
  productName?: string | null;
  giftAmount?: number | null;
  giftCurrency?: string | null;
  message: string | null;
  redeemUrl: string;
}): Promise<void> {
  const { to, recipientName, giverName, productName, giftAmount, giftCurrency, message, redeemUrl } = opts;
  const greeting = recipientName ? `Hi ${recipientName}!` : "Hello!";

  // Format what was gifted — amount-based gifts show the value; product-based show the plan name
  let giftLabel: string;
  if (giftAmount && giftCurrency) {
    const formatted = giftCurrency === "RWF"
      ? `${Math.round(giftAmount).toLocaleString()} RWF`
      : giftCurrency === "EUR" ? `€${giftAmount.toFixed(2)}` : `$${giftAmount.toFixed(2)}`;
    giftLabel = `a ${formatted} Nimipiko gift`;
  } else {
    giftLabel = productName ?? "a Nimipiko gift";
  }

  await send(
    to,
    `🎁 ${giverName} just sent you something special!`,
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:linear-gradient(135deg,#f43f5e,#ec4899,#fb923c);padding:36px 24px;text-align:center;border-radius:12px 12px 0 0">
    <div style="font-size:60px;margin-bottom:10px">🎁</div>
    <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900">You've got a gift! 🎉</h1>
    <p style="color:rgba(255,255,255,0.92);margin:10px 0 0;font-size:15px"><strong>${giverName}</strong> sent you <strong>${giftLabel}</strong></p>
  </div>
  <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px">${greeting} You just got a Nimipiko gift from <strong>${giverName}</strong> — stories, songs, coloring books, and Nimi AI all in one magical place for kids. 🌟</p>
    ${message ? `<div style="background:#fdf4ff;border-left:4px solid #e879f9;padding:14px 18px;border-radius:0 10px 10px 0;margin:16px 0;font-size:14px;font-style:italic;color:#7e22ce;line-height:1.6">"${message}"</div>` : ""}
    <div style="text-align:center;margin:28px 0">
      <a href="${redeemUrl}" style="background:linear-gradient(135deg,#f43f5e,#ec4899);color:#fff;padding:16px 44px;border-radius:9999px;font-weight:800;font-size:16px;text-decoration:none;display:inline-block;box-shadow:0 4px 14px rgba(244,63,94,0.35)">
        🎁 Open Your Gift
      </a>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">This gift link is just for you. Need help? <a href="mailto:support@nimipiko.com" style="color:#ec4899;text-decoration:none">support@nimipiko.com</a></p>
  </div>
</div>
    `.trim(),
  );
}

// ── Gift redeemed notification (to giver) ────────────────────────────────────
export async function sendGiftRedeemed(opts: {
  to: string;
  giverName: string;
  recipientName: string | null;
  recipientEmail: string;
  giftAmount: number | null;
  giftCurrency: string | null;
}): Promise<void> {
  const { to, giverName, recipientName, recipientEmail, giftAmount, giftCurrency } = opts;
  const who = recipientName ?? recipientEmail;

  let amountLine = "";
  if (giftAmount && giftCurrency) {
    const formatted = giftCurrency === "RWF"
      ? `${Math.round(giftAmount).toLocaleString()} RWF`
      : giftCurrency === "EUR" ? `€${giftAmount.toFixed(2)}` : `$${giftAmount.toFixed(2)}`;
    amountLine = `<p style="margin:0 0 16px;font-size:14px;color:#6b7280;text-align:center;">Your ${formatted} gift is now unlocking stories, songs, and adventures.</p>`;
  }

  await send(
    to,
    `🎉 Your gift just made ${who}'s day!`,
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:linear-gradient(135deg,#f43f5e,#ec4899,#fb923c);padding:36px 24px;text-align:center;border-radius:12px 12px 0 0">
    <div style="font-size:56px;margin-bottom:8px">🎉</div>
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:900">Your gift landed!</h1>
    <p style="color:rgba(255,255,255,0.92);margin:10px 0 0;font-size:15px"><strong>${who}</strong> just redeemed it 🥳</p>
  </div>
  <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px">Hi <strong>${giverName}</strong>! 🙌 Wonderful news — <strong>${who}</strong> just claimed the Nimipiko gift you sent. They now have full access to stories, songs, coloring books, and Nimi AI in English, French &amp; Kinyarwanda.</p>
    ${amountLine}
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:18px 20px;margin:20px 0;text-align:center;border:1px solid #bbf7d0;">
      <p style="margin:0;font-size:14px;color:#15803d;font-weight:700;line-height:1.5;">🌟 Your generosity is making a child's learning adventure possible.<br><span style="font-weight:400;font-size:13px;color:#16a34a;">Thank you for being the kind of person who gives like this.</span></p>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">Questions? <a href="mailto:support@nimipiko.com" style="color:#ec4899;text-decoration:none">support@nimipiko.com</a></p>
  </div>
</div>
    `.trim(),
  );
}

// ── Gift subscription confirmation (to giver) ────────────────────────────────
export async function sendGiftConfirmation(opts: {
  to: string;
  giverName: string;
  recipientEmail: string;
  productName?: string | null;
  giftAmount?: number | null;
  giftCurrency?: string | null;
}): Promise<void> {
  const { to, giverName, recipientEmail, productName, giftAmount, giftCurrency } = opts;

  let giftLabel: string;
  if (giftAmount && giftCurrency) {
    const formatted = giftCurrency === "RWF"
      ? `${Math.round(giftAmount).toLocaleString()} RWF`
      : giftCurrency === "EUR" ? `€${giftAmount.toFixed(2)}` : `$${giftAmount.toFixed(2)}`;
    giftLabel = `your ${formatted} gift`;
  } else {
    giftLabel = `your gift of ${productName ?? "Nimipiko Club"}`;
  }

  await send(
    to,
    `Your Nimipiko gift is on its way! 🎁`,
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:linear-gradient(135deg,#f43f5e,#ec4899,#fb923c);padding:28px 24px;text-align:center;border-radius:12px 12px 0 0">
    <div style="font-size:44px;margin-bottom:8px">🎁</div>
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">Gift sent! 🎉</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">You just did something really sweet</p>
  </div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px">Hi <strong>${giverName}</strong>! 🙌 We've sent ${giftLabel} to <strong>${recipientEmail}</strong>. They'll get an email with everything they need to unlock it.</p>
    <div style="background:#fdf4ff;border-radius:10px;padding:14px 18px;margin:16px 0;border:1px solid #f3e8ff;">
      <p style="margin:0;font-size:13px;color:#7e22ce;">⏳ You&apos;ll get a notification the moment they open it — we love that part too!</p>
    </div>
    <p style="font-size:13px;color:#9ca3af;margin:0">Questions? <a href="mailto:support@nimipiko.com" style="color:#ec4899;text-decoration:none">support@nimipiko.com</a></p>
  </div>
</div>
    `.trim(),
  );
}

// ── Subscription cancelled confirmation ──────────────────────────────────────
export interface WeeklyDigestChild {
  name: string;
  language: string;
  missionsThisWeek: number;
  storiesThisWeek: number;
  streak: number;
  starsThisWeek: number;
  feelings: string[]; // emoji array from story_feelings this week
}

export async function sendWeeklyDigest(opts: {
  to: string;
  parentName: string;
  weekOf: string; // e.g. "July 7 – July 13, 2026"
  children: WeeklyDigestChild[];
  trialDaysLeft?: number; // set when parent is on trial with ≤3 days remaining
}): Promise<void> {
  const { to, parentName, weekOf, children, trialDaysLeft } = opts;

  const childBlocks = children.map(c => {
    const feelingsRow = c.feelings.length > 0
      ? `<div style="margin-top:12px;padding:10px 14px;background:#fdf2f8;border-radius:8px;border:1px solid #fbcfe8">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#9d174d;text-transform:uppercase;letter-spacing:.06em">How they felt</p>
          <div style="font-size:24px;letter-spacing:4px">${c.feelings.join(" ")}</div>
        </div>`
      : "";

    const lang = c.language === "fr" ? "🇫🇷 French" : c.language === "rw" ? "🇷🇼 Kinyarwanda" : "🇬🇧 English";
    const hasActivity = c.missionsThisWeek > 0 || c.storiesThisWeek > 0;

    return `
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
    <div style="width:44px;height:44px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;font-weight:900;text-align:center;line-height:44px">
      ${c.name.charAt(0).toUpperCase()}
    </div>
    <div>
      <p style="margin:0;font-size:17px;font-weight:900;color:#111827">${c.name}</p>
      <p style="margin:0;font-size:12px;color:#9ca3af">${lang}</p>
    </div>
  </div>
  ${hasActivity ? `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
    ${[
      { icon: "📖", val: c.storiesThisWeek,  label: "Stories"  },
      { icon: "✅", val: c.missionsThisWeek, label: "Missions" },
      { icon: "🔥", val: c.streak,           label: "Day Streak"},
      { icon: "⭐", val: c.starsThisWeek,    label: "Stars"    },
    ].map(s => `
    <div style="text-align:center;background:#f9fafb;border-radius:10px;padding:10px 4px;border:1px solid #f3f4f6">
      <div style="font-size:20px">${s.icon}</div>
      <div style="font-size:20px;font-weight:900;color:#111827">${s.val}</div>
      <div style="font-size:10px;color:#9ca3af;font-weight:600;margin-top:1px">${s.label}</div>
    </div>`).join("")}
  </div>
  ${feelingsRow}
  ` : `<p style="text-align:center;color:#9ca3af;font-size:14px;padding:12px 0">No activity logged this week — nudge ${c.name} to open the app! 🚀</p>`}
</div>`;
  }).join("\n");

  await send(
    to,
    `📊 ${parentName}, here's ${children.length === 1 ? children[0].name + "'s" : "your kids'"} learning report`,
    `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#111827;background:#f9fafb;padding:16px">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
    <p style="margin:0 0 4px;font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">NIMIPIKO 🌿</p>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,.75);font-weight:600">Weekly Learning Report</p>
  </div>

  <!-- Week label -->
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:14px 24px;display:flex;align-items:center;justify-content:space-between">
    <p style="margin:0;font-size:14px;color:#6b7280">Hi <strong style="color:#111">${parentName}</strong> 👋</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;font-weight:600">${weekOf}</p>
  </div>

  <!-- Children blocks -->
  <div style="padding:16px 0">
    ${childBlocks}
  </div>

  <!-- Trial warning (only when on trial with ≤3 days left) -->
  ${trialDaysLeft !== undefined ? `
  <div style="margin-bottom:8px;background:${trialDaysLeft <= 1 ? "#fef2f2" : "#fffbeb"};border:2px solid ${trialDaysLeft <= 1 ? "#fca5a5" : "#fcd34d"};border-radius:12px;padding:18px 20px">
    <p style="margin:0 0 6px;font-size:15px;font-weight:900;color:${trialDaysLeft <= 1 ? "#991b1b" : "#92400e"}">
      ${trialDaysLeft <= 1 ? "⚠️ Your free trial ends tomorrow!" : `⏳ Your free trial ends in ${trialDaysLeft} days`}
    </p>
    <p style="margin:0 0 14px;font-size:13px;color:${trialDaysLeft <= 1 ? "#7f1d1d" : "#78350f"};line-height:1.6">
      After your trial you'll move to the free plan (3 stories, 10 Nimi chats/day). Subscribe now to keep full Club access — no interruption, no setup.
    </p>
    <a href="https://nimipiko.com/pricing"
       style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#fff;font-size:14px;font-weight:900;padding:11px 26px;border-radius:50px;text-decoration:none">
      👑 Keep full access →
    </a>
  </div>` : ""}

  <!-- CTA -->
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:24px;text-align:center">
    <a href="https://nimipiko.com/parents"
       style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-size:15px;font-weight:900;padding:14px 32px;border-radius:50px;text-decoration:none">
      View Full Dashboard →
    </a>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">
      You're receiving this because you have an account on NIMIPIKO.<br>
      <a href="https://nimipiko.com/parents" style="color:#9ca3af">Manage email preferences</a>
    </p>
  </div>
</div>
    `.trim(),
  );
}

// ── Welcome to Club (sent on first paid subscription) ───────────────────────
export async function sendWelcomeToClub(opts: {
  to: string;
  parentName: string;
  billingInterval: "monthly" | "annual" | string;
  renewsOn: string; // ISO date
}): Promise<void> {
  const { to, parentName, billingInterval, renewsOn } = opts;
  const renewDate = new Date(renewsOn).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const intervalLabel = billingInterval === "annual" ? "year" : "month";

  await send(
    to,
    "You're now a NIMIPIKO Club member! 👑",
    authBase(
      "Welcome to Club",
      `<p style="margin:0 0 6px;font-size:26px;font-weight:900;color:#4c1d95;text-align:center;">👑 Welcome to Club, ${parentName}!</p>
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">Your subscription is active — everything is unlocked right now.</p>
      <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #c4b5fd;border-radius:14px;padding:18px 20px;margin-bottom:22px">
        <p style="margin:0 0 10px;font-size:14px;font-weight:800;color:#4c1d95;">What you now have access to:</p>
        <table cellpadding="0" cellspacing="0" width="100%">
          ${[
            ["📚", "All stories", "Every language — English, French &amp; Kinyarwanda"],
            ["🤖", "Unlimited Nimi AI", "No daily chat limit, ever"],
            ["🎓", "Certificate downloads", "PDF &amp; PNG for every completed story"],
            ["👨‍👩‍👧‍👦", "Unlimited children", "Add as many learner profiles as you need"],
            ["🏆", "All challenges", "Badges, rewards &amp; champion status"],
          ].map(([icon, title, desc]) =>
            `<tr><td style="padding:5px 0;vertical-align:top;width:28px;font-size:18px">${icon}</td>
             <td style="padding:5px 0 5px 6px;vertical-align:top">
               <span style="font-size:13px;font-weight:800;color:#3b0764">${title}</span>
               <span style="font-size:12px;color:#6b7280"> — ${desc}</span>
             </td></tr>`
          ).join("")}
        </table>
      </div>
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-align:center;">
        Billed every ${intervalLabel}. Next renewal: <strong style="color:#374151">${renewDate}</strong>.
      </p>
      ${ctaButton("https://nimipiko.com/stories", "🚀 Start exploring")}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
        Manage your subscription any time from the <a href="https://nimipiko.com/parents" style="color:#22c55e">Parents Zone</a>.
      </p>`,
    ),
  );
}

// ── Reactivation confirmation (sent when cancel_at_period_end is reversed) ───
export async function sendReactivationConfirmation(opts: {
  to: string;
  parentName: string;
  renewsOn: string; // ISO date
}): Promise<void> {
  const { to, parentName, renewsOn } = opts;
  const renewDate = new Date(renewsOn).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  await send(
    to,
    "Your NIMIPIKO Club is back on ✓",
    authBase(
      "Subscription reactivated",
      `<p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#14532d;text-align:center;">Subscription reactivated ✓</p>
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">Hi ${parentName} — your NIMIPIKO Club subscription is staying active.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 20px;margin-bottom:22px;text-align:center">
        <p style="margin:0;font-size:14px;color:#15803d;line-height:1.6;">Your next payment will be collected on <strong>${renewDate}</strong>. Nothing else changes — all Club features remain active.</p>
      </div>
      ${ctaButton("https://nimipiko.com/parents", "View my account")}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Changed your mind again? You can cancel any time from the Parents Zone.</p>`,
    ),
  );
}

export async function sendCancellationConfirmation(opts: {
  to: string;
  parentName: string;
  accessUntil: string;
}): Promise<void> {
  const { to, parentName, accessUntil } = opts;
  const untilDate = new Date(accessUntil).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  await send(
    to,
    "Your NIMIPIKO Club has been cancelled",
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:#6b7280;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">Subscription Cancelled</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px">Hi ${parentName}, we've cancelled your NIMIPIKO Club subscription as requested.</p>
    <p style="font-size:15px">You and your child still have full access until <strong>${untilDate}</strong>. After that, you'll move to the free plan — your child's progress and certificates are saved forever.</p>
    <p style="font-size:14px;color:#6b7280">Changed your mind? You can resubscribe at any time from <a href="https://nimipiko.com/pricing" style="color:#15803d">Pricing</a>.</p>
  </div>
</div>
    `.trim(),
  );
}

// ── Payment renewal failure notification (sent to parent when charge is declined) ─
export async function sendRenewalFailed(opts: {
  to: string;
  parentName: string;
  amount: string;
  currency: string;
}): Promise<void> {
  const { to, parentName, amount, currency } = opts;
  const formattedAmount = currency === "RWF"
    ? `${Math.round(Number(amount)).toLocaleString()} RWF`
    : `${currency} ${Number(amount).toFixed(2)}`;

  await send(
    to,
    "Action required: NIMIPIKO Club payment failed",
    authBase(
      "Payment failed",
      `<p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#7c2d12;text-align:center;">Payment failed ⚠️</p>
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;text-align:center;line-height:1.6;">Hi ${parentName} — we were unable to collect your NIMIPIKO Club renewal of <strong>${formattedAmount}</strong>.</p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px 20px;margin-bottom:22px">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#9a3412">What happens next?</p>
        <ul style="margin:0;padding-left:18px;font-size:14px;color:#78350f;line-height:1.8">
          <li>Your subscription stays active while we retry the charge</li>
          <li>We'll try up to 3 times over the next few days</li>
          <li>If payment isn't collected, access to Club will pause</li>
        </ul>
      </div>
      <p style="margin:0 0 18px;font-size:14px;color:#6b7280;text-align:center;line-height:1.6;">To avoid any interruption, please update your payment details now.</p>
      ${ctaButton("https://nimipiko.com/parents", "Update payment details")}
      <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Questions? Reply to this email and we'll help right away.</p>`,
    ),
  );
}

// ── Admin operational alert ──────────────────────────────────────────────────
// Sends a plain ops alert to ADMIN_ALERT_EMAIL. Used for renewal failures that
// need human attention (e.g. CyberSource TMS not enabled → no token to charge).
export async function sendAdminAlert(opts: {
  subject: string;
  body: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return;
  const { subject, body } = opts;
  await send(
    adminEmail,
    `[NIMIPIKO OPS] ${subject}`,
    `<!DOCTYPE html><html><body style="font-family:monospace;font-size:13px;color:#111;padding:24px;max-width:600px">
<h2 style="color:#dc2626;margin-top:0">[NIMIPIKO OPS] ${subject}</h2>
<pre style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
<p style="color:#6b7280;font-size:11px;margin-top:16px">Sent automatically by NIMIPIKO · ${new Date().toISOString()}</p>
</body></html>`,
  );
}
