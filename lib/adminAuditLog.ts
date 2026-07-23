import supabase from '@/lib/supabaseClient'

export interface AuditEntry {
  action: string
  entityType: string
  entityId?: string
  entityLabel?: string
  metadata?: Record<string, unknown>
}

export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    await supabase.from('admin_audit_log').insert({
      admin_email: user.email,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      metadata: entry.metadata ?? {},
    })
  } catch {
    // Never throw — audit log failures must never break the main operation
  }
}
