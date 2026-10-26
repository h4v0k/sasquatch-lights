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
3. Color sync: one switch makes a color pick apply to every zone (red/blue never copied to the front zones). Off while the Road lock is active. Garage also has a Match all lights wheel: one solid color on every light (red/blue left out so the front can match).
4. Modes: Road, Show, Night Glow built in; build, save, rename and delete custom modes.
5. Road lock: Auto (on over 15 mph by GPS speed, off after 2 minutes parked), On, or Parade (off while moving; resets to Auto on relaunch). Locked snaps lights to legal: headlights white, taillights red, accents any color but red/blue (red/blue shifts to the nearest allowed hue). Never fails open (default rules when the state is unknown). Always, locked or not: no red or blue (by hue, including ice blue) on headlights, grille or underglow. See docs/ROAD-LOCK.md.
6. Live car preview of havok's car (carbonized gray S650 convertible, bronze wheels, black splitter/skirts/diffuser, gloss-black Dark Horse-style wing, red interior) in side, front and rear views, showing current colors. Engine bay preview shows the hood up.
7. (Bluetooth phase) Connect to all five controllers at once and reconnect automatically when the car is started.
8. Large-text friendly (see CLAUDE.md).

## Nice to have (later)
- Home-screen widget (quick mode switch). Not a priority.
- Show-day auto-off timer (1h / 2h / 4h / off) to protect the battery.
- Breathe and strobe effects.

## Explicitly out
- Music sync.
- Chase / rainbow / animated effects.

## Distribution
- Android proven on the car 2026-10-26; havok is enrolling in the Apple Developer Program ($99/yr) for his own iPhone.
- Android: APK sideloaded from the `android-latest` release. iPhone: TestFlight (internal testing), built in CI (docs/IOS.md).
