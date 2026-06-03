<div align="center">
  <h1>🥗 NutriLens AI Calorie Tracker</h1>
  <p><strong>Your intelligent companion for seamless nutrition tracking.</strong></p>

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)](https://expo.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  
  <br />
</div>

## 📚 Project Documentation

Explore the detailed architecture and planning documents below:

- 📋 **[Product Requirements Document (PRD)](./PRD.md)**: Core features, audience, and scope.
- 🤖 **[AI Workflow Diagram](./AI_Workflow_Diagram.md)**: Visual flowchart of the AI food scanning process.
- 🗄️ **[Database Schema](./Database_Schema.md)**: Supabase PostgreSQL tables and RLS policies.
- 🔒 **[Privacy Policy](./Privacy_Policy.md)**: Data collection and privacy guidelines.

---

## ✨ Features

NutriLens removes the friction from calorie counting by combining a modern, glassmorphic UI with cutting-edge AI.

| Feature | Description |
| :--- | :--- |
| **📸 AI Food Scanner** | Snap a picture of your meal and let the AI identify food items and estimate macros instantly. |
| **📊 Smart Dashboard** | Beautiful, dynamic rings and progress bars to visualize your daily protein, carbs, and fat intake. |
| **🔐 Secure Auth** | Passwordless login and social OAuth powered by Supabase. |
| **⚡ Offline Support** | Lightning-fast local caching with TanStack React Query so your logs are always accessible. |
| **💎 Premium Tier** | Built-in subscription paywalls (via RevenueCat) to unlock advanced AI analytics. |

---

## 🛠️ Tech Stack

- **Framework:** React Native + Expo Router
- **Backend & Auth:** Supabase (PostgreSQL)
- **Styling:** NativeWind (Tailwind CSS) & Glassmorphism BlurViews
- **State Management:** TanStack React Query
- **Animations:** React Native Reanimated

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli`)

### 2. Installation
```bash
git clone https://github.com/mubasherdevv/calories-app.git
cd calories-app
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the App
```bash
npx expo start
```
- Press `a` to run on Android.
- Press `i` to run on iOS Simulator (Mac only).
- Or scan the QR code using the **Expo Go** app on your physical device.

---

## 📂 Project Structure

```text
app/
 ├── (auth)/        # Login & Sign up flows
 ├── (tabs)/        # Main dashboard, explore, and profile
 ├── _layout.tsx    # Root layout and authentication routing
 ├── scan.tsx       # AI Food Scanner interface
 └── settings.tsx   # App configuration and preferences
components/
 ├── ui/            # Reusable UI components (Buttons, Cards, Inputs)
 └── TabBar.tsx     # Custom SVG glassmorphic navigation bar
lib/
 ├── supabase.ts    # Supabase backend client configuration
 ├── theme.ts       # Centralized design system (Colors, Shadows)
 └── analytics.ts   # PostHog tracking integration
hooks/              # React Query hooks for state management
```

---

## 🔧 Extended Configuration

### RevenueCat (Subscriptions)
If testing the premium features, ensure your RevenueCat API keys are properly configured. You can update these inside `eas.json` or `.env.local` for local testing.

### Native Builds (EAS)
Some modules (like the camera or payments) require a native build. You can compile the app natively using Expo Application Services (EAS):
```bash
eas build --platform all --profile preview
```

---

## 🤝 Troubleshooting & Support

- **Supabase Connectivity:** If data isn't loading, ensure `EXPO_PUBLIC_SUPABASE_URL` is set correctly and the backend is running.
- **Metro Bundler Errors:** If the terminal throws `EMFILE` or cache errors, press `Ctrl + C` and restart using `npm start -c`.
- **Contact:** For deeper issues, visit the `Contact Support` page inside the App Settings!

---

## 🎨 App UI & Design System
NutriLens embraces a premium aesthetic utilizing:
- **Glassmorphism:** Built via `expo-blur` and translucent RGBA overlays for a sleek, modern look.
- **Micro-animations:** Powered by `react-native-reanimated` to ensure 60FPS fluid transitions on modals and form entries.
- **Custom Navigation:** A bespoke curved notch bottom tab bar crafted dynamically with `react-native-svg`.

---

## 🏷️ Branding
The entire app's design system relies on a centralized branding config, making it trivial to white-label:
1. Open `lib/theme.ts`.
2. Change the `ACCENT` hex code to automatically update all buttons, borders, SVG graphs, and interactive states.
3. Update `tailwind.config.js` to mirror your custom `ACCENT` color.

---

## 🏗️ Starting a new project from this template

### Step 1 — Copy the template

```bash
# Option A: Copy the folder directly
cp -r 8x-rn-template my-new-app

# Option B: Clone from GitHub
git clone https://github.com/your-org/8x-rn-template my-new-app
cd my-new-app

# Reset git history so the new app starts clean
rm -rf .git
git init
git add .
git commit -m "feat: initial commit from 8x-rn-template"
```

### Step 2 — Install dependencies

```bash
npm install
```

If `npm install` fails with `ERESOLVE`:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Step 3 — Rename the app

Open `app.json` and replace all placeholder values:

```json
{
  "expo": {
    "name": "YourAppName",
    "slug": "your-app-name",
    "scheme": "yourapp",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "associatedDomains": ["applinks:yourdomain.com"]
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    },
    "extra": {
      "eas": { "projectId": "REPLACE_AFTER_EAS_CONFIGURE" }
    },
    "owner": "your-expo-username"
  }
}
```

Then open `lib/constants.ts` — this is the single file for all app identity:

```ts
export const APP_NAME          = 'YourAppName'
export const APP_TAGLINE       = 'Your tagline here.'
export const APP_SCHEME        = 'yourapp'          // must match app.json scheme
export const APP_SUPPORT_EMAIL = 'support@yourapp.com'
export const APP_DOCS_URL      = 'https://yourapp.com/docs'
```

### Step 4 — Set your brand color

Open `lib/theme.ts` and change one line:

```ts
export const ACCENT = '#6366f1'   // change to any hex
```

Then open `tailwind.config.js` and set the same hex:

```js
colors: {
  accent: '#your-hex-color',   // must match lib/theme.ts
}
```

Also update the derived opacity values to match:

```ts
export const ACCENT_DIM    = 'rgba(r,g,b,0.12)'
export const ACCENT_BORDER = 'rgba(r,g,b,0.30)'
export const ACCENT_GLOW   = 'rgba(r,g,b,0.20)'
export const ACCENT_LIGHT  = '#lighter-variant'
```

That's the full rebrand — every button, tab, badge, and active state updates.

### Step 5 — Replace app icons

Drop your own images into `assets/`:

| File | Size | Used for |
|---|---|---|
| `icon.png` | 1024×1024 | App Store / Play Store icon |
| `splash-icon.png` | 200×200 | Splash screen centre image |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `favicon.png` | 32×32 | Web browser tab |

Tip: [appicon.co](https://appicon.co) — upload one 1024×1024 PNG and it exports all required sizes.

### Step 6 — Set up Supabase locally

Start Docker Desktop first, then:

```bash
supabase start
supabase db reset   # applies all migrations in supabase/migrations/
```

When it finishes you'll see:

```
API URL: http://127.0.0.1:54321
anon key: eyJhbGci...
```
Copy those for the next step.

### Step 7 — Create your .env.local file

```bash
cp .env.example .env.local
```

Fill in the values:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Leave empty — these degrade gracefully when unconfigured:
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Step 8 — Run the app

```bash
npx expo start
```

- Press `a` → Android emulator
- Press `i` → iOS simulator (Mac only)
- Scan QR code → Expo Go on your phone

> RevenueCat requires a native build. For purchase testing: `npx expo run:android` or `npx expo run:ios`.

---

<div align="center">
  <sub>Developer By Mubasher Developer ❤️ -  for health and fitness enthusiasts.</sub>
</div>
