# Road lock rules

Not legal advice. Based on a reading of Florida Statutes chapter 316 on 2026-10-19; verify before relying on it. Rules live as data in `src/rules/`, one object per region.

## Florida (FL)
| Zone | While driving | Confidence | Basis |
|---|---|---|---|
| Headlights | On, white only, steady | statute | FS 316.220 (headlamps white) |
| Taillights | On, red only, steady | statute | FS 316.221 (tail lamps red); 316.234 (stop/turn red or amber) |
| Underglow | Steady white, amber, green, Sasquatch green or bronze; max 60% brightness | unsettled | No statute covers underglow. Applied by analogy to FS 316.2397(1),(2),(7): no red, red/white or blue visible from the front, blue banned for non-exempt vehicles, no flashing |
| Grille | Off | conservative | Front-facing; avoid looking like an added headlamp |
| Engine bay | Off | conservative | Hidden under the hood while driving |

Flashing, strobing and color cycling count as flashing (316.2397(7)), so every zone is steady while driving.

Parked or at a show (private property): no rule found; all colors and effects allowed. Unverified.

## Unknown region
Strictest set: headlights white, taillights red, underglow / grille / engine bay off.

## What counts as driving
GPS speed over 5 mph turns the lock on. It stays on until the car has been under 1 mph for 90 seconds (the app can't read the gear selector), so most red lights keep edits locked. Until there is a GPS fix less than 15 seconds old (app just opened, no permission, location off, lost signal) the lock is on. Headlights and taillights are forced on while the lock is on.

A GPS fix only counts if its speed can be trusted. Android reports 0 when it has no speed, so a reported speed under 5 mph only counts when the distance moved since the previous fix (1–10 s earlier, accuracy within 50 m) agrees; the app uses the higher of the two. Old, cached or out-of-order fixes are ignored.

Known limit: if location isn't allowed all the time and the app is closed or in the background, nothing watches the speed, so the lights keep whatever they last showed.

With location allowed all the time, Android keeps tracking with the screen off (a notification shows while it runs) and the app stays alive to update the lights. Without it, the app keeps the screen on while it's open. If the app is swiped away, nothing can update the lights: they keep whatever they last showed.

## Other states often said to ban underglow while driving (unverified)
California (color limits, not an outright ban), New York, New Jersey, Pennsylvania, Illinois, Massachusetts, Michigan, Virginia, Texas, Oregon. Research each before adding a rule set.
