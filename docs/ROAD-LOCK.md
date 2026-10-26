# Road lock

Not legal advice. Based on a reading of Florida Statutes chapter 316 on 2026-10-19; verify before relying on it. Rules live as data in `src/rules/`, one object per state.

## How it works (decided 2026-10-26; replaces the 2026-10-19 manual switch)
- **Auto (default):** the lock turns on when GPS speed reads 15 mph or more twice in a row, and lets go after 2 minutes stopped (under 3 mph) or 2 minutes with no GPS reading. A red light doesn't unlock it.
- **On:** locked all the time. **Parade:** unlocked even while moving (fast parade, cruise-in). Parade is never saved: a relaunch comes back in Auto, so a forgotten override doesn't ride home with you.
- Auto with location permission denied stays locked (it can never see speed). No GPS fix (indoors, GPS off) counts as parked.
- Speed is only watched while the app is open on screen (foreground location, background blocked in the manifest). With the app closed, the lights keep whatever they last showed.
- **Locked = snap, not block.** The active mode keeps running, pushed to the limits: headlights on and white, taillights on and red, underglow/grille/engine bay keep their color unless it's red or blue, which moves to the nearest allowed hue at the same saturation and brightness (red to orange or pink, blue to cyan or purple). Accents you have off stay off; accents you turn on under the lock can be any color but red or blue. The mode's saved colors are untouched and come back when unlocked.
- **The lock never fails open.** With no location or no rule set for the state, the default rules (same as Florida) apply: white headlamps and red tail lamps are required in every state (FMVSS 108).
- **Always, locked or not:** no red or blue on the front-facing zones (headlights, grille, underglow). Checked by hue for any saturated color: red 340–20°, blue 190–260° (so ice blue is blocked; cyan, purple, pink, amber and bronze are allowed). Color sync and Match all lights never copy red or blue to those zones; any such color shows white instead (`applyFrontFloor`). This also covers driving under 15 mph, where Auto hasn't locked yet: blue is banned on any non-police vehicle at any speed (FS 316.2397(2)).
- Location also finds the state (one lookup on launch, every 10 minutes while open, and on returning to the app). The coordinates go to the phone's geocoder (Google on Android, Apple on iPhone); only the state is kept, in memory.

## Florida (FL)
| Zone | Locked | Confidence | Basis |
|---|---|---|---|
| Headlights | On, white only, steady | statute | FS 316.220 (headlamps white) |
| Taillights | On, red only, steady | statute | FS 316.221 (tail lamps red); 316.234 (stop/turn red or amber) |
| Underglow | Any steady color except red or blue | unsettled | No statute covers underglow. FS 316.2397(1),(2),(7): no red, red/white or blue visible from the front, blue banned for non-exempt vehicles, no flashing |
| Grille | Any steady color except red or blue | unsettled | Same as underglow (front-facing, so red/blue matters most here) |
| Engine bay | Any steady color except red or blue | unsettled | Same; hidden under the hood while driving |

Flashing, strobing and color cycling count as flashing (316.2397(7)); v1 has solid colors only. The earlier 60% underglow cap and grille/engine-off rules were cautious guesses with no statute behind them and were dropped on 2026-10-26.

Parked or at a show (private property): no rule found. Unverified.

## Other states often said to ban underglow while driving (unverified)
California (color limits, not an outright ban), New York, New Jersey, Pennsylvania, Illinois, Massachusetts, Michigan, Virginia, Texas, Oregon. Research each before adding a rule set; until then they fail open (red/blue front block only).
