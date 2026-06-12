# Batwara – Setup & APK Build Guide

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- A free [Expo account](https://expo.dev) (needed for APK builds)
- A free [Supabase account](https://supabase.com) (needed for cloud/shared mode)

---

## 1. Install dependencies

```bash
cd qa
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

Go to **Authentication → Providers → Email** → turn off **"Confirm email"**

This prevents the 3-emails/hour rate limit during development.

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
npx expo start
```

- Press `a` to open on an Android emulator
- Scan the QR code with the **Expo Go** app on a physical Android/iOS device

---

## 5. Build APK (Android)

### 5a. Log in to EAS

```bash
eas login
```

### 5b. Configure EAS (first time only)

```bash
eas build:configure
```

Select **Y** when asked to create an EAS project. This writes your real `projectId` into `app.json`.

### 5c. Build the APK

```bash
eas build -p android --profile preview
```

- Builds a `.apk` file directly installable on any Android device
- Build runs on EAS cloud servers (~5–10 minutes)
- When done, EAS prints a download URL in the terminal

You can also find all builds at: **[expo.dev](https://expo.dev) → Your project → Builds**

### 5d. Install on Android

1. Send the `.apk` download link to anyone
2. They open it on their Android phone
3. If prompted, allow **"Install from unknown sources"** in settings
4. Tap install — done

---

## Build profiles

| Profile | Command | Output | Use for |
|---|---|---|---|
| `preview` | `eas build -p android --profile preview` | `.apk` | Direct sharing, QA testing |
| `production` | `eas build -p android --profile production` | `.aab` | Google Play Store |
| `development` | `eas build -p android --profile development` | dev client | Custom native modules |

---

## Project structure

```
qa/
├── App.tsx                  # Root: GestureHandlerRootView + AuthProvider
├── app.json                 # Expo config (name, bundle ID, EAS project ID)
├── eas.json                 # EAS build profiles
├── .env                     # Supabase credentials (not committed)
├── supabase/
│   └── setup.sql            # Complete DB setup — run once in Supabase SQL Editor
└── src/
    ├── auth/
    │   ├── AuthContext.tsx   # Auth state, local/Supabase dual mode
    │   └── AuthScreen.tsx    # Sign in / Sign up UI
    ├── components/
    │   ├── AddExpenseModal.tsx
    │   ├── Avatar.tsx
    │   ├── CategoryIcon.tsx
    │   ├── CreateGroupModal.tsx
    │   ├── ExpenseRow.tsx
    │   ├── GroupCard.tsx
    │   └── SettleUpModal.tsx
    ├── lib/
    │   ├── profiles.ts       # Supabase profile search
    │   ├── splitwise.ts      # Debt simplification algorithm
    │   ├── supabase.ts       # Supabase client (conditional on env vars)
    │   ├── types.ts          # Shared TypeScript types
    │   └── utils.ts          # Formatting, date helpers, uid generator
    ├── screens/
    │   ├── DashboardScreen.tsx
    │   ├── ExpensesScreen.tsx
    │   ├── GroupsScreen.tsx
    │   └── SettingsScreen.tsx
    ├── store/
    │   └── StoreContext.tsx  # Global state, AsyncStorage + Supabase sync
    └── theme/
        └── colors.ts         # Design tokens
```
