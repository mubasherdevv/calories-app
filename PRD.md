# Product Requirements Document (PRD)

## 1. Product Overview
**Name:** NutriLens (Calories App)  
**Objective:** To provide users with an effortless way to track their daily nutritional intake using cutting-edge AI image recognition, combined with a beautiful, modern, and intuitive user interface.

## 2. Target Audience
- Health-conscious individuals and fitness enthusiasts.
- People looking to lose, gain, or maintain weight through macronutrient tracking.
- Users who find manual food logging tedious and prefer an automated visual solution.

## 3. Core Features & Requirements

### 3.1 User Authentication & Onboarding
- **Sign Up / Login:** Secure authentication using email and password via Supabase.
- **Onboarding Flow:** Collect user data (age, weight, height, activity level) to calculate Base Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE).
- **Goal Setting:** Allow users to set specific calorie and macro (Protein, Carbs, Fat) targets.

### 3.2 Dashboard & Progress Tracking
- **Daily Overview:** A centralized, visual dashboard displaying remaining calories and macro completion rings/bars.
- **Visual Design:** Premium aesthetic using glassmorphism, smooth animations, and a rich green color palette.
- **Activity Feed:** A list of recently logged meals for the day.

### 3.3 AI Food Scanner (Camera Integration)
- **Camera UI:** A custom floating action button to seamlessly open the camera overlay.
- **Image Capture:** Users can capture a photo of their meal.
- **AI Processing:** Send the image to an AI processing backend to identify food items, portion sizes, and macronutrients.
- **Confirmation:** Present the AI findings to the user for review and manual adjustment before saving to the database.

### 3.4 Settings & Profile
- **Account Management:** Update personal details, goals, and AI configuration settings.
- **Premium Subscription:** Upgrade tier granting access to unlimited AI scans and advanced analytics.
- **Support & Privacy:** Access to Contact Support, Terms of Service, and Privacy Policy.

## 4. Technical Requirements
- **Frontend:** React Native (Expo)
- **Backend/Database:** Supabase (PostgreSQL)
- **State Management:** React Query for server state, local state hooks for UI.
- **Styling:** NativeWind / Custom Stylesheets.
- **Offline Support:** Local caching of daily logs for faster loading times.

## 5. Future Iterations (V2)
- Barcode scanner for packaged foods.
- Integration with Apple Health and Google Fit.
- Water intake tracking and hydration reminders.
