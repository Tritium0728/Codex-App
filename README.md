# Codex — Game Studio OS

Production-ready Next.js app with Supabase backend.

---

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage)
- **Hosting:** Vercel
- **Auth:** Supabase Auth (email/password + magic link)
- **Realtime:** Supabase Realtime (team chat, task updates)

---

## Setup — Step by Step

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name, region closest to your users, strong database password
3. Wait ~2 minutes for provisioning

### 2. Run the Database Migration

1. In Supabase dashboard → **SQL Editor**
2. Open `supabase/migrations/001_initial_schema.sql`
3. Paste the entire contents and click **Run**
4. You should see "Success. No rows returned"

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Find these in Supabase → **Settings → API**

### 4. Configure Supabase Auth

In Supabase dashboard → **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` (dev) / your Vercel URL (prod)
- Redirect URLs: Add `http://localhost:3000/auth/callback`

### 5. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A — GitHub (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables (same as `.env.local` but with your production URL)
4. Deploy

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
```

### After Deploying

1. Copy your Vercel URL (e.g. `https://codex-app.vercel.app`)
2. In Supabase → **Authentication → URL Configuration**:
   - Update Site URL to your Vercel URL
   - Add `https://your-app.vercel.app/auth/callback` to Redirect URLs
3. In Vercel → Settings → Environment Variables:
   - Update `NEXT_PUBLIC_APP_URL` to your Vercel URL

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, fonts, metadata
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Design tokens, animations
│   ├── auth/
│   │   ├── login/page.tsx      # Login
│   │   ├── signup/page.tsx     # Signup
│   │   ├── callback/route.ts   # Email confirmation handler
│   │   └── signout/route.ts    # Sign out
│   └── dashboard/
│       ├── page.tsx            # Project list
│       └── [id]/page.tsx       # Individual project (server)
├── components/
│   ├── ProjectApp.tsx          # Main app client component
│   └── NewProjectButton.tsx    # Create project modal
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── middleware.ts       # Auth session refresh
│   ├── db.ts                   # All database queries
│   └── genres.ts               # Genre template definitions
└── types/
    └── index.ts                # TypeScript types

supabase/
└── migrations/
    └── 001_initial_schema.sql  # Full database schema
```

---

## Key Features

| Feature | Implementation |
|---------|---------------|
| Auth | Supabase Auth (email/password) |
| Per-project data isolation | Row Level Security (RLS) |
| Real-time team chat | Supabase Realtime subscriptions |
| Project invites | Invite codes with expiry |
| GDD auto-save | 1s debounce → Supabase upsert |
| Multi-genre templates | 9 templates in `genres.ts` |
| AI pitch generation | Copy-to-clipboard + open provider |
| GitHub Dev Feed | GitHub REST API (no auth needed for public repos) |
| Mobile-first | Responsive, no iOS zoom, 72px tab bar |

---

## Adding Features

### New tab/section
1. Add to `TABS` array in `ProjectApp.tsx`
2. Add to `FULL_LABELS`
3. Add database table in `supabase/migrations/`
4. Add queries in `lib/db.ts`
5. Add types in `types/index.ts`
6. Render in the content area

### New AI provider
Add to `AI_PROVIDERS` in `ProjectApp.tsx`:
```ts
myprovider: {
  name: 'My AI', icon: '⬡', color: '#ff0000',
  url: 'https://myai.com/chat'
}
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | For admin operations |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app's base URL |

---

## Pricing Tiers (when you add billing)

Recommended: [Stripe](https://stripe.com) + [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

| Tier | Price | Projects | Members |
|------|-------|----------|---------|
| Solo | Free | 1 | 1 |
| Studio | $12/mo | Unlimited | 10 |
| Investor Ready | $29/mo | Unlimited | Unlimited |

---

Built with Next.js, Supabase, and Claude.
