# Sasquatch Lights — notes for Claude

havok's phone app to control the custom lighting on his 2026 Mustang GT convertible (show car). Android first (a spare Android phone that lives in the car); iPhone later, once the Bluetooth proof works.

Read these before writing code:
- `docs/REQUIREMENTS.md` — what to build and the decisions already made
- `docs/PROTOCOLS.md` — Bluetooth command sets for every controller
- `docs/ROAD-LOCK.md` — the Road lock switch and the Florida rules applied when it's on
- `docs/PLAN.md` — build order for the first working version
- `docs/IOS.md` — Apple account, secrets and TestFlight

## Stack (decided)
- Expo SDK 54 (React Native) + TypeScript. Bluetooth needs native code, so no Expo Go: the APK is a release build from `expo prebuild` + Gradle on GitHub Actions (`.github/workflows/android.yml`), published to the `android-latest` release. iPhone: `.github/workflows/ios.yml` (macOS runner, cloud signing via an App Store Connect API key, upload to TestFlight on every push to main; skips until the Apple secrets exist). Setup in `docs/IOS.md`.
- Bluetooth: `react-native-ble-plx` via its Expo config plugin.
- Location: `expo-location`, foreground only: GPS speed for the Auto Road lock (on over 15 mph, off after 2 minutes parked) and the state for its rules. Lock modes: Auto / On / Parade (`src/roadlock/`).
- State: plain React state + a small store (Zustand is fine); modes persist with `@react-native-async-storage/async-storage`.
- No backend. Everything runs on the phone.

## Architecture rules
- Every controller type is a **driver** in `src/protocol/` implementing `LightDriver` (`src/protocol/types.ts`). Drivers are pure: they return byte arrays and never touch Bluetooth. The BLE layer looks up the write characteristic the driver names and sends the bytes.
- Protocols are unverified on havok's hardware. Assume ELK-BLEDOM for the three Opt7 boxes and HappyLighting/Triones for the Heritage X head and taillights, and keep it trivial to swap a zone's driver (setting per device, auto-guessed from the advertised name).
- Road-lock rules are data (`src/rules/`), keyed by region, never hard-coded in screens. Unknown region = `BASELINE` rules (the lock never fails open). Locked means snap (`clampToRules`), never block or swap modes. Red/blue on front zones is always blocked (`applyFrontFloor`).
- Pairing: assigned controllers are saved by device ID (MAC on Android, a per-phone UUID on iOS). "Lock these lights" stops all scanning; the app only reconnects to saved IDs. Connects run one at a time; a retry first listens for that one box.
- Colors go to the lights at full LED drive (`fullDrive`: brightest channel 255, same hue); dimming is only the brightness slider.
- The UI never talks to Bluetooth directly: it goes through `LightTransport` (`src/transport/types.ts`). `DemoTransport` logs packets until `src/transport/ble.ts` exists.
- Solid colors only in v1 (no effects). havok explicitly does not want music sync or chase/rainbow effects.

## The user
- Reads with enlarged phone text: body text ≥ 16pt, nothing under 14pt, touch targets ≥ 44pt, layouts must survive large Dynamic Type.
- Wants the objective truth, not reassurance; push back when something won't work.
- Prefers cheaper subagents for mechanical work.

## Commits
Small, focused commits on `main` are fine for now (solo project).

## Testing
`npm test` runs the pure logic tests (`src/**/*.test.ts`). This cloud workspace can't reach npm, so CI is where installs, typecheck, tests and builds run.
