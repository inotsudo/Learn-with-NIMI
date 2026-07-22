// lib/offline/offlineAI.ts — Local AI fallback when network is unavailable
//
// When the device is offline or the AI API is unreachable, this module
// provides deterministic, rule-based responses. Responses are intentionally
// simple and warm — they never pretend to be the real AI.
//
// Runs client-side only. No fetch, no imports from server modules.

export type OfflineAIType =
  | 'nimi_chat'
  | 'lesson_hint'
  | 'coloring_coach'
  | 'drawing_coach'
  | 'voice_chat'
  | 'pronunciation_coach';

export interface OfflineAIRequest {
  type:      OfflineAIType;
  prompt?:   string;
  language?: string;
  childName?: string;
}

export interface OfflineAIResponse {
  content:  string;
  offline:  true;
}

// ── Response banks ────────────────────────────────────────────────────────────

const NIMI_CHAT: Record<string, string[]> = {
  en: [
    "I'm a little sleepy without internet today, but I'm still here! Tell me about your story.",
    "My brain needs WiFi to think properly, but I can still listen! What did you read today?",
    "I'm resting offline, but I love hearing from you! What happened in your story?",
    "Even without the internet, we can still talk! How are you feeling today?",
    "Hmm, I'm thinking slowly today without my internet boost! What part of the story did you like best?",
  ],
  fr: [
    "Je suis un peu endormi sans internet aujourd'hui, mais je suis là ! Parle-moi de ton histoire.",
    "Mon cerveau a besoin de WiFi, mais je peux encore t'écouter ! Qu'est-ce que tu as lu aujourd'hui?",
    "Je me repose hors ligne, mais j'adore avoir de tes nouvelles ! Que s'est-il passé dans ton histoire?",
  ],
  rw: [
    "Ndi gato mu bwenge ubu kubera nta internet, ariko ndi hano! Mbwira inkuru yawe.",
    "Ndumva nabi nta internet, ariko nawe ndagukunda! Ni iki waranse uyu munsi?",
  ],
};

const HINTS: Record<string, string[]> = {
  en: [
    "Take a deep breath and try again — you're doing great!",
    "Look at the first letter of the answer. Does that help?",
    "Think about what happened in the story. The answer is there!",
    "You're so close! Read the question one more time slowly.",
    "Think about it like this: what would the main character do?",
  ],
  fr: [
    "Respire profondément et essaie encore — tu fais super bien !",
    "Regarde la première lettre de la réponse. Est-ce que ça aide?",
    "Réfléchis à ce qui s'est passé dans l'histoire. La réponse est là !",
  ],
  rw: [
    "Humeka neza hanyuma ugerageze nanone — urimo neza!",
    "Reba inyuguti ya mbere y'igisubizo. Mbifasha?",
  ],
};

const COLORING: Record<string, string> = {
  en: "Try using warm colors like orange and yellow for sunny scenes, and cool blues for water or night skies! Most importantly, have fun!",
  fr: "Essaie des couleurs chaudes comme l'orange et le jaune pour les scènes ensoleillées, et des bleus froids pour l'eau ou le ciel nocturne ! Amuse-toi bien !",
  rw: "Gerageza imbariro nziza nka orange na umuhondo ku birori by'izuba, kandi ibuluu ku mazi cyangwa ijuru ry'ijoro! Nimusheshe!",
};

const DRAWING: Record<string, string> = {
  en: "Start with simple shapes — circles, triangles, squares. Everything in a drawing is made from basic shapes! Take it one step at a time.",
  fr: "Commence par des formes simples — cercles, triangles, carrés. Tout dans un dessin est fait de formes de base ! Prends-le étape par étape.",
  rw: "Tangira na mashusho yoroheje — amazinga, triangle, inshobore. Ibintu byose mu ishusho bituruka ku mashusho asanzwe! Bigenze intambwe imwe imwe.",
};

const PRONUNCIATION: Record<string, string> = {
  en: "Great effort reading aloud! Say each word slowly and clearly. It's okay to make mistakes — practice makes perfect!",
  fr: "Bravo pour ta lecture à voix haute ! Dis chaque mot lentement et clairement. C'est normal de faire des erreurs — c'est en pratiquant qu'on s'améliore !",
  rw: "Wakoze neza gusome vuba! Vuga ijambo ryose buhoro kandi ureremba. Ntacyo kubura — ni ukuri kwigira!",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── getOfflineResponse ────────────────────────────────────────────────────────

export function getOfflineResponse(req: OfflineAIRequest): OfflineAIResponse {
  const lang = req.language ?? 'en';
  const l    = (['en','fr','rw'] as const).includes(lang as 'en'|'fr'|'rw') ? lang as 'en'|'fr'|'rw' : 'en';

  let content: string;

  switch (req.type) {
    case 'nimi_chat':
    case 'voice_chat':
      content = pick((NIMI_CHAT[l] ?? NIMI_CHAT.en)!);
      if (req.childName) content = content.replace(/\b(you|tu|we)\b/i, req.childName);
      break;

    case 'lesson_hint':
      content = pick((HINTS[l] ?? HINTS.en)!);
      break;

    case 'coloring_coach':
      content = COLORING[l] ?? COLORING.en;
      break;

    case 'drawing_coach':
      content = DRAWING[l] ?? DRAWING.en;
      break;

    case 'pronunciation_coach':
      content = PRONUNCIATION[l] ?? PRONUNCIATION.en;
      break;

    default:
      content = "I'm offline right now, but I'll be back soon! Keep up the great work.";
  }

  return { content, offline: true };
}

// ── isOfflineError ────────────────────────────────────────────────────────────
// Detects network errors thrown by fetch() so callers can fall back.

export function isOfflineError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (e instanceof TypeError) {
    const msg = e.message.toLowerCase();
    return msg.includes('failed to fetch') ||
           msg.includes('network request failed') ||
           msg.includes('load failed');
  }
  return false;
}
