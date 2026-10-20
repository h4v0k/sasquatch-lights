# Road lock

Not legal advice. Based on a reading of Florida Statutes chapter 316 on 2026-10-19; verify before relying on it. Rules live as data in `src/rules/`, one object per state.

## How it works (decided 2026-10-19)
- **The Road lock is a switch the user flips** (Garage screen and Devices screen; the header shows its state). It does not look at speed, GPS fixes or timers, and it's saved between launches (on by default).
- **Always, lock on or off:** no red or blue on the front-facing zones (headlights, grille, underglow). Checked by hue for any saturated color: red 340–20°, blue 190–260° (so ice blue is blocked; cyan, purple, pink, amber and bronze are allowed). Color sync never copies red or blue to those zones. Red or blue visible from the front is the police-light rule (FS 316.2397); using them to stop someone is a felony. Any such color shows white instead (`applyFrontFloor`), and the color pickers hide red and blue for those zones.
- **Lock on, state known with a rule set:** that state's rules apply. A mode outside them can't be picked, and an active one is paused (Road shows) until the lock is turned off. Edits are kept inside the rules.
- **Lock on, no location, a failed lookup, or no rule set for the state:** fails open (the last state is dropped). Only the red/blue front block applies.
- Location is foreground only and used just to find the state (one lookup on launch, every 10 minutes while the app is open and on returning to it). The coordinates go to Android's geocoder (Google); only the state is kept, in memory. Background location is blocked in the manifest.

## Florida (FL)
| Zone | With the Road lock on | Confidence | Basis |
|---|---|---|---|
| Headlights | On, white only, steady | statute | FS 316.220 (headlamps white) |
| Taillights | On, red only, steady | statute | FS 316.221 (tail lamps red); 316.234 (stop/turn red or amber) |
| Underglow | Steady white, amber, green, Sasquatch green or bronze; max 60% brightness | unsettled | No statute covers underglow. Applied by analogy to FS 316.2397(1),(2),(7): no red, red/white or blue visible from the front, blue banned for non-exempt vehicles, no flashing |
| Grille | Off | conservative | Front-facing; avoid looking like an added headlamp |
| Engine bay | Off | conservative | Hidden under the hood while driving |

Flashing, strobing and color cycling count as flashing (316.2397(7)); v1 has solid colors only.

Parked or at a show (private property): no rule found. Unverified.

## Other states often said to ban underglow while driving (unverified)
California (color limits, not an outright ban), New York, New Jersey, Pennsylvania, Illinois, Massachusetts, Michigan, Virginia, Texas, Oregon. Research each before adding a rule set; until then they fail open (red/blue front block only).
