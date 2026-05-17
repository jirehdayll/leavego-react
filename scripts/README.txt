Admin scripts (Node + service role, local machine only)
========================================================

1. Copy scripts/env.admin.example to the project root as .env.admin
2. Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API
3. Run:

   npm run admin:create-user -- email@denr.gov.ph 'TempPassword123' '{"full_name":"Juan Dela Cruz","role":"employee"}'

   npm run admin:delete-user -- <uuid-from-auth-users>

Do not commit .env.admin.

Database migrations (auth HTTP 500, RLS): run migrations/fix_auth_grant_and_profiles_rls.sql in Supabase SQL Editor — see migrations/MIGRATIONS.txt
