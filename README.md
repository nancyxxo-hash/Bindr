# Bindr 🗂️
**Organizing Success** — A professional matching app built with plain HTML/CSS/JS + Supabase.

---

## File Structure

```
bindr/
├── index.html              ← Login / Cover page
├── subscription.html       ← Choose a plan
├── signup-personal.html    ← Personal profile creation
├── signup-corporate.html   ← Corporate profile creation
├── signup-student.html     ← Student profile creation
├── home.html               ← Main app (swipe, profile, messages, matches, extras)
│
├── css/
│   ├── global.css          ← Design system, binder aesthetic, shared styles
│   ├── login.css           ← Cover page styles
│   ├── subscription.css    ← Plan selection styles
│   ├── signup.css          ← Signup form styles
│   └── app.css             ← App tabs, swipe cards, messages, matches, extras
│
├── js/
│   ├── supabase.js         ← Supabase client (add your keys here)
│   ├── auth.js             ← Login / signup auth logic
│   ├── signup.js           ← Profile creation logic (all 3 types)
│   └── app.js              ← Swiping, tabs, messages, matches, extras
│
└── supabase-schema.sql     ← Run this in Supabase SQL editor to set up tables
```

---

## Setup

### 1. Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the **SQL Editor**, run the contents of `supabase-schema.sql` to create all tables, policies, and storage buckets.

### 2. Add Your Supabase Keys
Open `js/supabase.js` and replace the placeholder values:

```js
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
```

Find these in your Supabase dashboard under **Settings → API**.

### 3. Deploy to Vercel
1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), click **New Project**, and import your repo.
3. Vercel will auto-detect it as a static site — no build config needed.
4. Click **Deploy**.

---

## How It Works

### Auth Flow
- User clicks **Login** → email/password panel slides in → verified via Supabase Auth → redirected to `home.html`
- User clicks **Sign Up** → credentials stored in `sessionStorage` → choose plan → fill profile → profile created in Supabase DB + Storage → redirected to `home.html`

### Swiping & Matching
- Profiles from the DB are loaded into a swipe queue, filtered by account type (personal/student see corporate profiles, corporate sees personal/student)
- On right swipe: a `swipes` record is inserted; if a mutual swipe exists, a `matches` record is created and the match modal fires
- Real-time messaging via Supabase Realtime subscriptions

### Tables
| Table      | Purpose                              |
|------------|--------------------------------------|
| `profiles` | All user profiles (all 3 types)      |
| `swipes`   | Records of all left/right swipes     |
| `matches`  | Mutual match records                 |
| `messages` | Direct messages between matched users|

### Storage Buckets
| Bucket       | Contents                      |
|--------------|-------------------------------|
| `avatars`    | Profile photos / company logos|
| `portfolios` | Portfolio file attachments    |

---

## Customization
- **Bindr Purple**: change `--bindr-purple` in `css/global.css` to update the entire color palette
- **Subscription prices**: edit `subscription.html` directly
- **Extras content**: edit the `all` object in `js/app.js`
- **Profile fields**: extend the `profiles` table in Supabase and the `buildProfileFields()` function in `js/app.js`
