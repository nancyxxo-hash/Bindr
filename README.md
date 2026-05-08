Bindr
A professional networking app prototype — connecting the business community with their perfect match.
Mission
Connecting the business community with their perfect match.
Vision
Creating sustainable relationships between users.

Project Structure:
bindr/
├── index.html              Landing page
├── login.html              Login / Sign up entry (binder cover)
├── subscriptions.html      Subscription tiers
├── signup-personal.html    Personal sign-up form
├── signup-corporate.html   Corporate sign-up form
├── signup-student.html     Student sign-up form
├── home.html               Swipe home (post-login)
├── profile.html            Personal profile
├── matches.html            Matched profiles
├── messages.html           Direct messages
├── notifications.html      Notifications
├── dashboard.html          Dashboard
├── addons.html             Paid add-ons
├── content.html            Blog / news / media
├── map.html                Map of active profiles
├── community.html          Community feed
├── about.html              About the company
├── css/styles.css          All shared styling
├── js/app.js               Interactivity (swipe, login, navigation)
├── vercel.json             Vercel routing config
└── README.md

Local preview
Just open index.html in a browser, or serve it with any static server:

# Option 1: Python
python3 -m http.server 3000

# Option 2: Node (npx)
npx serve .

Deploying to Vercel

Push this folder to a GitHub repository.
Go to https://vercel.com/new and import the repo.
Vercel auto-detects this as a static site — no build step needed. Click Deploy.
Done. Your prototype is live.

Design notes

Bindr purple palette: #805AD5 brand, #6B46C1 accents, #B794F4 highlights, white paper.
Aesthetic: every signed-in page is styled as a binder page — rings on the left edge, navigation tabs sticking out on the right.
Navigation: the right-side tabs (Home, Profile, Messages, Matches, Extras) link the core authenticated experience.
Mock data: profile cards, matches, messages, and content are populated from js/app.js. No backend.

What's interactive

Login/signup forms expand inline on the cover page.
Home page lets you swipe left (✕) / right (✓) through mock profiles. Right-swipes appear on the matches page.
Match state, profile edits, and "current user" persist in localStorage across pages within the session.

Tagline

Bindr — Organizing Success.
