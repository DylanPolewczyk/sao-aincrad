# Sword Art Online — Aincrad (Floor 1)

A from-scratch, lore-accurate recreation of Floor 1 of Aincrad built with
three.js. Every model, effect, and sound is procedural — no downloaded assets.
Cel-shaded with outlines and bloom for the anime look.

## Run it

```
npm install
npm run dev
```

Open http://localhost:5173 and hit **LINK START**.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move (camera-relative) |
| Mouse | Camera (click canvas to lock pointer) |
| Left click | Sword attack (3-hit combo) |
| 1 | **Horizontal** — 360° spin attack |
| 2 | **Rage Spike** — dashing thrust |
| 3 | **Vertical Arc** — two heavy V-shaped cuts |
| E | Talk / interact |
| Space / Shift | Jump / Sprint |
| Mouse wheel | Zoom · Esc releases the pointer |

## Floor 1, as in canon

- **The opening ceremony** — on your first Link Start, the sky fills with red
  warning hexagons and the giant hooded GM avatar delivers Kayaba Akihiko's
  announcement over the Town of Beginnings. (Enter/E to advance.)
- **Town of Beginnings** (south) — walled city with the Teleport Plaza and its
  sealed Teleport Gate, market stalls, wandering NPCs, and the **Black Iron
  Palace** housing the **Monument of Life** (press E to read it).
- **Horunka Village** (western forest) — home of the canon quest **"The Secret
  Medicine of the Forest"**: a village woman needs a **Little Nepent's Ovule**
  for her sick daughter. Hunt the flowered Nepent in the forest; the reward is
  the **Anneal Blade**.
- **Tolbana** (north) — the windmill town where the boss raid was planned,
  complete with a small amphitheater.
- **The Labyrinth** (far north) — the tower to Floor 2. Inside waits
  **Illfang the Kobold Lord**: four HP bars, Bone Axe and Leather Buckler,
  **Ruin Kobold Sentinel** adds at each bar break — and on his last bar he
  throws both away and draws the **Talwar**, gaining leaping attacks and speed.
  The Last Attack bonus is, of course, the **Coat of Midnight**.
- **Bestiary** — Frenzy Boars in the starting plains, Dire Wolves further out,
  Little Nepents in the forest, Ruin Kobold Troopers on the Labyrinth approach.
- Rolling terrain with painted roads, a lake, drifting clouds below the island
  edge, and the shadowed underside of Floor 2 far overhead — you live inside
  Aincrad.

Progress (level, XP, Col, quest, gear, boss clear) auto-saves to localStorage.

## Code map

| File | What it is |
| --- | --- |
| `index.html` | HUD, dialog/quest UI, Link Start intro, Kayaba overlay |
| `src/main.js` | Bootstrap, bloom pipeline, camera, intro sequence, interactions |
| `src/modelkit.js` | Toon materials, outlines, weapon/part builders |
| `src/terrain.js` | Heightfield island, painted roads/plazas, lake |
| `src/world.js` | All Floor 1 landmarks, vegetation instancing, villagers |
| `src/characters.js` | Kirito rig, villager NPCs, the GM avatar |
| `src/enemies.js` | Bestiary models, AI, Illfang phase logic |
| `src/quests.js` | The Horunka medicine quest |
| `src/player.js` | Movement, combos, sword skills, gear rewards |
| `src/effects.js` | Polygon-shatter deaths, sword trails, sparks |
| `src/ui.js` | HUD/DOM: bars, damage numbers, dialog, announcements |
| `src/audio.js` | All-procedural WebAudio SFX + ambient BGM |

`window.__game` is exposed in the console for debugging.
