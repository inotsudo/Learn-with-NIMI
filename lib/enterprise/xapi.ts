// lib/enterprise/xapi.ts — xAPI 1.0.3 (TinCan) statement builder
//
// Standard verb IRIs from ADL vocabulary.
// Builders produce minimal statements; callers can spread-override any field.

export interface XapiActor {
  objectType: 'Agent';
  name:        string;
  mbox?:       string;   // mailto:user@example.com
  account?: {
    homePage: string;
    name:     string;   // platform user ID
  };
}

export interface XapiVerb {
  id:      string;
  display: Record<string, string>;
}

export interface XapiObject {
  objectType: 'Activity';
  id:         string;
  definition?: {
    name?:        Record<string, string>;
    description?: Record<string, string>;
    type?:        string;
  };
}

export interface XapiResult {
  score?: {
    scaled: number;   // -1..1
    raw?:   number;
    min?:   number;
    max?:   number;
  };
  success?:     boolean;
  completion?:  boolean;
  duration?:    string;   // ISO 8601 duration e.g. PT5M30S
}

export interface XapiContext {
  platform?: string;
  language?: string;
  extensions?: Record<string, unknown>;
}

export interface XapiStatement {
  id:        string;      // UUID v4
  actor:     XapiActor;
  verb:      XapiVerb;
  object:    XapiObject;
  result?:   XapiResult;
  context?:  XapiContext;
  timestamp: string;      // ISO 8601
}

// ── Standard verbs ────────────────────────────────────────────────────────────

export const VERBS = {
  experienced: {
    id:      'http://adlnet.gov/expapi/verbs/experienced',
    display: { 'en-US': 'experienced' },
  },
  attempted: {
    id:      'http://adlnet.gov/expapi/verbs/attempted',
    display: { 'en-US': 'attempted' },
  },
  completed: {
    id:      'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed' },
  },
  passed: {
    id:      'http://adlnet.gov/expapi/verbs/passed',
    display: { 'en-US': 'passed' },
  },
  failed: {
    id:      'http://adlnet.gov/expapi/verbs/failed',
    display: { 'en-US': 'failed' },
  },
  answered: {
    id:      'http://adlnet.gov/expapi/verbs/answered',
    display: { 'en-US': 'answered' },
  },
  interacted: {
    id:      'http://adlnet.gov/expapi/verbs/interacted',
    display: { 'en-US': 'interacted' },
  },
  progressed: {
    id:      'http://adlnet.gov/expapi/verbs/progressed',
    display: { 'en-US': 'progressed' },
  },
  mastered: {
    id:      'http://adlnet.gov/expapi/verbs/mastered',
    display: { 'en-US': 'mastered' },
  },
} as const satisfies Record<string, XapiVerb>;

// ── Activity type IRIs ────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = {
  lesson:    'http://adlnet.gov/expapi/activities/lesson',
  assessment:'http://adlnet.gov/expapi/activities/assessment',
  question:  'http://adlnet.gov/expapi/activities/cmi.interaction',
  story:     'https://nimipiko.com/xapi/activities/story',
  mission:   'https://nimipiko.com/xapi/activities/mission',
  word:      'https://nimipiko.com/xapi/activities/vocabulary-word',
} as const;

// ── UUID v4 (crypto-random) ───────────────────────────────────────────────────

function uuid(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  arr[6] = (arr[6] & 0x0f) | 0x40; // version 4
  arr[8] = (arr[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// ── buildActor ────────────────────────────────────────────────────────────────

export function buildActor(opts: {
  userId:    string;
  name?:     string;
  email?:    string;
  platform?: string;
}): XapiActor {
  const homePage = opts.platform ?? 'https://nimipiko.com';
  const actor: XapiActor = {
    objectType: 'Agent',
    name:       opts.name ?? opts.userId,
    account: { homePage, name: opts.userId },
  };
  if (opts.email) actor.mbox = `mailto:${opts.email}`;
  return actor;
}

// ── buildStatement ────────────────────────────────────────────────────────────

export function buildStatement(opts: {
  actor:       XapiActor;
  verb:        XapiVerb;
  activityId:  string;
  activityName?: string;
  activityType?: string;
  result?:     XapiResult;
  language?:   string;
}): XapiStatement {
  const stmt: XapiStatement = {
    id:        uuid(),
    actor:     opts.actor,
    verb:      opts.verb,
    object: {
      objectType: 'Activity',
      id:         opts.activityId,
      ...(opts.activityName || opts.activityType ? {
        definition: {
          ...(opts.activityName ? {
            name: { [opts.language ?? 'en-US']: opts.activityName },
          } : {}),
          ...(opts.activityType ? { type: opts.activityType } : {}),
        },
      } : {}),
    },
    timestamp: new Date().toISOString(),
    context: {
      platform: 'NIMIPIKO',
      ...(opts.language ? { language: opts.language } : {}),
    },
  };

  if (opts.result) stmt.result = opts.result;
  return stmt;
}

// ── Convenience builders ──────────────────────────────────────────────────────

export function lessonCompleted(actor: XapiActor, lessonId: string, lessonTitle?: string, score?: number): XapiStatement {
  return buildStatement({
    actor,
    verb:         VERBS.completed,
    activityId:   `https://nimipiko.com/lessons/${lessonId}`,
    activityName: lessonTitle,
    activityType: ACTIVITY_TYPES.lesson,
    ...(score !== undefined ? {
      result: {
        score:      { scaled: score / 100, raw: score, min: 0, max: 100 },
        completion: true,
        success:    score >= 60,
      },
    } : {}),
  });
}

export function quizAnswered(actor: XapiActor, quizId: string, correct: boolean, score?: number): XapiStatement {
  return buildStatement({
    actor,
    verb:        VERBS.answered,
    activityId:  `https://nimipiko.com/assessments/${quizId}`,
    activityType: ACTIVITY_TYPES.assessment,
    result: {
      ...(score !== undefined ? { score: { scaled: score / 100, raw: score, min: 0, max: 100 } } : {}),
      success: correct,
    },
  });
}

export function missionCompleted(actor: XapiActor, missionType: string, stars: number): XapiStatement {
  return buildStatement({
    actor,
    verb:        VERBS.mastered,
    activityId:  `https://nimipiko.com/missions/${missionType}`,
    activityType: ACTIVITY_TYPES.mission,
    result: {
      score:      { scaled: stars / 3, raw: stars, min: 0, max: 3 },
      completion: true,
      success:    stars >= 1,
    },
  });
}

export function storyRead(actor: XapiActor, storyId: string, storyTitle?: string): XapiStatement {
  return buildStatement({
    actor,
    verb:         VERBS.experienced,
    activityId:   `https://nimipiko.com/stories/${storyId}`,
    activityName: storyTitle,
    activityType: ACTIVITY_TYPES.story,
  });
}

// ── formatIsoDuration ─────────────────────────────────────────────────────────
// Convert seconds → ISO 8601 duration string (PT#M#S)

export function formatIsoDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `PT${s}S`;
  if (s === 0) return `PT${m}M`;
  return `PT${m}M${s}S`;
}
