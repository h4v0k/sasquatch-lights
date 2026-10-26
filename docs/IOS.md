# iPhone builds

The iPhone app is built on GitHub Actions (macOS runner), signed with Apple's cloud-managed certificates through an App Store Connect API key, and uploaded to TestFlight. No Mac needed. You install it from the TestFlight app; internal testers need no App Review.

Workflow: `.github/workflows/ios.yml`. It runs on every push to `main` (the repo is public, so macOS minutes are free) and from Actions → "iPhone (TestFlight)" → Run workflow. Until the four Apple secrets exist, a push skips the build with a notice.

## One-time setup (havok)

1. **Enroll in the Apple Developer Program** ($99/yr). Fastest route: the Apple Developer app on the iPhone → Account → Enroll, as an **Individual**, paid with your Apple ID. Needs two-factor auth on the Apple ID. Approval is usually within 48 hours.
   - Organization (Skill Capture Media as the publisher) needs a D-U-N-S number and Apple's business verification, which takes days to weeks. Not needed for a private TestFlight app; you can move to an organization account later.
2. **Register the bundle ID**: developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → + → App IDs → App → Explicit, `us.sasquatch.lights`, description "Sasquatch Lights". No extra capabilities.
3. **Create the app record**: App Store Connect → Apps → + → New App. Platform iOS, name "Sasquatch Lights" (if taken, any name works; it's only shown in TestFlight), bundle ID `us.sasquatch.lights`, SKU `sasquatch-lights`, full access.
4. **Make an API key**: App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +. Name "GitHub CI", access **Admin** (needed for cloud-managed signing). Download the `.p8` (only downloadable once) and note the Key ID and the Issuer ID shown above the list.
5. **Team ID**: developer.apple.com → Account → Membership details → Team ID (10 characters).
6. **GitHub secrets**: github.com/h4v0k/sasquatch-lights → Settings → Secrets and variables → Actions → New repository secret, four times:
   - `APPLE_TEAM_ID`: the Team ID
   - `ASC_KEY_ID`: the Key ID
   - `ASC_ISSUER_ID`: the Issuer ID
   - `ASC_KEY_P8`: the whole text of the `.p8` file, including the BEGIN/END lines
7. **Run the build**: Actions → "iPhone (TestFlight)" → Run workflow (after that, every push builds). About 20–30 minutes; then App Store Connect processes the upload for another 5–15.
8. **Install**: App Store Connect → your app → TestFlight → Internal Testing → + to make a group, add yourself. Install the TestFlight app on the iPhone and accept the invite.

TestFlight builds expire after 90 days; run the workflow again for a fresh one.

## iPhone differences
- iOS never shows Bluetooth MAC addresses. Each controller gets an ID that is stable on that one iPhone, so the Android pairing doesn't carry over: scan once on the iPhone (the five known controllers auto-assign by name), then Lock these lights.
- The app only works while it's open on screen (no background Bluetooth or location yet). See docs/ROAD-LOCK.md.
