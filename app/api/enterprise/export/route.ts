// app/api/enterprise/export/route.ts
// GET /api/enterprise/export?schoolId=&format=csv|json&report=learner_progress
//
// Data export endpoint for school admins.
// Returns learner progress data for the school in CSV or JSON format.
// Auth: Bearer token (session-based); requester must be an admin of the school.

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { exportLearnerProgress, type LearnerProgressRow } from '@/lib/enterprise/exporter';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url      = req.nextUrl;
  const schoolId = url.searchParams.get('schoolId');
  const format   = (url.searchParams.get('format') ?? 'csv') as 'csv' | 'json';
  const report   = url.searchParams.get('report') ?? 'learner_progress';

  if (!schoolId) return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
  if (format !== 'csv' && format !== 'json') {
    return NextResponse.json({ error: 'format must be csv or json' }, { status: 400 });
  }
  if (report !== 'learner_progress') {
    return NextResponse.json({ error: `Unknown report: ${report}` }, { status: 400 });
  }

  // Verify the requester is a school admin (security-definer RPC handles the check)
  const { data: rows, error } = await db.rpc('export_school_learner_progress', {
    p_school_id: schoolId,
  });

  if (error) {
    if (error.message === 'forbidden') {
      return NextResponse.json({ error: 'Not a school admin' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const generatedAt = new Date().toISOString();
  const { body, contentType, filename } = exportLearnerProgress(
    (rows ?? []) as LearnerProgressRow[],
    { format, schoolId, generatedAt },
  );

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type':        contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  });
}
