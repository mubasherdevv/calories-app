# Security & Access Document

This document outlines the security measures, authentication flow, and data access policies for NutriLens.

## 1. Authentication Flow
- **Provider:** Supabase Auth (GoTrue).
- **Methods:** Email OTP (Passwordless), Google OAuth, Apple OAuth.
- **Token Management:** JWTs are securely stored on the device using `expo-secure-store`. The Supabase client automatically handles token refresh and injection into the Authorization header.

## 2. Row Level Security (RLS)
The PostgreSQL database heavily utilizes RLS to ensure users can only access their own data.

### `profiles` Table
- **SELECT:** `auth.uid() = id`
- **UPDATE:** `auth.uid() = id`
- **INSERT:** Handled via database trigger upon user signup.

### `food_logs` Table
- **SELECT:** `auth.uid() = user_id`
- **INSERT:** `auth.uid() = user_id`
- **UPDATE:** `auth.uid() = user_id`
- **DELETE:** `auth.uid() = user_id`

*No public read/write access is enabled on any application tables.*

## 3. API & Secrets Management
- **Environment Variables:** Secrets (e.g., Supabase Anon Key, RevenueCat API Keys, Sentry DSN) are injected at build time using EAS (Expo Application Services) secrets management.
- Local development uses `.env.local` which is strictly ignored by `.gitignore`.

## 4. External Access
- **RevenueCat:** Webhook securely communicates with a Supabase Edge Function via a predefined secret token to update user subscription status (`plan_type`).
- **Storage:** Images uploaded to Supabase Storage are placed in a private bucket with RLS policies allowing users to view only images they have uploaded.
