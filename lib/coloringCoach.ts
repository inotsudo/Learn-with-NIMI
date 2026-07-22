/**
 * Coloring Coach — Phase 7.1
 *
 * Types and prompt builder for AI colour suggestions + feedback.
 * The coach never sees the child's actual coloring — it works from the
 * story theme and page description, giving developmentally-appropriate
 * color advice and warm encouragement.
 */

export interface ColoringPage {
  id:                 string;
  page_number:        number;
  template_image_url: string | null;
  story_id:           string;
  story_title:        string;
  story_emoji:        string | null;
}

export interface ColorSuggestion {
  area:       string;    // "the sky", "the bird's feathers"
  color:      string;    // "bright blue"
  hex:        string;    // approximate hex for swatch display
  reason:     string;    // "blue makes it feel calm and peaceful"
}

export interface ColoringCoachRequest {
  storyTitle:   string;
  storyEmoji:   string | null;
  pageNumber:   number;
  language:     string;   // en | fr | rw
  ageRange:     string;   // 5-7 | 8-10 | 11+
  childName:    string;
}

export interface ColoringCoachResponse {
  suggestions:    ColorSuggestion[];
  palette_story:  string;    // a sentence describing the mood
  encouragement:  string;    // warm message to start
}

export interface ColoringFeedbackRequest {
  storyTitle:   string;
  pageNumber:   number;
  childColors:  string;   // free-text description of what the child used
  language:     string;
  ageRange:     string;
  childName:    string;
}

export interface ColoringFeedbackResponse {
  praise:         string;   // specific praise for their colour choices
  color_fact:     string;   // one age-appropriate colour theory fact
  invite_more:    string;   // encouragement to keep going
}

// ── Suggestion prompt ─────────────────────────────────────────────────────────

export function buildColoringSuggestionPrompt(req: ColoringCoachRequest): string {
  const ageNote =
    req.ageRange === "5-7"  ? "The child is 5-7 years old — use very simple color names (red, blue, green) and short reasons." :
    req.ageRange === "8-10" ? "The child is 8-10 years old — you can mention color moods and mixing basics." :
                              "The child is 11+ — you can introduce complementary colors and artistic concepts.";

  return `\
You are Nimi, a warm and encouraging art coach for African primary-school children.
A child is about to color page ${req.pageNumber} of the story "${req.storyTitle}" ${req.storyEmoji ?? ""}.
Give them color suggestions that fit the story mood and make their artwork beautiful.

${ageNote}
Language for ALL text fields: ${req.language === "rw" ? "English (Kinyarwanda TTS not available)" : req.language === "fr" ? "French" : "English"}.

Rules:
- Give exactly 4 color suggestions for the most important areas on the page
- Each reason must be 1 short sentence, child-friendly, NO markdown
- palette_story: one evocative sentence about the mood you want to create
- encouragement: a warm 1-2 sentence message to the child by name (${req.childName})
- hex values: approximate RGB hex for the suggested color (e.g. "#FFD700" for golden yellow)

Respond ONLY with valid JSON, no code fences:
{
  "suggestions": [
    { "area": "...", "color": "...", "hex": "...", "reason": "..." }
  ],
  "palette_story": "...",
  "encouragement": "..."
}`;
}

// ── Feedback prompt ───────────────────────────────────────────────────────────

export function buildColoringFeedbackPrompt(req: ColoringFeedbackRequest): string {
  return `\
You are Nimi, a warm art coach for African primary-school children.
${req.childName} just colored page ${req.pageNumber} of "${req.storyTitle}".
They described their colors: "${req.childColors}"

Rules:
- praise: 2 sentences. Be specific about what they chose — make them feel proud.
- color_fact: one short age-appropriate fact about color (${req.ageRange}) that relates to what they did. NO markdown.
- invite_more: a short sentence inviting them to color more.
- NO markdown anywhere.
- Language: ${req.language === "fr" ? "French" : "English"}.

Respond ONLY with valid JSON, no code fences:
{
  "praise": "...",
  "color_fact": "...",
  "invite_more": "..."
}`;
}

// ── Response validator ────────────────────────────────────────────────────────

export function validateColoringCoachResponse(raw: unknown): ColoringCoachResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const suggestions = Array.isArray(r.suggestions)
    ? (r.suggestions as unknown[]).slice(0, 5).filter((s): s is ColorSuggestion => {
        if (typeof s !== "object" || s === null) return false;
        const o = s as Record<string, unknown>;
        return typeof o.area === "string" && typeof o.color === "string";
      })
    : [];
  if (suggestions.length === 0) return null;
  return {
    suggestions,
    palette_story: typeof r.palette_story === "string" ? r.palette_story.slice(0, 200) : "",
    encouragement: typeof r.encouragement === "string" ? r.encouragement.slice(0, 300) : "",
  };
}

export function validateColoringFeedbackResponse(raw: unknown): ColoringFeedbackResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const praise = typeof r.praise === "string" ? r.praise.slice(0, 400) : null;
  if (!praise) return null;
  return {
    praise,
    color_fact:  typeof r.color_fact  === "string" ? r.color_fact.slice(0, 300)  : "",
    invite_more: typeof r.invite_more === "string" ? r.invite_more.slice(0, 200) : "Keep on coloring!",
  };
}
