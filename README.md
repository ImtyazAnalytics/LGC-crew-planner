# Crew Planner

Simple crew availability and scheduling website.

## What is included

- Dashboard
- Daily crew assignments
- Available crew search by date
- 3-day look ahead
- Crew master list
- Project master list
- Conflict prevention for double booking
- "No Crew Needed" option
- Responsive phone/desktop design
- Supabase shared database support
- Local demo mode if Supabase is not configured

## Easiest deployment

1. Create a new GitHub repository called `crew-planner`.
2. Upload every file and folder from this project.
3. In Vercel, choose **Add New Project**.
4. Import the `crew-planner` GitHub repository.
5. Click **Deploy**.

The website will work immediately in Local/Demo Mode.

IMPORTANT: Local/Demo Mode stores data only in that browser. Other engineers will not see the same data.

## Make it shared for all engineers

1. Create a free Supabase project.
2. Open **SQL Editor** in Supabase.
3. Open `supabase/schema.sql` from this project and run the entire SQL.
4. In Supabase go to **Project Settings > API**.
5. Copy:
   - Project URL
   - anon / public key
6. Open your Vercel project:
   **Settings > Environment Variables**
7. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
8. Redeploy the Vercel project.

After that, everyone using the website sees the same crew schedule.

## Recommended next upgrades

- User login
- Engineer accounts
- Manager/Admin permissions
- Edit assignments
- Crew requested/approved workflow
- 7-day calendar
- Export daily report to Excel/PDF
- Email notifications
- Equipment scheduling
