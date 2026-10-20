# Sasquatch Lights

Phone app for the custom lighting on havok's 2026 Mustang GT convertible (@67sasquatch): Heritage X RGB head and taillights, OPT7 Aura Pro underglow, grille and engine bay lights. One app for all five zones, with Road, Show and Night Glow modes, custom modes, color sync, and a Road lock switch that applies Florida lighting limits when it's on (based on a reading of the statutes, not legal advice). Red and blue are always blocked on the front lights.

Status: Android app built without Bluetooth (a demo transport logs the commands). Bluetooth comes after the hardware capture. See `docs/PLAN.md`.

## Install on the Android phone
Every push to `main` builds an APK and puts it on the **Android (latest)** release (`android-latest`). The repo is private, so open the release while signed in to GitHub (the GitHub app or a signed-in browser), download `sasquatch-lights.apk`, and open it. Allow installs from that app once. Updates install over the old one and keep your modes (same signing key every build).

## Privacy
Location is only used to find which state you're in: Android's built-in reverse geocoder (Google) is called on launch and every 10 minutes while the app is open; only the state is kept, in memory. No background location.

- `docs/` requirements, Bluetooth protocols, road-lock rules, build plan
- `src/protocol/` controller drivers (pure byte builders)
- `src/rules/` road-lock rules by region
- `tools/lights-test.html` Web Bluetooth tester (also live at https://67sasquatch.us/lights-test; open in Chrome on Android)
