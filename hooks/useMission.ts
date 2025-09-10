'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import * as LucideIcons from 'lucide-react';

export function useMissions() {
  const [missionProgram, setMissionProgram] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('day')
        .order('mission_time');

      if (error) {
        console.error('Fetch error:', error);
        setLoading(false);
        return;
      }

      const grouped: any = {};
      data.forEach((row) => {
        const dayNumber = row.day_number || 0;
        if (!grouped[dayNumber]) {
          grouped[dayNumber] = {
            day: dayNumber,
            title: row.title || 'Untitled',
            emoji: row.emoji || '✨',
            theme: row.theme || '',
            date: row.date || '',
            missions: [],
          };
        }

        // Safely get icon from LucideIcons
        const iconName = row.icon as keyof typeof LucideIcons;
        const iconComponent = iconName in LucideIcons ? LucideIcons[iconName] : LucideIcons.Smile;

        grouped[dayNumber].missions.push({
          id: row.id,
          title: row.activity_title || row.title,
          time: row.time || '',
          icon: iconComponent,
          points: row.points || 0,
          duration: row.duration || '',
          objectives: row.objectives || [],
          materials: row.materials || [],
          videoUrl: row.video_url || '',
          audioUrl: row.audio_url || '',
          funFact: row.fun_fact || '',
          activity: row.activity || '',
          type: row.type || 'General',
          pikoVictory: row.piko_victory || '',
        });
      });

      Object.values(grouped).forEach((day: any) =>
        day.missions.sort((a: any, b: any) => a.time.localeCompare(b.time))
      );

      setMissionProgram(Object.values(grouped));
      setLoading(false);
    };

    fetchMissions();
  }, []);

  const completeMission = (id: string) => {
    setCompletedMissions((prev) => new Set([...prev, id]));
  };

  return { missionProgram, completedMissions, loading, completeMission };
}
