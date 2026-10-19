# Requirements

Status as of 2026-10-19. Mockup: Design canvas "Sasquatch Lights" on claude.ai (https://claude.ai/artifact/H1oPMkAVX66aLANJaFskaL, private to havok). It is a working click-through of every screen below; match its structure and behavior.

## Hardware (installing the week of Oct 19, 2026)
| Zone | Product | Controller / app today | Assumed protocol |
|---|---|---|---|
| Headlights | Auto Addict USA Heritage X RGB headlights | HappyLighting app | Triones (HappyLighting) |
| Taillights | Auto Addict USA Heritage X RGB taillights | HappyLighting app | Triones (HappyLighting) |
| Underglow | OPT7 Aura Pro RGB aluminum underglow (Amazon B07NSNKQJV) | OPT7 PLUS app, own box | ELK-BLEDOM |
| Grille | OPT7 Aura Pro RGB grille accent (B07NSGQ4DG) | OPT7 PLUS app, own box | ELK-BLEDOM |
| Engine bay | OPT7 Aura Pro RGB car hood accent (B0DVYHFFCK) | OPT7 PLUS app, own box | ELK-BLEDOM |

All Opt7 kits are plain RGB (one color per box at a time), not addressable. Each box also has an RF remote. OPT7 PLUS (developer "W Group") shows devices named ELK-BLEDOM in its App Store screenshots, which is the basis for the ELK assumption. Heritage X controller count (one box for both headlights, or one per side) is unknown until install.

## Must have (v1)
1. Five zones: headlights, taillights, underglow, grille, engine bay. Each has power, color, brightness.
2. Color: 11 presets (White, Amber, Red, Sasquatch green, Bronze, Green, Cyan, Ice blue, Blue, Purple, Pink) plus a custom picker.
3. Color sync: one switch makes a color pick apply to every zone. Off in Road mode.
4. Modes: Road, Show, Night Glow built in; build, save, rename and delete custom modes.
5. Road lock: while driving, only modes that meet the Road lock rules may run; anything else falls back to Road mode, and editing locks until the car is parked. Rules in `docs/ROAD-LOCK.md`. Headlights and taillights are limited to legal colors in Road mode; underglow is limited to its allowed colors and capped brightness, and off in states without a rule set.
6. Live car preview of havok's car (carbonized gray S650 convertible, bronze wheels, black splitter/skirts/diffuser, gloss-black Dark Horse-style wing, red interior) in side, front and rear views, showing current colors. Engine bay preview shows the hood up.
7. Connects to all five controllers at once and reconnects automatically when the car is started.
8. Large-text friendly (see CLAUDE.md).

## Nice to have (later)
- Home-screen widget (quick mode switch). Not a priority.
- Show-day auto-off timer (1h / 2h / 4h / off) to protect the battery.
- Breathe and strobe effects.

## Explicitly out
- Music sync.
- Chase / rainbow / animated effects.

## Distribution
- No Apple Developer account yet; havok buys it ($99/yr) once the app is proven.
- Until then: Android APK sideloaded on the spare phone; iPhone via Xcode with a free Apple ID (reinstall every 7 days).
