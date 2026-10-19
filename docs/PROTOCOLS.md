# Bluetooth protocols

Both protocols come from open-source integrations, not from havok's hardware. Treat them as the starting assumption and confirm with `tools/lights-test.html` (live at https://67sasquatch.us/lights-test, Chrome on Android) on install day.

All UUIDs below are 16-bit shorthand for `0000XXXX-0000-1000-8000-00805f9b34fb`. All writes are **write without response**. Leave ~100–300 ms between writes to the same box.

## ELK-BLEDOM family (Opt7 boxes, assumed)

Source: Home Assistant integration [dave-code-ruiz/elkbledom](https://github.com/dave-code-ruiz/elkbledom) v1.6.5 (`models.json`, `elkbledom.py`, `model.py`).

- Advertised names: `ELK*`, `MELK*`, `LEDBLE*`, `LED-*`, `JACKYLED*`, `XROCKER*`, `DMRRBA*`.
- Service `fff0`, write `fff3`, notify `fff4` (ELK/MELK). LEDBLE / LED- / JACKYLED / XROCKER use `ffe1`.
- Frame: 9 bytes, `7e … ef`. `i` = brightness 0–100. RGB 0–255.
- No handshake, except MELK: send `7e 07 83`, wait 1 s, `7e 04 04`, wait 1 s.
- State can't be read back reliably (the integration doesn't parse notifications). The app keeps its own state.

| Variant | Power on | Power off | Color | Brightness |
|---|---|---|---|---|
| ELK-BLEDOM (generic) | `7e 00 04 f0 00 01 ff 00 ef` | `7e 00 04 00 00 00 ff 00 ef` | `7e 00 05 03 r g b 00 ef` | `7e 00 01 i ff 00 ff 00 ef` |
| ELK-BLEDOM (handle 13) | `7e 04 04 f0 00 01 ff 00 ef` | `7e 04 04 00 00 00 ff 00 ef` | `7e 07 05 03 r g b 0a ef` | `7e 04 01 i 01 ff 02 01 ef` |
| ELK-BLEDOB / BLEDOM0E | `7e 07 04 ff 00 01 02 01 ef` | `7e 07 04 00 00 00 02 01 ef` | `7e 07 05 03 r g b 0a ef` | `7e 04 01 i 01 ff 02 01 ef` |
| ELK-BLEDDM | `7e 04 04 f0 00 01 ff 00 ef` | `7e 04 04 00 00 00 ff 00 ef` | `7e 00 05 03 r g b 00 ef` | `7e 04 01 i ff 00 ff 00 ef` |
| ELK-BTC | `7e 00 04 f0 00 01 ff 00 ef` | `7e 00 04 00 00 00 ff 00 ef` | `7e 00 05 03 r g b 0a ef` | `7e 00 01 i 00 00 00 00 ef` |
| MELK | `7e 00 04 01 00 00 00 00 ef` | `7e 00 04 00 00 00 ff 00 ef` | `7e 00 05 03 r g b 00 ef` | `7e 04 01 i ff 00 ff 00 ef` |
| LEDBLE (`ffe1`) | `7e 00 04 01 00 00 00 00 ef` | `7e 00 04 00 00 00 ff 00 ef` | `7e 00 05 03 r g b 00 ef` | `7e 04 01 i ff 00 ff 00 ef` |
| LED- / JACKYLED (`ffe1`) | `7e 04 04 01 ff ff ff 00 ef` | `7e 04 04 00 00 00 00 00 ef` | `7e 07 05 03 r b g 00 ef` (r, b, g order) | `7e 04 01 i ff ff ff 00 ef` |

Effects exist (`7e 00 03 v 03 00 00 00 ef`, speed `7e 00 02 v 00 00 00 00 ef`, IDs in the integration's `definitions.json`, e.g. crossfade red = 0x8b) but are out of scope for v1.

## HappyLighting / Triones (Heritage X head and taillights, assumed)

Sources: [sysofwan/ha-triones](https://github.com/sysofwan/ha-triones) (`triones.py`, `const.py`) and [8none1/pytrionesmqtt](https://github.com/8none1/pytrionesmqtt). The upstream reference (madhead/saberlight `protocols/Triones/protocol.md`) couldn't be fetched.

- Advertised names: `Triones*`, `LEDBLE*` (QHM / Dream~ / Flash prefixes unconfirmed).
- Service `ffd5`; write `ffd9` (ha-triones also accepts `ffe9`); notify `ffd4` (or discovered at runtime from `ffd0 / ffe0 / ffe4`).
- "Fire and forget": the device doesn't acknowledge writes.

| Function | Bytes |
|---|---|
| Power on | `cc 23 33` |
| Power off | `cc 24 33` |
| Color | `56 r g b 00 f0 aa` |
| White channel | `56 00 00 00 ww 0f aa` |
| Built-in mode | `bb mm ss 44` (mm 0x25–0x38, ss speed 0x01–0xff, higher = slower) |
| Status query | `ef 01 77` |

There is no brightness command for RGB: scale r, g, b by brightness before sending.

Status reply (12 bytes, on notify): `66 04 PP MM 20 SS RR GG BB WW 03 99` — PP `23` on / `24` off, MM mode, SS speed, RR GG BB color, WW white. Use it to sync the app with the box after connecting.

## Name collision
`LEDBLE*` matches both families. Default to ELK for LEDBLE and let the user switch per device.
