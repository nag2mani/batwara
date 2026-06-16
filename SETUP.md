# Batwara – Setup & APK Build Guide

## Prerequisites

- **Node.js 18+**
- For **local Gradle builds**: JDK 17+ and the Android SDK (Android Studio installed, or `ANDROID_HOME` set)
- For **EAS cloud builds**: a free [Expo account](https://expo.dev) and the EAS CLI
- For **cloud/shared mode**: a free [Supabase account](https://supabase.com)

---

## 1. Install dependencies

```bash
cd batwara
npm install
```

---

## 2. Supabase setup (cloud mode)

> Skip this section if you only want to run in local/offline mode.

### 2a. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, set a database password, pick a region

### 2b. Run the database setup

1. In your Supabase project, go to **SQL Editor**
2. Paste the entire contents of `supabase/setup.sql`
3. Click **Run**

This creates all tables (`profiles`, `groups`, `group_members`, `expenses`, `settlements`), RLS policies, and the auto-profile trigger. Safe to re-run.

### 2c. Disable email confirmation (recommended for testing)

Go to **Authentication → Providers → Email** → turn off **"Confirm email"**.
This avoids the 3-emails/hour rate limit during development.

### 2d. Copy your API credentials

Go to **Project Settings → API** and copy:
- **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> The app works without `.env` — it runs in local/offline mode using AsyncStorage.

---

## 4. Run the app locally

```bash
npx expo start          # Metro bundler — press 'a' for Android emulator
# or
npm run android         # build + install the dev app on a connected device/emulator
```

You can also scan the QR code with **Expo Go** on a physical device (note: features needing native modules require a dev/native build, not Expo Go).

---

## 5. Build the APK

The repo includes a prebuilt native `android/` project, so you can build an APK **locally** without any cloud service. EAS is offered as an alternative.

### Option A — Local Gradle build (fastest, free)

```bash
cd android
./gradlew assembleRelease
```

Output:

```
android/app/build/outputs/apk/release/app-release.apk
```

Install it on a connected device:

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

> The `release` build is signed with the debug keystore — perfect for sideloading/sharing, but **not** for the Play Store. If the build can't find the SDK, set `ANDROID_HOME` (usually `~/Library/Android/sdk`) or add `android/local.properties` with `sdk.dir=/absolute/path/to/Android/sdk`.

### Option B — EAS cloud build

```bash
npm run build:apk       # = eas build --platform android --profile preview  → .apk
npm run build:aab       # = eas build --platform android --profile production → .aab (Play Store)
```

First time only: run `eas login`, then `eas build:configure`. Builds run on EAS servers (~5–10 min) and print a download URL. All builds are also listed at **[expo.dev](https://expo.dev) → your project → Builds**.

### Install on Android

1. Transfer/open the `.apk` on the phone
2. Allow **"Install from unknown sources"** if prompted
3. Tap install
4. To refresh the **app icon** after changes, fully uninstall the old app first (launchers cache icons), or bump `versionCode` in `app.json`

---

## 6. Importing your Splitwise data

1. In Splitwise: open a group → **Export as CSV**
2. In Batwara: **Settings → Import from Splitwise → Browse CSV file**
3. Review the auto-created group, members, and **"Which member are you?"** (auto-selected by email — tap to change)
4. Tap **Import** — the group and all expenses are created with correct payers and splits

---

## Build profiles (`eas.json`)

| Profile | Command | Output | Use for |
|---|---|---|---|
| `preview` | `npm run build:apk` | `.apk` | Direct sharing, QA testing |
| `production` | `npm run build:aab` | `.aab` | Google Play Store |
| `development` | `eas build -p android --profile development` | dev client | Custom native modules |

---

## App icon

The launcher icon (green ✦ sparkle on a dark background) lives in two places:

- **Native (used by local Gradle builds):** `android/app/src/main/res/mipmap-*` — legacy `ic_launcher`/`ic_launcher_round` plus adaptive icons in `mipmap-anydpi-v26/` with the `iconBackground` color in `values/colors.xml`.
- **Expo config (used by `expo prebuild`):** `app.json` → `icon` and `android.adaptiveIcon`, sourced from `assets/icon.png` and `assets/adaptive-icon.png`.

To redesign it, replace the `assets/*.png` sources and regenerate the `mipmap-*` files (or run `expo prebuild`).

---

## Project structure

```
batwara/
├── App.tsx                       # Root: GestureHandlerRootView + Auth/Store providers
├── app.json                      # Expo config (name, bundle ID, icon, EAS project ID)
├── eas.json                      # EAS build profiles
├── .env                          # Supabase credentials (not committed)
├── assets/
│   ├── icon.png                  # App icon source (1024×1024)
│   └── adaptive-icon.png         # Adaptive icon foreground source
├── android/                      # Native Android project (for local Gradle builds)
├── supabase/
│   └── setup.sql                 # Complete DB setup — run once in Supabase SQL Editor
└── src/
    ├── auth/
    │   ├── AuthContext.tsx        # Auth state, local/Supabase dual mode
    │   └── AuthScreen.tsx         # Sign in / Sign up UI
    ├── components/
    │   ├── AddExpenseModal.tsx    # Add expense (equal/exact/percentage split)
    │   ├── AddFab.tsx             # Floating "+" action button
    │   ├── Avatar.tsx
    │   ├── CategoryIcon.tsx
    │   ├── CreateGroupModal.tsx
    │   ├── DateRangePicker.tsx    # Dashboard range dropdown + custom range
    │   ├── ExpenseDetailModal.tsx # Tap-an-expense detail + delete
    │   ├── ExpenseRow.tsx
    │   ├── GroupCard.tsx
    │   ├── Icon.tsx               # Custom Ionicons renderer (font-direct)
    │   ├── SettleUpModal.tsx
    │   └── SplitwiseImportModal.tsx
    ├── lib/
    │   ├── profiles.ts            # Supabase profile search
    │   ├── seed.ts                # Sample/demo data
    │   ├── splitwise.ts           # Balances, pairwise balances, debt simplification, splits
    │   ├── splitwiseImport.ts     # Splitwise CSV parsing → expenses
    │   ├── supabase.ts            # Supabase client (conditional on env vars)
    │   ├── types.ts               # Shared TypeScript types
    │   └── utils.ts               # Formatting, date helpers, uid generator
    ├── navigation/
    │   └── AppNavigator.tsx       # Bottom tab navigator
    ├── screens/
    │   ├── DashboardScreen.tsx
    │   ├── ExpensesScreen.tsx
    │   ├── GroupsScreen.tsx
    │   └── SettingsScreen.tsx
    ├── store/
    │   └── StoreContext.tsx       # Global state, AsyncStorage + Supabase sync
    └── theme/
        └── colors.ts              # Design tokens
```
