# Database Schema

The backend architecture utilizes **Supabase (PostgreSQL)**. Below is an overview of the core tables, relationships, and Row Level Security (RLS) policies used in the application.

## 1. `profiles`
Stores extended user information and application settings linked to the core Supabase `auth.users` table.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PRIMARY KEY, References `auth.users` | The unique user ID |
| `display_name` | `text` | Nullable | User's full name |
| `plan_type` | `text` | Default: `'free'` | Subscription tier (free, premium) |
| `goals` | `jsonb` | Nullable | User's macro goals (e.g. `{calories: 2000, protein: 150}`) |
| `created_at` | `timestamptz` | Default: `now()` | Timestamp of account creation |

## 2. `food_logs`
Stores the individual food items and meals logged by the users.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PRIMARY KEY, Default: `uuid_generate_v4()` | Unique log ID |
| `user_id` | `uuid` | References `profiles.id` | The user who logged the food |
| `name` | `text` | NOT NULL | Name of the food/meal |
| `calories` | `numeric` | NOT NULL | Total calories |
| `protein` | `numeric` | Default: `0` | Protein in grams |
| `carbs` | `numeric` | Default: `0` | Carbohydrates in grams |
| `fat` | `numeric` | Default: `0` | Fat in grams |
| `meal_type` | `text` | Nullable | Breakfast, Lunch, Dinner, Snack |
| `image_url` | `text` | Nullable | URL of the scanned food image |
| `created_at` | `timestamptz` | Default: `now()` | Date and time the food was logged |

## 3. `personal_stats` (Optional / View)
A summary table or SQL View used to quickly aggregate daily statistics per user to avoid heavy computations on the client side.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | References `profiles.id` | The user |
| `date` | `date` | NOT NULL | The specific day of tracking |
| `total_calories` | `numeric` | | Sum of calories for the day |
| `total_protein` | `numeric` | | Sum of protein for the day |
| `total_carbs` | `numeric` | | Sum of carbs for the day |
| `total_fat` | `numeric` | | Sum of fat for the day |

## Row Level Security (RLS)
The database strictly enforces RLS to ensure data privacy:
- **Profiles:** Users can only `SELECT` and `UPDATE` their own profile row.
- **Food Logs:** Users can only `INSERT`, `SELECT`, `UPDATE`, and `DELETE` rows where `user_id` matches their authenticated ID.
