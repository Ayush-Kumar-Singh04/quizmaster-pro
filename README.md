# QuizMaster Pro 🧠

> Turn any PDF, PPTX, or DOCX into an instant AI-powered quiz. Solo modes, Arena multiplayer, full history — all free to host.

## Features
- 📄 **Upload any document** — PDF, PowerPoint, Word, or plain text
- 🎯 **Smart MCQs** — Claude AI generates targeted questions (you pick count)
- ⏱️ **Three modes** — Practice (see answer live), Timed (countdown per question), Exam (score at the end)
- ⚔️ **Arena Mode** — Real-time multiplayer rooms, live leaderboard, confetti animations
- 📊 **Full History** — Solo: last 50 sessions. Arena: last 20 matches in Supabase
- 🆓 **100% Free to host** — Netlify + Supabase free tiers + user's own Anthropic key

## Tech Stack
| Layer | Technology | Cost |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Free |
| AI | Claude Sonnet 4 (Anthropic API) | User's key |
| Solo storage | Browser localStorage | Free |
| Arena multiplayer | Supabase Realtime (free tier) | Free |
| Hosting | Netlify / Vercel | Free |

---

## Quick Start (Local Dev)

```bash
git clone https://github.com/YOUR_USERNAME/quizmaster-pro
cd quizmaster-pro
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY if you want Arena
npm run dev
```

Open http://localhost:5173 → go to Settings → add your Anthropic API key.

---

## Deploy to Netlify (Free, Recommended)

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → Import from Git
3. Build settings (auto-detected):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Under **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy** → live in ~2 minutes at `your-site.netlify.app`

---

## Deploy to Vercel (Free, Alternative)

1. Push to GitHub
2. [vercel.com](https://vercel.com) → **New Project** → Import
3. Framework detected automatically as Vite
4. Add the same two env vars in Vercel dashboard
5. Deploy → live at `your-site.vercel.app`

---

## Arena Multiplayer Setup (Supabase Free Tier)

1. Create a free project at [supabase.com](https://supabase.com) (no credit card)
2. Go to **SQL Editor** and paste + run the schema from `src/lib/supabase.js` (the `SUPABASE_SCHEMA` export)
3. Go to **Project Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`
4. Add these to Netlify/Vercel env vars (or `.env.local` for dev)
5. Supabase free tier: **500MB database, 2GB bandwidth, unlimited realtime connections** — handles hundreds of concurrent games

---

## How it Works

### Solo Quiz
1. Upload a file → text is extracted client-side (no server needed)
2. Configure: question count (5–50), mode, difficulty
3. Claude API call → JSON array of MCQs generated
4. Answer questions → get score + explanations
5. Result saved to localStorage (last 50 sessions)

### Arena Mode
1. Host uploads files → questions generated
2. A room code is created in Supabase
3. Players join with the code
4. Host starts → all players see same question in sync via Supabase Realtime
5. Timer counts down per question
6. Live leaderboard updates as players answer
7. Final results with confetti + top 3 podium
8. Match saved to Supabase history (last 20 matches)

---

## Anthropic API Key
Each user adds their own key in Settings. It's stored in `localStorage` — **never sent anywhere except directly to api.anthropic.com** over HTTPS.

New accounts get **$5 free credits** — enough for hundreds of quizzes.

[Get your API key →](https://console.anthropic.com/account/keys)

---

## Project Structure
```
src/
  components/
    Layout.jsx     # Nav + page wrapper
    UI.jsx         # Reusable components
  lib/
    aiGenerator.js # Claude API → MCQ generation
    fileParser.js  # PDF/DOCX/PPTX text extraction
    storage.js     # localStorage helpers
    supabase.js    # Supabase client + schema
    confetti.js    # Celebration effects
  pages/
    Home.jsx       # Landing page
    Quiz.jsx       # Solo quiz flow
    Arena.jsx      # Multiplayer arena
    History.jsx    # Past sessions
    Settings.jsx   # API key + hosting guide
  App.jsx          # Router
  main.jsx         # Entry point
  index.css        # Tailwind + custom styles
```
