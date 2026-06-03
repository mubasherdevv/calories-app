# Frontend Spec Document

## 1. UI/UX Principles
- **Aesthetic:** Modern, premium, health-focused.
- **Theme:** Dark/Light adaptive, with a rich green `ACCENT` color (`#115E59` / `#22C55E`).
- **Effects:** Heavy use of Glassmorphism (`expo-blur`) over vibrant background gradients.

## 2. Directory Structure (`/app` & `/components`)
- `app/(auth)/*`: Login and onboarding screens.
- `app/(tabs)/*`: Core application tabs.
  - `index.tsx`: Dashboard (Macro rings, calorie summary).
  - `explore.tsx`: Search and historical data.
  - `profile.tsx`: User settings and subscription status.
- `app/scan.tsx`: The full-screen AI camera and manual entry modal.
- `components/ui/*`: Reusable atoms.
  - `Text.tsx`: Custom text component applying the Inter font automatically.
  - `Card.tsx`: Glassmorphic container.
  - `Button.tsx`: Animated pressable button with variants (Primary, Outline, Ghost).

## 3. Custom Navigation Bar (`components/TabBar.tsx`)
- Replaces the default iOS/Android bottom tab bar.
- Uses `react-native-svg` to draw a custom path with a central "notch" or "cutout".
- The central Action Button floats above the notch, utilizing absolute positioning (`translateY`) to align perfectly with the SVG cutout.

## 4. State Management Strategy
- **React Query:** Used for all asynchronous data fetching. 
  - `queryKey: ['profile']`
  - `queryKey: ['daily_logs', date]`
- **Optimistic Updates:** When a user logs a food item, the cache is optimistically updated to ensure the UI reacts instantly, rolling back if the Supabase request fails.

## 5. Forms & Inputs
- Text inputs utilize floating labels and clear error states (Red borders, helper text).
- Keyboard handling uses `KeyboardAvoidingView` wrapped in a `ScrollView` to ensure inputs are never hidden on small screens.
