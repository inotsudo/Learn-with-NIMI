import supabase from '@/lib/supabaseClient'

// Module-level cache — 5 minute TTL. Admin name/role never changes mid-session.
// Eliminates the getUser() → admins.select() waterfall that runs in every tab component.
const TTL = 5 * 60_000
let _cached: { name: string; role: string } | null = null
let _expires = 0
let _pending: Promise<{ name: string; role: string } | null> | null = null

export function getCachedAdmin(): Promise<{ name: string; role: string } | null> {
  if (_cached && Date.now() < _expires) return Promise.resolve(_cached)
  if (_pending) return _pending
  _pending = supabase.auth.getUser()
    .then(({ data: { user } }) => {
      if (!user) { _pending = null; return null }
      return supabase.from('admins').select('name, role').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          _cached = data ? { name: data.name ?? 'Admin', role: data.role ?? 'admin' } : null
          _expires = Date.now() + TTL
          _pending = null
          return _cached
        })
    })
    .catch(err => { _pending = null; throw err })
  return _pending
}

export function clearAdminCache() {
  _cached = null
  _expires = 0
  _pending = null
}
