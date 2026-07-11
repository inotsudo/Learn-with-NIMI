// Sends transactional emails via SendGrid.
// Requires SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in environment.

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM   = process.env.SENDGRID_FROM_EMAIL ?? "support@nimipiko.com";
const SENDGRID_URL    = "https://api.sendgrid.com/v3/mail/send";

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!SENDGRID_API_KEY) return; // graceful no-op when key not configured
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
  } catch {
    // Non-fatal — email is best-effort
  }
}

// ── Welcome email sent after signup ─────────────────────────────────────────
export async function sendWelcomeEmail(to: string, parentName: string): Promise<void> {
  await send(
    to,
    "Welcome to NIMIPIKO! 🌿",
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:#15803d;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:28px">Welcome, ${parentName}! 🎉</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px">Your child's learning adventure starts now</p>
  </div>
  <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;line-height:1.6">NIMIPIKO gives your child a magical learning experience through interactive stories, songs, coloring, and AI companion Nimi — in English, French, and Kinyarwanda.</p>
    <p style="font-size:15px;line-height:1.6">Here's what to do next:</p>
    <ol style="font-size:14px;line-height:1.8;color:#374151">
      <li>Create your child's profile (choose their name, age, and learning language)</li>
      <li>Start Story 1 — it's completely free!</li>
      <li>Watch their progress in the <strong>Parents Zone</strong></li>
    </ol>
    <div style="text-align:center;margin:24px 0">
      <a href="https://nimipiko.com/stories" style="background:#15803d;color:#fff;padding:14px 32px;border-radius:9999px;font-weight:700;font-size:15px;text-decoration:none;display:inline-block">
        🚀 Start Learning
      </a>
    </div>
    <p style="font-size:13px;color:#6b7280;text-align:center">Questions? Reply to this email or contact <a href="mailto:support@nimipiko.com" style="color:#15803d">support@nimipiko.com</a></p>
  </div>
</div>
    `.trim(),
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

// ── Gift subscription notification (to recipient) ────────────────────────────
export async function sendGiftNotification(opts: {
  to: string;
  recipientName: string | null;
  giverName: string;
  productName: string;
  message: string | null;
  redeemUrl: string;
}): Promise<void> {
  const { to, recipientName, giverName, productName, message, redeemUrl } = opts;
  const greeting = recipientName ? `Hi ${recipientName}!` : "Hello!";

  await send(
    to,
    `🎁 ${giverName} sent you a NIMIPIKO gift!`,
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:32px 24px;text-align:center;border-radius:12px 12px 0 0">
    <div style="font-size:56px;margin-bottom:8px">🎁</div>
    <h1 style="color:#fff;margin:0;font-size:26px">You've been gifted!</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px">${giverName} gifted you <strong>${productName}</strong></p>
  </div>
  <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px;line-height:1.6">${greeting} ${giverName} thought you'd love NIMIPIKO — an interactive learning universe for children with stories, songs, coloring books, and Nimi AI in English, French &amp; Kinyarwanda.</p>
    ${message ? `<div style="background:#fefce8;border-left:4px solid #fbbf24;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:14px;font-style:italic;color:#78350f">"${message}"</div>` : ""}
    <div style="text-align:center;margin:28px 0">
      <a href="${redeemUrl}" style="background:#15803d;color:#fff;padding:16px 40px;border-radius:9999px;font-weight:700;font-size:16px;text-decoration:none;display:inline-block">
        🚀 Claim Your Gift
      </a>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center">This gift link works once. If you need help, contact <a href="mailto:support@nimipiko.com" style="color:#15803d">support@nimipiko.com</a></p>
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
  productName: string;
}): Promise<void> {
  const { to, giverName, recipientEmail, productName } = opts;

  await send(
    to,
    "Your NIMIPIKO gift has been sent! 🎁",
    `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <div style="background:#15803d;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">Gift sent! 🎁</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:15px">Hi ${giverName}! Your gift of <strong>${productName}</strong> has been sent to <strong>${recipientEmail}</strong>. They'll receive an email with a link to claim it.</p>
    <p style="font-size:14px;color:#6b7280">Questions? <a href="mailto:support@nimipiko.com" style="color:#15803d">support@nimipiko.com</a></p>
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
}): Promise<void> {
  const { to, parentName, weekOf, children } = opts;

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
