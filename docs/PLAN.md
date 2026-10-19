# Build plan

## Status (2026-10-19)
Done without Bluetooth:
- Expo app (Android first): Garage, Zone, Modes, Build a mode, Devices screens; car preview from photos of havok's car.
- Modes (Road, Show, Night Glow + custom: build, edit, delete), color sync, all off, saved on the phone.
- Road lock: GPS speed latch (on over 5 mph, off after a minute stopped), state from GPS, Florida rules, strictest rules for unknown states, lock stays on if location is off. "Simulate driving" can only turn the lock on.
- Light engine: turns the effective mode into packets per controller with the drivers in `src/protocol/`, sends only what changed.
- `DemoTransport` stands in for Bluetooth: scan finds two fake controllers and the Devices screen shows every packet that would be sent.
- CI (`.github/workflows/android.yml`): typecheck, unit tests, release APK on every push to `main`, published to the `android-latest` GitHub release.

## Next: Bluetooth (after the Wednesday capture)
1. Run https://67sasquatch.us/lights-test on the Android phone, connect each box, run the test, copy the log. Update `docs/PROTOCOLS.md` and `guessDriver()` if a box needs a different driver.
2. Write `src/transport/ble.ts` implementing `LightTransport` with `react-native-ble-plx` (already in the native build):
   - Ask for Bluetooth permissions on Android 12+ (BLUETOOTH_SCAN, BLUETOOTH_CONNECT) at first scan.
   - `scan`: `startDeviceScan(null, { allowDuplicates: false })`, report name + rssi.
   - `connect`: `connectToDevice`, `discoverAllServicesAndCharacteristics`, find the driver's write characteristic, run driver `init`, keep a map of characteristics; auto-reconnect on disconnect with backoff.
   - `send`: serialize per device, `writeWithoutResponse` (base64 of the bytes), wait `gapMs` between packets.
3. In `src/App.tsx`, replace `new DemoTransport()` with the BLE transport (keep demo as a fallback when Bluetooth is off).
4. Reconnect all assigned controllers on app start.

## Later
- iPhone: Xcode with a free Apple ID (7-day installs) or the paid developer account + EAS.
- Show-day auto-off timer, home-screen widget, more states' rule sets.
