# Sasquatch Lights — notes for Claude

havok's phone app to control the custom lighting on his 2026 Mustang GT convertible (show car). Cross-platform: iPhone first for daily use, a spare Android phone that lives in the car.

Read these before writing code:
- `docs/REQUIREMENTS.md` — what to build and the decisions already made
- `docs/PROTOCOLS.md` — Bluetooth command sets for every controller
- `docs/ROAD-LOCK.md` — Florida lighting rules the app enforces while driving
- `docs/PLAN.md` — build order for the first working version

## Stack (decided)
- Expo (React Native) + TypeScript, built as a **development build** (`expo-dev-client`), not Expo Go: Bluetooth needs native code.
- Bluetooth: `react-native-ble-plx` via its Expo config plugin.
- Location for the road lock: `expo-location` (speed from GPS).
- State: plain React state + a small store (Zustand is fine); modes persist with `@react-native-async-storage/async-storage`.
- No backend. Everything runs on the phone.

## Architecture rules
- Every controller type is a **driver** in `src/protocol/` implementing `LightDriver` (`src/protocol/types.ts`). Drivers are pure: they return byte arrays and never touch Bluetooth. The BLE layer looks up the write characteristic the driver names and sends the bytes.
- Protocols are unverified on havok's hardware. Assume ELK-BLEDOM for the three Opt7 boxes and HappyLighting/Triones for the Heritage X head and taillights, and keep it trivial to swap a zone's driver (setting per device, auto-guessed from the advertised name).
- Road-lock rules are data (`src/rules/`), keyed by region, never hard-coded in screens.
- Solid colors are the core. havok explicitly does not want music sync or chase/rainbow effects. Breathe and strobe are fine as extras.

## The user
- Reads with enlarged phone text: body text ≥ 16pt, nothing under 14pt, touch targets ≥ 44pt, layouts must survive large Dynamic Type.
- Wants the objective truth, not reassurance; push back when something won't work.
- Prefers cheaper subagents for mechanical work.

## Commits
Small, focused commits on `main` are fine for now (solo project).
