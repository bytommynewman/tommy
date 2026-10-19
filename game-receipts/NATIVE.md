# Native app (iOS / Android)

Game Receipts ships three ways from one codebase:

1. **Web**: any browser.
2. **Installable app (PWA)**: on iPhone open the site in Safari, tap Share, then **Add to Home Screen**. It runs full-screen with its own icon. Android and desktop Chrome offer an **Install** prompt.
3. **App Store / Play Store builds** via [Capacitor](https://capacitorjs.com). This is a native shell that loads the deployed app.

## Build the iOS app on your Mac (Mac mini)

Requires Xcode (from the App Store) and CocoaPods (`brew install cocoapods`).

```bash
cd game-receipts
npm install
npx cap add ios                  # one time: creates ios/
# Point the shell at a running server:
npm run dev -- -H 0.0.0.0 &      # dev server reachable from your phone
CAP_SERVER_URL=http://<your-mac-LAN-ip>:3000 npx cap sync ios
npm run cap:ios                  # opens Xcode → pick your iPhone → Run
```

For a TestFlight or App Store build, deploy the web app first (e.g. Vercel). Then run `CAP_SERVER_URL=https://your-domain npx cap sync ios`, set your signing team in Xcode, and choose Product → Archive.

Android works the same way: `npx cap add android`, then `npm run cap:android` (needs Android Studio).

App icon: export a 1024×1024 PNG from `/app-icon/1024` while the server is running, then drop it into Xcode's AppIcon asset.
