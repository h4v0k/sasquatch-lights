# Build plan (first working version)

Goal: by the end of install week, the app on the Android phone and havok's iPhone controls all five zones, switches modes, and enforces the road lock.

## 0. Install day: confirm protocols (havok, ~10 min)
Open https://67sasquatch.us/lights-test in Chrome on the Android phone, with OPT7 PLUS and HappyLighting closed. Connect each box, label its zone, tap **Run test**. If a box doesn't go red, green, blue, white, off, step through the protocol list. Tap **Copy log** and paste it into the session. That log tells us each box's name, services and working driver. Update `docs/PROTOCOLS.md` and the default driver per name.

## 1. Scaffold (Mac)
- Reinstall Xcode (App Store), open it once to accept the license and install iOS platform support.
- `npx create-expo-app@latest . --template blank-typescript`, then `npx expo install expo-dev-client react-native-ble-plx expo-location @react-native-async-storage/async-storage`.
- Add the ble-plx config plugin and iOS/Android Bluetooth and location permission strings in `app.json`.
- Keep `src/protocol/` and `src/rules/` as they are; add unit tests (Jest) for every driver's bytes against `docs/PROTOCOLS.md` and for `meetsRoadLock`.

## 2. Bluetooth layer
- Scan filtered by `ALL_SERVICES`; remember each device by id with its zone and driver (AsyncStorage).
- One connection manager per device: connect, discover, find the driver's write characteristic, run `init`, serialize writes with `writeGapMs`, auto-reconnect.
- `applyZone(zone, state)` sends `packetsFor(driver, state)`.

## 3. Screens (match the mockup)
Garage (car preview, mode chips, five zones, color sync, all off), Zone detail, Modes, Build a mode, Devices & rules. The car preview SVG is in the mockup's `Car.dc.html`; port it to `react-native-svg`.

## 4. Road lock
- `expo-location` speed; over 5 mph = driving; latch until stationary for a set time (or in Park if we ever read the car's gear).
- Region from reverse geocoding the GPS fix (state code), `rulesFor(code)`.
- While driving: active mode must pass `meetsRoadLock`, else apply Road; editing disabled.

## 5. Install on phones
- Android: `npx expo run:android --variant release`, or an EAS local build, then sideload the APK.
- iPhone: `npx expo run:ios --device` with a free Apple ID signing team in Xcode. Reinstall every 7 days until the paid account.

## Later
Show-day auto-off timer, home-screen widget, breathe/strobe effects, more states' rule sets.
