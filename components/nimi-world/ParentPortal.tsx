"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useNimiTheme } from "./NimiThemeProvider";
import { KID_VERSIONS, KID_VERSION_IDS, TARMAC_TILES, WORLD_THEMES, WORLD_THEME_IDS, versionForAge } from "./themes";
import type { WorldChild, WorldData } from "./worldData";

const T = {
  fr: {
    title: "Espace parents", close: "Fermer", explorer: "Explorateur", progress: "Progression", mission: "Mission en cours",
    noStory: "Aucune histoire en cours", stars: "Étoiles", streak: "Série", level: "Niveau", stamps: "Tampons",
    journey: "Parcours", done: "Terminée", current: "En cours", open: "Disponible", locked: "Verrouillée",
    experience: "Expérience", version: "Version", auto: "Auto (âge)", world: "Monde", lang: "Langue du monde",
    links: "Raccourcis", parents: "Tableau de bord parents", settings: "Paramètres", profile: "Profil de l'enfant",
    hint: "Cet espace s'ouvre en maintenant l'emblème des ailes (en haut à droite) pendant 3 secondes.",
  },
  en: {
    title: "Parent area", close: "Close", explorer: "Explorer", progress: "Progress", mission: "Current mission",
    noStory: "No story in progress", stars: "Stars", streak: "Streak", level: "Level", stamps: "Stamps",
    journey: "Journey", done: "Done", current: "In progress", open: "Available", locked: "Locked",
    experience: "Experience", version: "Version", auto: "Auto (age)", world: "World", lang: "World language",
    links: "Shortcuts", parents: "Parent dashboard", settings: "Settings", profile: "Child profile",
    hint: "This area opens by holding the wing emblem (top right) for 3 seconds.",
  },
} as const;

export default function ParentPortal({
  data, kids, activeChildId, childAge, onSelectChild, onNavigate, onClose, extras,
}: {
  /** App-specific parent notices (trial / subscription) shown at the top. */
  extras?: ReactNode;
  data: WorldData;
  kids: WorldChild[];
  activeChildId: string | null;
  childAge: number | null;
  onSelectChild?: (id: string) => void;
  onNavigate: (href: string) => void;
  onClose: () => void;
}) {
  const { theme, version, lang, versionPinned, setTheme, setVersion, setLang } = useNimiTheme();
  const t = T[lang];
  const panel = useRef<HTMLDivElement>(null);
  const story = data.stories.find((s) => s.id === data.currentStoryId);
  const done = data.slots.filter((s) => s.completed).length;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("button, a[href]");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);

  const chip = (active: boolean) => ({
    background: active ? "#C9A84C" : "rgba(255,255,255,0.06)",
    color: active ? "#06101F" : "#E2E8F0",
    border: `1.5px solid ${active ? "#C9A84C" : "rgba(255,255,255,0.14)"}`,
  });

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-6"
      style={{ zIndex: 60, background: "rgba(2,6,23,0.72)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nw-parent-title"
        className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-3xl p-5 font-nunito sm:p-7"
        style={{ background: "linear-gradient(160deg, #0B1A33, #06101F)", border: "1.5px solid rgba(201,168,76,0.45)", color: "#E2E8F0", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", userSelect: "text" }}
        initial={{ y: 30, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: "#C9A84C" }}>Nimipiko Airways</p>
            <h2 id="nw-parent-title" className="font-baloo text-2xl font-extrabold text-white">🔒 {t.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold" style={chip(false)}>✕ {t.close}</button>
        </div>

        {extras && <div className="mt-4">{extras}</div>}

        {kids.length > 1 && onSelectChild && (
          <section className="mt-5">
            <h3 className="mb-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: "#C9A84C" }}>{t.explorer}</h3>
            <div className="flex flex-wrap gap-2">
              {kids.map((k) => (
                <button key={k.id} type="button" onClick={() => onSelectChild(k.id)} aria-pressed={k.id === activeChildId}
                  className="rounded-full px-4 py-2 text-sm font-bold" style={chip(k.id === activeChildId)}>
                  {k.name}{k.age != null ? ` · ${k.age}` : ""}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5">
          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: "#C9A84C" }}>{t.progress} — {data.childName}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[[t.stars, `⭐ ${data.stars}`], [t.streak, `🔥 ${data.streak}`], [t.level, `${data.level} · ${data.xpPct}%`], [t.stamps, `🛂 ${data.stamps.length}`]].map(([k, v]) => (
              <div key={k} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{k}</p>
                <p className="font-baloo text-xl font-extrabold text-white">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{t.mission}</p>
            {story ? (
              <>
                <p className="font-baloo text-lg font-extrabold text-white">{story.emoji} {story.title} <span className="text-sm opacity-70">· {done}/{data.slots.length}</span></p>
                <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {TARMAC_TILES.map((tile) => {
                    const slot = data.slots.find((s) => s.slotKey === tile.slotKey);
                    if (!slot) return null;
                    return (
                      <li key={tile.slotKey} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm" style={{ background: slot.completed ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.04)" }}>
                        <span aria-hidden="true">{slot.completed ? "✅" : tile.emoji}</span>
                        <span className={slot.completed ? "text-white" : "opacity-75"}>{lang === "fr" ? tile.fr : tile.en}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : <p className="opacity-75">{t.noStory}</p>}
          </div>
          <details className="mt-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <summary className="cursor-pointer text-sm font-bold">{t.journey} ({data.stories.filter((s) => s.complete).length}/{data.stories.length})</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {data.stories.map((s) => {
                const st = s.id === data.currentStoryId ? t.current : s.complete ? t.done : s.unlocked ? t.open : t.locked;
                return <li key={s.id} className="flex justify-between gap-3"><span>{s.emoji} {s.title}</span><span className="opacity-70">{st}</span></li>;
              })}
            </ul>
          </details>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: "#C9A84C" }}>{t.experience}</h3>
          <p className="mb-1.5 text-sm font-bold">{t.version}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setVersion(null)} aria-pressed={!versionPinned} className="rounded-full px-3 py-1.5 text-sm font-bold" style={chip(!versionPinned)}>
              {t.auto} → {KID_VERSIONS[versionForAge(childAge)].emoji}
            </button>
            {KID_VERSION_IDS.map((id) => {
              const v = KID_VERSIONS[id];
              const active = versionPinned && version.id === id;
              return (
                <button key={id} type="button" onClick={() => setVersion(id)} aria-pressed={active} className="rounded-full px-3 py-1.5 text-sm font-bold" style={chip(active)}>
                  {v.emoji} {v.name[lang]} · {v.ages}
                </button>
              );
            })}
          </div>
          <p className="mb-1.5 mt-3 text-sm font-bold">{t.world}</p>
          <div className="flex flex-wrap gap-2">
            {WORLD_THEME_IDS.map((id) => (
              <button key={id} type="button" onClick={() => setTheme(id)} aria-pressed={theme.id === id} className="rounded-full px-3 py-1.5 text-sm font-bold" style={chip(theme.id === id)}>
                {WORLD_THEMES[id].emoji} {WORLD_THEMES[id].name[lang]}
              </button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-sm font-bold">{t.lang}</p>
          <div className="flex gap-2">
            {(["fr", "en"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className="rounded-full px-3 py-1.5 text-sm font-bold" style={chip(lang === l)}>
                {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: "#C9A84C" }}>{t.links}</h3>
          <div className="flex flex-wrap gap-2">
            {[["/parents", `📊 ${t.parents}`], ["/settings", `⚙️ ${t.settings}`], ["/user-profile", `🧒 ${t.profile}`]].map(([href, label]) => (
              <button key={href} type="button" onClick={() => onNavigate(href)} className="rounded-full px-4 py-2 text-sm font-bold" style={chip(false)}>{label}</button>
            ))}
          </div>
        </section>
        <p className="mt-5 text-xs opacity-60">{t.hint}</p>
      </motion.div>
    </motion.div>
  );
}
