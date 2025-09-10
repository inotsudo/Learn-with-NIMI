import supabase from './supabaseClient'

export const MissionService = {
  // Get today's missions
  async getTodaysMissions() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .gte('date', today.toISOString())
      .lt('date', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true })

    if (error) throw error
    return data
  },

  // Complete a mission
  async completeMission(missionId: string) {
    const { data, error } = await supabase
      .from('missions')
      .update({ is_completed: true })
      .eq('id', missionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Create a new mission
  async createMission(data: {
    title: string
    description?: string
    date: Date
    scheduled_at?: string
    [key: string]: any
  }) {
    const { data: newMission, error } = await supabase
      .from('missions')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return newMission
  }
}
