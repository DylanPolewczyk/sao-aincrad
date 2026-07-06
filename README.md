# Sword Art Online — Aincrad (Floor 1)

A from-scratch SAO-inspired 3D action RPG built with three.js. Every model,
effect, and sound is procedural — no downloaded assets.

## Run it

```
npm install
npm run dev
```

Then open http://localhost:5173 and hit **LINK START**.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move (camera-relative) |
| Mouse | Camera (click canvas to lock pointer) |
| Left click | Sword attack (3-hit combo) |
| 1 | **Horizontal** — 360° spin attack |
| 2 | **Rage Spike** — dashing thrust |
| 3 | **Starburst** — 8-hit flurry |
| Space / Shift | Jump / Sprint |
| Mouse wheel | Zoom camera |
| Esc | Release pointer |

## The game

- **Town of Beginnings** (center) is a safe zone — enemies can't touch you and HP regenerates.
- **Frenzy Boars** roam the nearby meadows (start here at level 1), **Dire Wolves** prowl further out, and **Kobold Sentinels** guard the road south.
- The dirt road leads to the boss arena: **Illfang the Kobold Lord**, with four HP bars. Walking through the gate starts the fight. Level up first — he hits hard and has a telegraphed ground slam (get out of the red ring).
- Kill enemies for XP and Col; enemies shatter into blue polygons, SAO-style. Progress (level, XP, Col, boss clear) auto-saves to localStorage.

## Code map

| File | What it is |
| --- | --- |
| `index.html` | HUD (HP/XP bars, target frame, boss bars, hotbar), Link Start intro, overlays |
| `src/main.js` | Game bootstrap, input, third-person camera, boss trigger, save/load |
| `src/world.js` | Floating island, Town of Beginnings, boss arena, sky, collision |
| `src/player.js` | Procedural swordsman, movement, combo attacks, sword skills |
| `src/enemies.js` | Boar/wolf/kobold/boss models, AI (wander → aggro → attack), spawner |
| `src/effects.js` | Polygon-shatter deaths, sword trails, hit sparks, level-up pillar |
| `src/ui.js` | DOM HUD updates, floating damage numbers |
| `src/audio.js` | All-procedural WebAudio SFX + ambient BGM |

`window.__game` is exposed in the console for debugging.
