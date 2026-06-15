import { NextResponse } from "next/server"
import supabase from '@/lib/supabaseClient'

// Production-safe Supabase health endpoint.
// Purpose:
// - Provide a minimal HTTP healthcheck for uptime monitors (UptimeRobot,
//   Pingdom, etc.). This endpoint is NOT part of application logic.
// - Verify Supabase connectivity with a very low-cost query to a dedicated
//   lightweight table `health_check`.
// Safety notes:
// - Does NOT return any DB rows or secrets.
// - Uses a minimal `select('id').limit(1)` to keep cost and exposure low.
// - This endpoint uses ONLY the public anon client to reflect real user
//   experience. If the anon client cannot reach the DB (for example RLS
//   prevents access), the endpoint will return an error. There is NO admin
//   fallback here — this check answers the question: "Is the app actually usable?"

const TABLE = 'health_check'

export async function GET() {
  // Track latency for the DB query (ms)
  const start = Date.now()

  try {
    // Use only the public anon client — this reflects the real-world
    // availability of the app to end users. The query is intentionally
    // minimal and does not expose any row data.
    const res = await supabase.from(TABLE).select('id').limit(1);
    const latencyMs = Date.now() - start;

    if (res.error) {
      // Report failure immediately — no admin fallback.
      return NextResponse.json(
        { status: 'error', message: res.error.message ?? 'Supabase error' },
        { status: 500 }
      );
    }

    // Success with anon client — return observed latency. Do not expose rows.
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString(), latencyMs },
      { status: 200 }
    );
  } catch (err: unknown) {
    // Unexpected exception — return a generic error message.
    const message = err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
