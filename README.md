# Quote Master Tracker — Web Edition (skeleton)

This is Phase 1: a working, deployed pipeline — GitHub → Cloudflare Pages →
Supabase Auth + Postgres — with a placeholder dashboard confirming everything
is connected. The actual dashboard (Account Summary View, Add Quotation, Gold
Wire Adder, Mini CRM, Cost Analysis, Raw Material Prices) gets built into this
shell over the next several rounds.

Do these in order — each step depends on the one before it.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's created, go to **SQL Editor → New Query**, paste the entire
   contents of `supabase/schema.sql`, and click **Run**. This creates all 6
   tables with Row Level Security already turned on.
3. Go to **Settings → API**. Copy the **Project URL** and the **anon public**
   key — you'll need both in step 3.
4. Go to **Authentication → Providers** and make sure **Email** is enabled
   (it is by default). Optionally, under **Authentication → Settings**, you
   can turn off "Confirm email" if you don't want the email-confirmation step
   for a single-user internal tool — up to you.

## 2. Push this code to GitHub

```
git init
git add .
git commit -m "Initial skeleton: auth + Supabase + Cloudflare Function"
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 3. Create the Cloudflare Pages project

1. Go to the Cloudflare dashboard → **Workers & Pages → Create → Pages →
   Connect to Git**, and pick the repo you just pushed.
2. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Before the first deploy, go to **Settings → Environment variables** and
   add these for the **Production** environment:
   - `VITE_SUPABASE_URL` — the Project URL from step 1.3
   - `VITE_SUPABASE_ANON_KEY` — the anon public key from step 1.3
   - `ANTHROPIC_API_KEY` — your Anthropic API key, mark this one as **Secret**
     (this is what `functions/api/*.js` use — it's never sent to the browser)
4. Click **Save and Deploy**.

## 4. Verify it worked

Open the deployed URL. You should see a sign-up/sign-in screen. Create an
account (check your email to confirm, if confirmation is on), sign in, and
you should land on a page showing "✓ Signed in and connected to Supabase"
with all 6 table row counts at 0.

If you see a red error box instead, it's almost always one of:
- The schema wasn't run in Supabase (redo step 1.2)
- The environment variables in Cloudflare Pages have a typo (redo step 3.3,
  then trigger a new deployment — env var changes don't apply retroactively
  to already-built deployments)

## Local development

```
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
npm install
npm run dev
```

Note: `functions/api/*.js` (the Cloudflare Functions) don't run under plain
`npm run dev` — they only run once deployed to Cloudflare Pages, or locally
via `npx wrangler pages dev` if you want to test them before deploying.

## What's next

Tell Claude which piece to port in next — Account Summary View is the
natural starting point since everything else links back to it.
