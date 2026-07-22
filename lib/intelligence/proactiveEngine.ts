// ── Proactive Intelligence Engine ────────────────────────────────
// Generates ProactiveSuggestion[] from learner context + memories.
// No LLM calls — template-based messages personalised with real data.
// All messages are written in the 3 supported app languages.
//
// Consumers:
//   - /api/nimi/proactive (delivers to client on app open)
//   - /api/cron/daily-reminder (selects best suggestion for push copy)
//   - Parent zone (surface upcoming suggestions to parents)

import type {
  LearnerContext,
  LearnerMemory,
  ProactiveSuggestion,
  ProactiveSuggestionType,
} from '@/lib/ai/types';

// ── Message templates ─────────────────────────────────────────────

type Lang = 'en' | 'fr' | 'rw';

interface TemplateSet {
  title:   Record<Lang, string>;
  message: (name: string, lang: Lang, data: Record<string, unknown>) => string;
}

const TEMPLATES: Record<ProactiveSuggestionType, TemplateSet> = {

  streak_celebrate: {
    title: {
      en: '🔥 Streak milestone!',
      fr: '🔥 Série continue!',
      rw: '🔥 Inzira nziza!',
    },
    message: (name, lang, { days }) => ({
      en: `${name} is on a ${days}-day streak! That consistency is building real skills. Keep the adventure going today!`,
      fr: `${name} est sur une série de ${days} jours ! Cette régularité construit de vraies compétences. Continuez l'aventure aujourd'hui!`,
      rw: `${name} afite iminsi ${days} yimenyereza! Komeza uyu munsi!`,
    })[lang],
  },

  achievement_congrats: {
    title: {
      en: '🏆 New achievement!',
      fr: '🏆 Nouveau succès!',
      rw: '🏆 Intsinzi nshya!',
    },
    message: (name, lang, { achievement }) => ({
      en: `Amazing — ${name} just earned the "${achievement}" achievement! Ask them what they learned to celebrate together.`,
      fr: `Incroyable — ${name} vient de gagner le succès "${achievement}"! Demandez-leur ce qu'ils ont appris pour fêter ensemble.`,
      rw: `Ni byiza cyane — ${name} yabonye intsinzi "${achievement}"! Babwire ukuntu babishimye.`,
    })[lang],
  },

  story_followup: {
    title: {
      en: '📖 Story completed!',
      fr: '📖 Histoire terminée!',
      rw: '📖 Inkuru irarangiye!',
    },
    message: (name, lang, { storyTitle }) => ({
      en: `${name} just finished "${storyTitle}"! Ask them who their favourite character was — it's a great conversation starter.`,
      fr: `${name} vient de terminer "${storyTitle}"! Demandez-leur quel était leur personnage préféré — c'est une bonne conversation.`,
      rw: `${name} arangije "${storyTitle}"! Bababaze uwo bakunda muri iyo nkuru.`,
    })[lang],
  },

  mission_recommend: {
    title: {
      en: '🎯 Today\'s adventure',
      fr: '🎯 L\'aventure du jour',
      rw: '🎯 Urugendo rwa none',
    },
    message: (name, lang, { missionType }) => ({
      en: `${name} hasn't started today's adventure yet. ${missionType ? `Their favourite type is ${missionType} — a great place to begin!` : 'Open NIMIPIKO and dive in!'}`,
      fr: `${name} n'a pas encore commencé l'aventure d'aujourd'hui. ${missionType ? `Leur type préféré est ${missionType} — un bon endroit pour commencer!` : 'Ouvrez NIMIPIKO et plongez!'}`,
      rw: `${name} ntararangiza urugendo rwa none. Fungura NIMIPIKO ukomeze!`,
    })[lang],
  },

  vocab_review: {
    title: {
      en: '📝 Words to practise',
      fr: '📝 Mots à pratiquer',
      rw: '📝 Amagambo yo kwimenyereza',
    },
    message: (name, lang, { wordCount }) => ({
      en: `${name} has ${wordCount} words that could use a quick review. A 5-minute word game today will lock them in for good!`,
      fr: `${name} a ${wordCount} mots qui méritent une révision rapide. Un jeu de mots de 5 minutes aujourd'hui les ancrera pour de bon!`,
      rw: `${name} afite amagambo ${wordCount} akeneye gusuzumwa. Minota 5 zo gukina amagambo zamumarira!`,
    })[lang],
  },

  certificate_nudge: {
    title: {
      en: '🎓 Certificate in reach!',
      fr: '🎓 Certificat à portée!',
      rw: '🎓 Icyemezo giri hafi!',
    },
    message: (name, lang, { missionsLeft, certName }) => ({
      en: `${name} is only ${missionsLeft} mission${missionsLeft === 1 ? '' : 's'} away from earning the "${certName}" certificate! So close!`,
      fr: `${name} n'est qu'à ${missionsLeft} mission${missionsLeft === 1 ? '' : 's'} du certificat "${certName}"! Si proche!`,
      rw: `${name} agize milisiyo ${missionsLeft} gusa hafi yo gutuza icyemezo "${certName}"!`,
    })[lang],
  },

  community_invite: {
    title: {
      en: '🎨 Share something!',
      fr: '🎨 Partagez quelque chose!',
      rw: '🎨 Sangira ikintu!',
    },
    message: (name, lang) => ({
      en: `${name} hasn't shared any artwork or stories in the community gallery recently. Their creativity deserves to be seen!`,
      fr: `${name} n'a pas partagé d'œuvres d'art ou d'histoires dans la galerie communautaire récemment. Leur créativité mérite d'être vue!`,
      rw: `${name} ntarahabana na gahunda ya mfungo y'umuryango vuba. Ubwenge bwabo bukwiye kubonwa!`,
    })[lang],
  },

  daily_checkin: {
    title: {
      en: '👋 Ready to learn?',
      fr: '👋 Prêt à apprendre?',
      rw: '👋 Witeguye kwiga?',
    },
    message: (name, lang) => ({
      en: `Good ${getTimeOfDay('en')}! ${name}'s daily adventure is waiting. Even 10 minutes makes a real difference.`,
      fr: `Bon${getTimeOfDay('fr')} ! L'aventure quotidienne de ${name} attend. Même 10 minutes font une vraie différence.`,
      rw: `Mwaramutse! Urugendo rwa ${name} ruramurikiye. Iminota 10 ni iminota myiza!`,
    })[lang],
  },
};

function getTimeOfDay(lang: Lang): string {
  const h = new Date().getUTCHours() + 2; // CAT = UTC+2
  if (h < 12) return lang === 'fr' ? ' matin' : 'morning';
  if (h < 17) return lang === 'fr' ? ' après-midi' : 'afternoon';
  return lang === 'fr' ? ' soir' : 'evening';
}

// ── Generator ────────────────────────────────────────────────────

function make(
  type:        ProactiveSuggestionType,
  priority:    number,
  name:        string,
  lang:        Lang,
  contextData: Record<string, unknown>
): ProactiveSuggestion {
  const tmpl = TEMPLATES[type];
  return {
    type,
    title:       tmpl.title[lang],
    message:     tmpl.message(name, lang, contextData),
    contextData,
    priority,
  };
}

// ── Main export ──────────────────────────────────────────────────
// Returns sorted suggestions (lowest priority number = show first).
// Callers persist to DB via queue_proactive_suggestion RPC.

export function generateProactiveSuggestions(
  ctx:          LearnerContext,
  memories:     LearnerMemory[],
  wordsToReview = 0,
  lang:         Lang = 'en'
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const { child, stats, recent_activity } = ctx;
  const name = child.name;

  // ── 1. Streak milestone ───────────────────────────────────────
  if (stats.streak_days >= 7) {
    suggestions.push(make('streak_celebrate', 1, name, lang, { days: stats.streak_days }));
  }

  // ── 2. Recent achievement ────────────────────────────────────
  const recentAch = memories
    .filter(m => m.memory_type === 'achievement' && m.confidence >= 0.9)
    .sort((a, b) => {
      const ta = (a.value.completedAt as string | undefined) ?? '';
      const tb = (b.value.completedAt as string | undefined) ?? '';
      return tb.localeCompare(ta);
    })
    .at(0);

  // Only surface if the achievement was earned in the last 24 hours
  if (recentAch) {
    const completedAt = recentAch.value.completedAt as string | undefined;
    if (completedAt) {
      const age = Date.now() - new Date(completedAt).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        const achName = recentAch.key.replace(/_/g, ' ');
        suggestions.push(make('achievement_congrats', 2, name, lang, { achievement: achName }));
      }
    }
  }

  // ── 3. Story followup ────────────────────────────────────────
  const completedStory = memories
    .find(m => m.memory_type === 'achievement' && m.key.startsWith('story_completed_'));
  if (completedStory) {
    const completedAt = completedStory.value.completedAt as string | undefined;
    if (completedAt) {
      const age = Date.now() - new Date(completedAt).getTime();
      if (age < 12 * 60 * 60 * 1000) {
        suggestions.push(make('story_followup', 3, name, lang, {
          storyTitle: completedStory.value.storyTitle ?? 'their story',
        }));
      }
    }
  }

  // ── 4. Vocabulary review ──────────────────────────────────────
  if (wordsToReview >= 3) {
    suggestions.push(make('vocab_review', 4, name, lang, { wordCount: wordsToReview }));
  }

  // ── 5. Mission recommend (no activity today) ─────────────────
  const lastActivity = recent_activity.at(0);
  const lastActivityDate = lastActivity ? new Date(lastActivity.completed_at) : null;
  const today = new Date();
  const hadActivityToday = lastActivityDate
    ? lastActivityDate.toDateString() === today.toDateString()
    : false;

  if (!hadActivityToday) {
    const favType = memories.find(m => m.key === 'favorite_mission_type');
    suggestions.push(make('mission_recommend', 5, name, lang, {
      missionType: (favType?.value?.type as string | undefined) ?? null,
    }));
  }

  // ── 6. Community invite (no upload in 7 days) ────────────────
  const hasRecentUpload = memories.find(m => m.memory_type === 'achievement' && m.key === 'story_author');
  if (!hasRecentUpload) {
    suggestions.push(make('community_invite', 8, name, lang, {}));
  }

  // ── 7. Daily check-in fallback ───────────────────────────────
  if (suggestions.length === 0) {
    suggestions.push(make('daily_checkin', 10, name, lang, {}));
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

// ── Single best suggestion for push notification copy ────────────

export function bestSuggestionForPush(
  suggestions: ProactiveSuggestion[]
): ProactiveSuggestion | null {
  return suggestions.at(0) ?? null;
}
