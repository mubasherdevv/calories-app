# Technical Architecture Document

## 1. High-Level Architecture
NutriLens follows a modern mobile architecture utilizing a serverless backend and a reactive frontend.

- **Frontend Application:** React Native built with Expo (Managed Workflow).
- **Backend & Database:** Supabase (PostgreSQL, Auth, Edge Functions, Storage).
- **External Services:** RevenueCat (IAP/Subscriptions), Sentry (Crash reporting), PostHog (Analytics), AI Vision API (for image processing).

## 2. Component Architecture

### 2.1 Frontend (Expo / React Native)
- **Routing:** Expo Router provides file-based routing. The app uses a guarded routing approach:
  - `(auth)`: Public routes for login.
  - `(tabs)`: Protected routes requiring authentication.
- **State Management:** 
  - **Server State:** TanStack React Query (`useQuery`, `useMutation`) for fetching and caching Supabase data.
  - **Local State:** React Context (e.g., `ToastContext`, `SubscriptionContext`) and standard Hooks (`useState`).
- **Styling:** NativeWind (Tailwind CSS for React Native) paired with React Native StyleSheet for complex absolute positioning (e.g., the custom SVG tab bar).
- **Animations:** React Native Reanimated for 60FPS fluid transitions.

### 2.2 Backend (Supabase)
- **Database:** PostgreSQL handling relational data (`profiles`, `food_logs`).
- **Authentication:** GoTrue handling JWT generation and validation.
- **Storage:** Supabase Storage buckets for storing user-uploaded food images.
- **Edge Functions:** Webhooks to sync RevenueCat subscription events into the `profiles` table.

## 3. Data Flow Example: AI Scanning
1. **Client:** Takes photo using Expo Camera.
2. **Client:** Compresses image and converts to Base64 (or uploads to Supabase Storage and gets a public URL).
3. **Client:** Sends payload to Edge Function/AI API.
4. **AI API:** Processes image, returns structured JSON of macros.
5. **Client:** Parses JSON, displays to user for confirmation.
6. **Client:** Upon approval, performs `INSERT` into `food_logs` table via Supabase client.
7. **Client:** Invalidate React Query cache (`['food_logs']`), triggering a UI re-render on the Dashboard.
