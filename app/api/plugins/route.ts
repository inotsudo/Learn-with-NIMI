// app/api/plugins/route.ts
// GET  /api/plugins         — list active plugins in the marketplace
// POST /api/plugins         — publish a new plugin (authenticated author)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PluginManifest } from '@/lib/plugins/types';

export const runtime = 'edge';

const REQUIRED_HOOKS = new Set(['beforeAI','afterAI','onEvent','onMission','onStoryLoad']);
const VALID_PERMS    = new Set([
  'read:learner','write:memory','emit:events','inject:prompt','read:content',
]);

function sessionClient(auth: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  );
}

export async function GET(req: NextRequest) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const p      = req.nextUrl.searchParams;
  const query  = p.get('q') ?? '';
  const limit  = Math.min(parseInt(p.get('limit') ?? '20', 10), 50);
  const offset = Math.max(parseInt(p.get('offset') ?? '0',  10), 0);

  let q = db.from('plugins')
    .select('id, slug, name, description, version, author_name, hooks, install_count', { count: 'exact' })
    .eq('status', 'active')
    .order('install_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (query) q = q.ilike('name', `%${query}%`);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plugins: data ?? [], total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = sessionClient(auth);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let manifest: PluginManifest;
  try { manifest = await req.json() as PluginManifest; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Validate manifest shape
  const errors: string[] = [];
  if (!manifest.slug || !/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/.test(manifest.slug))
    errors.push('slug must be lowercase, 3-62 chars, kebab-case');
  if (!manifest.name || manifest.name.length < 2)
    errors.push('name required (min 2 chars)');
  if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version))
    errors.push('version must be semver (e.g. 1.0.0)');
  if (!Array.isArray(manifest.hooks) || manifest.hooks.length === 0)
    errors.push('hooks array required (at least one hook)');
  else {
    const bad = manifest.hooks.filter(h => !REQUIRED_HOOKS.has(h));
    if (bad.length) errors.push(`unknown hooks: ${bad.join(', ')}`);
  }
  if (manifest.permissions) {
    const bad = manifest.permissions.filter(p => !VALID_PERMS.has(p));
    if (bad.length) errors.push(`unknown permissions: ${bad.join(', ')}`);
  }
  if (!manifest.handlers || typeof manifest.handlers !== 'object')
    errors.push('handlers object required');

  if (errors.length) return NextResponse.json({ errors }, { status: 422 });

  const { data: pluginId, error } = await db.rpc('publish_plugin', {
    p_slug:        manifest.slug,
    p_name:        manifest.name,
    p_description: manifest.description ?? '',
    p_version:     manifest.version,
    p_author_name: manifest.author ?? '',
    p_manifest:    manifest,
    p_hooks:       manifest.hooks,
    p_permissions: manifest.permissions ?? [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pluginId, status: 'pending' }, { status: 201 });
}
