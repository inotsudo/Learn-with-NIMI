---
name: kids-3d-design
description: Builds a full-bleed, cinema-grade spatial 3D/2.5D interactive experience for Learn-with-NIMI (NIMIPIKO Airways) using full-screen assets in /public/now without fake 2D vector clutter.
---

# NIMIPIKO Airways — Cinema-Grade Spatial World Rules

## 1. Visual Purity Rules (STRICT)
- **Full-Bleed Artwork (`100vw x 100vh`):** Every scene image (`/now/scenes/scene-*.png`) and video (`/now/videos/Intro.mp4`) MUST fill the entire viewport edge-to-edge (`w-screen h-screen object-cover`). NEVER put radial vignette masks, dark borders, or boxed frames around scene images.
- **NO Fake Vector Clutter:** Strictly forbid drawing 2D SVG triangles, flat vector clouds, harsh CSS sunbursts, or cartoon clip-art shapes on top of the Pixar-rendered scenes. Let the rich 3D-illustrated artwork shine unedited.
- **No Overlapping UI Clutter:** Never place opaque circular buttons on top of characters' faces or the illustrated *Kit des Champions* suitcase.

## 2. Diegetic In-World Interaction & Real 3D (`React Three Fiber`)
- **Invisible / Glowing Aura Hotspots:** Place subtle, soft golden shimmer hotspots directly over elements in the scene artwork (e.g., over the **Kit des Champions suitcase**, **Piko the drone**, or the **Boarding Gate / Airplane**) that gently pulse and scale on hover.
- **Interactive 3D Inspector (`@react-three/fiber` + `@react-three/drei`):** When a child taps the **Kit des Champions** hotspot, open an interactive 3D studio overlay where they can rotate and tap a real 3D-modeled **Kit des Champions Case**, flip open their **3D Gold-Embossed Passeport Voyage Nimipiko**, or spin a **3D Golden Airplane/Globe**.
- **6 Mission Runway Tiles:** Render the 6 learning activities (*FlipFlop Audio, Histoire PDF, Coloriage, Bouge avec Nimi, Karaoké, Vidéo Bonus*) as perspective-angled **glowing golden runway floor tiles** integrated cleanly at the bottom edge of the tarmac/cabin floor (or inside the opened 3D Kit), styled with warm translucent glass, gold borders, and 3D depth (`transform: perspective(800px) rotateX(28deg)`).

## 3. Multi-Theme & Multi-Version System (`NimiThemeProvider`)
- **4 World Themes:** Use non-destructive atmospheric lighting overlays (`mix-blend-mode`, warm golden sun-dust particles via Three.js `<Points>`, subtle color-grading filters) so switching between **Golden Sunset Kingdom**, **Starlight Night Flight**, **Emerald Jungle Islands**, and **Cloud Carnival** transforms the mood without covering the artwork.
- **3 Kid Versions + Parent Lock:**
  - *Little Explorers (2–5):* Pure visual hotspots + Piko voice/sparkle guidance, zero text clutter.
  - *Junior Champions (6–8):* 6 glowing mission runway tiles + collectible 3D passport stamps.
  - *Sky Navigators (9–12):* Interactive 3D flight globe, XP level ring, and bilingual FR/EN toggle.
  - *Parent Portal:* Hidden behind a 3-second long-press on a subtle corner wing emblem.

## 4. Verification
- Inspect `http://localhost:3000` with **Playwright MCP** and verify that the scene fills 100% of the screen cleanly with zero fake SVG shapes or overlapping buttons.
