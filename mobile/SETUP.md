# Mixd Mobile App — Setup & Build Guide

This guide walks you through getting the Mixd mobile app running on your phone and eventually publishing it to the App Store and Google Play.

---

## What You Need Before Starting

- **Node.js** (version 18 or newer) — you likely already have this from the web app
- **Your Supabase anon key** — same one used in the web app's `.env` file
- **An Expo account** — free, you'll create one below
- **Apple Developer account** — you mentioned you have this
- **Google Play Developer account** — you mentioned you have this

---

## Step 1: Install Expo CLI & EAS CLI

Open your terminal (Command Prompt or PowerShell on Windows) and run:

```
npm install -g expo-cli eas-cli
```

Then log into Expo (or create a free account):

```
npx expo login
```

It will ask for your email and password. If you don't have an account, go to https://expo.dev and sign up first, then run the login command.

---

## Step 2: Navigate to the Mobile Folder

In your terminal, navigate to the mobile app folder:

```
cd C:\Users\14256\documents\claude\projects\bside\bside-app-git\mobile
```

---

## Step 3: Install Dependencies

Run:

```
npm install
```

This will download all the packages the app needs. It may take a few minutes.

---

## Step 4: Add Your Supabase Key

Open the file `mobile/src/lib/supabase.ts` in any text editor (Notepad, VS Code, etc.).

Find this line:
```
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace `YOUR_SUPABASE_ANON_KEY` with your actual Supabase anon key (the same one from your web app's `.env` file, the `VITE_SUPABASE_ANON_KEY` value).

Save the file.

---

## Step 5: Add the Font File

The app uses the Archivo Black font. You need to download it:

1. Go to https://fonts.google.com/specimen/Archivo+Black
2. Click "Download family"
3. Unzip the downloaded file
4. Copy the file `ArchivoBlack-Regular.ttf` into: `mobile/assets/fonts/`

---

## Step 6: Add Placeholder App Icons

You need three image files for the app to build:

- `mobile/assets/icon.png` — 1024x1024 px, your Mixd logo
- `mobile/assets/splash.png` — 1284x2778 px, splash screen (logo centered on #050509 background)
- `mobile/assets/adaptive-icon.png` — 1024x1024 px, Android adaptive icon (same as icon.png works)

For now, you can use any square PNG as a placeholder. We can design proper ones later.

---

## Step 7: Test Locally (Optional but Recommended)

To see the app on your phone before building:

1. Install the **Expo Go** app on your phone (free, from App Store or Google Play)
2. In your terminal (make sure you're in the `mobile` folder), run:
   ```
   npx expo start
   ```
3. A QR code will appear in your terminal
4. **iPhone**: Open the Camera app and scan the QR code
5. **Android**: Open Expo Go and scan the QR code

The app will load on your phone. You can test sign in, search, library, etc.

**Note:** Some features like background audio playback only work in a full build, not in Expo Go.

---

## Step 8: Configure EAS Build

Run this command to set up EAS (Expo Application Services) for building:

```
eas build:configure
```

It will ask you a few questions. Say yes to everything.

Then open `mobile/eas.json` and update the submit section with your Apple credentials:
- Replace `YOUR_APPLE_ID` with your Apple ID email
- Replace `YOUR_APP_STORE_CONNECT_APP_ID` with your App Store Connect app ID
- Replace `YOUR_APPLE_TEAM_ID` with your Apple Team ID

---

## Step 9: Build for iOS

Run:

```
eas build --platform ios --profile production
```

This will:
1. Upload your code to Expo's build servers
2. Build the iOS app (takes 10-20 minutes)
3. Give you a link to download the `.ipa` file

The first time, it will ask about your Apple credentials and provisioning profiles. Follow the prompts — EAS handles most of it automatically.

---

## Step 10: Build for Android

Run:

```
eas build --platform android --profile production
```

This builds an `.aab` file (Android App Bundle) for the Play Store. Takes 10-15 minutes.

---

## Step 11: Submit to App Store

After the iOS build completes:

```
eas submit --platform ios
```

This uploads the build to App Store Connect. You'll then need to:
1. Log into https://appstoreconnect.apple.com
2. Go to your app
3. Fill in the listing details (screenshots, description, etc.)
4. Submit for review

---

## Step 12: Submit to Google Play

After the Android build completes:

```
eas submit --platform android
```

For this to work, you need a Google Play service account JSON key file. Steps:
1. Go to Google Play Console → Settings → API access
2. Create a service account
3. Download the JSON key file
4. Save it as `mobile/google-service-account.json`

Then run the submit command again.

---

## Updating the App Later

When you make changes to the code:

1. Update the `version` in `mobile/app.json` (e.g., "1.0.1")
2. Run the build commands again (Step 9 and 10)
3. Submit the new builds (Step 11 and 12)

For minor updates that don't change native code, you can use OTA (over-the-air) updates:

```
npx expo publish
```

This pushes JavaScript changes to users without going through the app stores.

---

## File Structure

```
mobile/
├── App.tsx                  ← Entry point
├── app.json                 ← Expo config (name, icons, bundle IDs)
├── eas.json                 ← Build & submit config
├── package.json             ← Dependencies
├── assets/
│   ├── fonts/               ← ArchivoBlack-Regular.ttf goes here
│   ├── icon.png             ← App icon (1024x1024)
│   ├── splash.png           ← Splash screen
│   └── adaptive-icon.png    ← Android adaptive icon
└── src/
    ├── components/
    │   ├── AddToPlaylistModal.tsx ← Add-to-playlist bottom sheet
    │   ├── Logo.tsx              ← Mixd X-mark + wordmark
    │   ├── MiniPlayer.tsx        ← Bottom player bar (tap to expand)
    │   └── YouTubePlayer.tsx     ← YouTube iframe player component
    ├── lib/
    │   ├── api.ts            ← Search, playlists, track saving
    │   ├── auth.tsx          ← Auth context (sign in/up/out)
    │   ├── player.tsx        ← Audio + YouTube player context
    │   ├── supabase.ts       ← Supabase client (PUT YOUR KEY HERE)
    │   └── theme.ts          ← Colors, spacing, Mixd design tokens
    ├── navigation/
    │   ├── AuthNavigator.tsx  ← Sign in/up/forgot password flow
    │   ├── MainNavigator.tsx  ← Tab bar + NowPlaying + PlaylistDetail
    │   ├── RootNavigator.tsx  ← Switches between auth & main
    │   └── linking.ts         ← Deep link config
    └── screens/
        ├── HomeScreen.tsx
        ├── LibraryScreen.tsx
        ├── SearchScreen.tsx
        ├── PlaylistsScreen.tsx
        ├── PlaylistDetailScreen.tsx ← Track list inside a playlist
        ├── NowPlayingScreen.tsx     ← Full-screen player with queue
        ├── ImportScreen.tsx
        ├── SettingsScreen.tsx
        ├── SignInScreen.tsx
        ├── SignUpScreen.tsx
        └── ForgotPasswordScreen.tsx
```

---

## What's Included

- ✅ Full auth flow (sign in, sign up, forgot password)
- ✅ Multi-platform search (YouTube, Spotify, SoundCloud, Podcasts)
- ✅ Library with paste-a-link support
- ✅ Playlists (create, play, delete, detail view with track list)
- ✅ Import screen (Spotify & YouTube OAuth)
- ✅ Settings (connected accounts, subscription management, sign out)
- ✅ Mini player with progress bar (tap to expand)
- ✅ Full-screen Now Playing screen with artwork, progress scrubber, queue view
- ✅ YouTube playback via react-native-youtube-iframe
- ✅ Audio playback via expo-av (SoundCloud, podcasts)
- ✅ Background audio support
- ✅ Add-to-Playlist modal (from Search and Library)
- ✅ Pull-to-refresh on Home, Library, and Playlists
- ✅ Playlist detail screen with play-all, remove tracks
- ✅ Secure token storage (expo-secure-store)
- ✅ B3 event tracking
- ✅ Mixd branding (ink/pearl/pink color scheme)
- ✅ Deep linking for OAuth callbacks

## What Needs More Work (Next Sessions)

- 🔲 Full cassette deck UI (visual tape animation)
- 🔲 Spotify SDK integration for Premium playback
- 🔲 Push notifications
- 🔲 Offline mode / download support
- 🔲 App Store screenshots & marketing assets
