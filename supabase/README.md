# Supabase

Project: **paydown** (`urjlhoxzkpawahvdupse`, Southeast Asia / Singapore).

- `migrations/`: the database, in order. Apply with the Supabase CLI (`supabase link --project-ref urjlhoxzkpawahvdupse`, then `supabase db push`), or paste each file into the dashboard's SQL Editor in filename order.
- `tests/rls_test.sql`: Row Level Security test. Paste it into the SQL Editor and run it. It creates two throwaway users, checks that neither can read or change the other's data, and then rolls everything back. **Success is an error message reading `ALL_RLS_CHECKS_PASSED`**; anything starting with `RLS FAIL` is a real problem.

Keys: the app uses only the project URL and the publishable key (`.env.local`, Netlify environment variables). The secret key is server-only and never goes in the code or in any `NEXT_PUBLIC_` variable.
