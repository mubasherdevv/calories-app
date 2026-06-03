# Product Requirements Document (PRD)

## 1. Product Overview
**Name:** NutriLens (Calories App)
**Objective:** To provide users with a seamless, intuitive, and accurate way to track their daily nutritional intake. By leveraging AI image recognition, NutriLens removes the friction of manual food logging.

## 2. Target Audience
- Health-conscious individuals.
- Fitness enthusiasts aiming for specific macronutrient goals.
- People who find traditional food-logging apps too tedious.

## 3. Core Features

### 3.1 Authentication & Profile
- Passwordless OTP email login or Social OAuth via Supabase.
- User profile creation (Display Name, Goals, Plan Type).

### 3.2 Dashboard & Progress Tracking
- Daily overview showing Calories, Protein, Carbs, and Fats.
- Visual progress rings/bars resetting daily.
- Recent activity feed showing logged meals.

### 3.3 AI Food Scanner (Camera Integration)
- Floating action button to instantly open the scanner.
- Capture meal images.
- AI processing to identify food components, estimate portion sizes, and calculate macros.
- Manual override for users to adjust AI estimations before saving.

### 3.4 Settings & Subscription
- Manage personalized macro goals.
- RevenueCat integration for Premium features (e.g., unlimited AI scans, advanced historical analytics).
- Toggle app preferences (e.g., theme, AI strictness).

## 4. Technical Constraints & Assumptions
- **Mobile First:** iOS and Android via React Native Expo.
- **Offline Capable:** Use TanStack React Query to cache data and gracefully handle offline states.
- **Database:** Supabase PostgreSQL with strict Row Level Security (RLS).

## 5. Success Metrics
- Daily Active Users (DAU) & Monthly Active Users (MAU).
- Average number of foods logged per user per day.
- Conversion rate from Free to Premium subscription.
