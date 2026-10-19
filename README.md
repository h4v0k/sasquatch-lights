# Sasquatch Lights

Phone app for the custom lighting on havok's 2026 Mustang GT convertible (@67sasquatch): Heritage X RGB head and taillights, OPT7 Aura Pro underglow, grille and engine bay lights. One app for all five zones, with Road, Show and Night Glow modes, custom modes, color sync, and a road lock that keeps the car legal while driving.

Status: design mockup done, protocol drivers written, app scaffold next. See `docs/PLAN.md`.

- `docs/` requirements, Bluetooth protocols, road-lock rules, build plan
- `src/protocol/` controller drivers (pure byte builders)
- `src/rules/` road-lock rules by region
- `tools/lights-test.html` Web Bluetooth tester (also live at https://67sasquatch.us/lights-test; open in Chrome on Android)
