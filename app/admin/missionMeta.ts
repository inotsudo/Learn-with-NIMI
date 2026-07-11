import {
  Headphones, Activity, Palette, Landmark, Search, Sprout, BookOpen, PenTool,
  Compass, type LucideIcon,
} from 'lucide-react'

export type AccentKey = 'violet' | 'pink' | 'orange' | 'amber' | 'emerald' | 'teal' | 'blue' | 'rose' | 'indigo' | 'sky' | 'green'

export interface AccentPalette {
  tile: string      // icon tile: soft bg + accent text
  badge: string     // solid circular badge
  button: string    // primary button bg + hover
  soft: string      // light wash background (selected states, active tabs)
  text: string      // accent-colored text/icon
  border: string     // accent-colored border (selected cards)
  ring: string       // focus ring + border for inputs
  gradient: string   // vivid gradient for preview cards/banners
}

export const ACCENT: Record<AccentKey, AccentPalette> = {
  violet:  { tile: 'bg-violet-100 text-violet-600',   badge: 'bg-violet-500',  button: 'bg-violet-500 hover:bg-violet-600', soft: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  ring: 'focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300',  gradient: 'bg-gradient-to-br from-violet-400 to-violet-600' },
  pink:    { tile: 'bg-pink-100 text-pink-600',       badge: 'bg-pink-500',    button: 'bg-pink-500 hover:bg-pink-600',     soft: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-200',    ring: 'focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300',      gradient: 'bg-gradient-to-br from-pink-400 to-pink-600' },
  orange:  { tile: 'bg-orange-100 text-orange-600',   badge: 'bg-orange-500', button: 'bg-orange-500 hover:bg-orange-600', soft: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  ring: 'focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300',  gradient: 'bg-gradient-to-br from-orange-400 to-orange-600' },
  amber:   { tile: 'bg-amber-100 text-amber-600',     badge: 'bg-amber-500',  button: 'bg-amber-500 hover:bg-amber-600',   soft: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   ring: 'focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300',    gradient: 'bg-gradient-to-br from-amber-400 to-amber-600' },
  emerald: { tile: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-500', button: 'bg-emerald-500 hover:bg-emerald-600', soft: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300', gradient: 'bg-gradient-to-br from-emerald-400 to-emerald-600' },
  teal:    { tile: 'bg-teal-100 text-teal-600',       badge: 'bg-teal-500',   button: 'bg-teal-500 hover:bg-teal-600',     soft: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    ring: 'focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300',      gradient: 'bg-gradient-to-br from-teal-400 to-teal-600' },
  blue:    { tile: 'bg-blue-100 text-blue-600',       badge: 'bg-blue-500',   button: 'bg-blue-500 hover:bg-blue-600',     soft: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    ring: 'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300',      gradient: 'bg-gradient-to-br from-blue-400 to-blue-600' },
  rose:    { tile: 'bg-rose-100 text-rose-600',       badge: 'bg-rose-500',   button: 'bg-rose-500 hover:bg-rose-600',     soft: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    ring: 'focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300',      gradient: 'bg-gradient-to-br from-rose-400 to-rose-600' },
  indigo:  { tile: 'bg-indigo-100 text-indigo-600',   badge: 'bg-indigo-500', button: 'bg-indigo-500 hover:bg-indigo-600', soft: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  ring: 'focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300',  gradient: 'bg-gradient-to-br from-indigo-400 to-indigo-600' },
  green:   { tile: 'bg-green-100 text-green-700',     badge: 'bg-green-600',  button: 'bg-green-600 hover:bg-green-700',   soft: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   ring: 'focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500',    gradient: 'bg-gradient-to-br from-green-500 to-green-700' },
  sky:     { tile: 'bg-sky-100 text-sky-600',         badge: 'bg-sky-500',    button: 'bg-sky-500 hover:bg-sky-600',       soft: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     ring: 'focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300',        gradient: 'bg-gradient-to-br from-sky-400 to-sky-600' },
}

export const LANGUAGES = ['en', 'fr', 'rw'] as const
export type Lang = typeof LANGUAGES[number]

export const LANGUAGE_META: Record<Lang, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
  fr: { flag: '🇫🇷', label: 'Français' },
  rw: { flag: '🇷🇼', label: 'Kinyarwanda' },
}

export const CATEGORY_ORDER = ['morning', 'movement', 'artistic', 'histoire', 'zoom', 'discovery', 'flipflop', 'coloring']

export interface CategoryMeta {
  icon: LucideIcon
  accent: AccentKey
  label: string
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  morning:   { icon: Headphones, accent: 'violet',  label: 'Morning Song' },
  movement:  { icon: Activity,   accent: 'pink',    label: 'Movement Mission' },
  artistic:  { icon: Palette,    accent: 'orange',  label: 'Mission Artistique' },
  histoire:  { icon: Landmark,   accent: 'amber',   label: 'Mission Historique' },
  zoom:      { icon: Search,     accent: 'emerald', label: 'Mission Zoom' },
  discovery: { icon: Sprout,     accent: 'teal',    label: 'Mission Discovery' },
  flipflop:  { icon: BookOpen,   accent: 'blue',    label: 'FlipFlop Book' },
  coloring:  { icon: PenTool,    accent: 'rose',    label: 'Coloring Book' },
}

export const FALLBACK_META: CategoryMeta = { icon: Compass, accent: 'indigo', label: 'Daily Adventure' }

export const MISSION_TYPES = ['sing', 'move', 'color', 'watch', 'read', 'story'] as const
export type MissionType = typeof MISSION_TYPES[number]

export const TYPE_META: Record<MissionType, { emoji: string; label: string }> = {
  sing:  { emoji: '🎧', label: 'Sing' },
  move:  { emoji: '🏃', label: 'Move' },
  color: { emoji: '🎨', label: 'Color' },
  watch: { emoji: '📺', label: 'Watch' },
  read:  { emoji: '📖', label: 'Read' },
  story: { emoji: '📚', label: 'Story' },
}

export const CONTENT_STATUSES = ['draft', 'review', 'published', 'archived'] as const
export type ContentStatus = typeof CONTENT_STATUSES[number]

export const STATUS_META: Record<ContentStatus, { label: string; badge: string }> = {
  draft:     { label: 'Draft',     badge: 'bg-gray-100 text-gray-500' },
  review:    { label: 'In Review', badge: 'bg-blue-50 text-blue-600' },
  published: { label: 'Published', badge: 'bg-emerald-50 text-emerald-600' },
  archived:  { label: 'Archived',  badge: 'bg-zinc-100 text-zinc-500' },
}

export interface MissionVersionRow {
  id: string
  language: Lang
  title: string
  subtitle: string | null
  tip_text: string | null
  media_url: string | null
  content_json: Record<string, unknown>
  published: boolean
  status: ContentStatus
  revision_number: number
  is_current: boolean
  created_at: string
}

export interface MissionRow {
  id: string
  type: MissionType
  sequence: number
  stars: number
  duration_minutes: number
  category_slug: string
  active: boolean
  story_id: string | null
  mission_versions: MissionVersionRow[]
}

// The editable row for a language: the is_current=true revision (may be a
// draft sitting alongside a still-published older revision).
export function currentVersion(m: MissionRow, lang: Lang): MissionVersionRow | undefined {
  return m.mission_versions.find(v => v.language === lang && v.is_current)
}

// The row learners actually see for a language (may differ from
// currentVersion while a draft revision is being edited).
export function publishedVersion(m: MissionRow, lang: Lang): MissionVersionRow | undefined {
  return m.mission_versions.find(v => v.language === lang && v.published)
}

export type CoverageLevel = 'single' | 'partial' | 'full'

export interface TranslationCoverage {
  level: CoverageLevel
  count: number
}

// Counts languages with a non-empty current title — pure client-side
// classification, no schema change.
export function translationCoverage(m: MissionRow): TranslationCoverage {
  const count = LANGUAGES.filter(lang => (currentVersion(m, lang)?.title ?? '').trim().length > 0).length
  const level: CoverageLevel = count >= 3 ? 'full' : count === 2 ? 'partial' : 'single'
  return { level, count }
}

export const COVERAGE_META: Record<CoverageLevel, { label: string; badge: string }> = {
  single:  { label: '🌐 Single Language',  badge: 'bg-gray-100 text-gray-500' },
  partial: { label: '🌐 Partial (2/3)',    badge: 'bg-amber-50 text-amber-600' },
  full:    { label: '🌐 Fully Translated', badge: 'bg-emerald-50 text-emerald-600' },
}

export interface StoryPageVersionRow {
  id: string
  language: Lang
  text: string | null
  audio_url: string | null
  published: boolean
}

export interface StoryPageRow {
  id: string
  story_id: string
  page_number: number
  image_url: string | null
  story_page_versions: StoryPageVersionRow[]
}

export interface PagePhotoConfig {
  x: number     // PDF points from left edge
  y: number     // PDF points from bottom edge (PDF coordinate system)
  size: number  // diameter in PDF points
}

export interface PersonalizationConfig {
  pages: Record<string, PagePhotoConfig>  // keyed by page_number as string
}

export interface StoryRow {
  id: string
  slug: string
  title: string
  cover_url: string | null
  sort_order: number
  is_active: boolean
  is_free: boolean
  status: 'draft' | 'review' | 'published' | 'retired'
  age_min: number | null
  age_max: number | null
  published_at: string | null
  theme_title: string | null
  theme_emoji: string | null
  is_personalizable?: boolean
  personalization_config?: PersonalizationConfig
  story_pages: StoryPageRow[]
  story_versions?: StoryVersionRow[]
  story_slots?: StorySlotRow[]
}

export interface StoryVersionRow {
  id: string
  story_id: string
  language: Lang
  title: string
  cover_url: string | null
  intro_video_url: string | null
  theme_song_url: string | null
  meet_characters_url: string | null
  story_intro_url: string | null
  status: ContentStatus
  published: boolean
}

export interface StorySlotRow {
  story_id: string
  slot_key: string
  mission_id: string
  sort_order: number
}

export const SLOT_KEYS = ['flipflop_audio', 'story_pdf', 'coloring', 'move_explore', 'sing_along', 'bonus_video'] as const
export type SlotKey = typeof SLOT_KEYS[number]

export const SLOT_META: Record<SlotKey, { emoji: string; label: string; type: MissionType }> = {
  flipflop_audio: { emoji: '🎧', label: 'FlipFlop Audio',    type: 'story' },
  story_pdf:      { emoji: '📖', label: 'Story PDF',         type: 'read' },
  coloring:       { emoji: '🎨', label: 'Coloring Activity', type: 'color' },
  move_explore:   { emoji: '🤸', label: 'Move & Explore',    type: 'move' },
  sing_along:     { emoji: '🎤', label: 'Sing Along',        type: 'sing' },
  bonus_video:    { emoji: '🎬', label: 'Bonus Video',       type: 'watch' },
}

export interface ColoringPageRow {
  id: string
  story_id: string
  page_number: number
  template_image_url: string | null
}

export interface ColoringBookRow {
  id: string
  slug: string
  title: string
  cover_url: string | null
  sort_order: number
  is_active: boolean
  theme_title: string | null
  theme_emoji: string | null
  coloring_pages: ColoringPageRow[]
}
