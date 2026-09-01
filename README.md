# QuizMaster Pro 🧠

> Turn any PDF, PPTX, DOCX, or text file into an instant quiz. Play solo, challenge friends in a secure real-time multiplayer Arena, or install it directly as a native Android app.

---

## 🌟 Key Features

* 📄 **Instant Document Parser** – Drop any PDF, PowerPoint, Word document, or plain text file. Text is extracted securely client-side to generate quizzes instantly.
* 🤖 **Zero-Setup Gemini AI** – Uses your server-configured Gemini API key. Visitors and app users don't have to register or create an API key—everything works seamlessly out of the box!
* ⚔️ **Synchronized Arena Mode** – Real-time multiplayer MCQ battles:
  - **Lockstep Sync**: All players answer the exact same question in sync.
  - **Shimmering Wait Lobby**: Real-time status list showing who has answered and who is still "thinking".
  - **Option Breakdowns**: Interactive post-round breakdowns with live progress percentages and stackable player avatars showing who selected what!
  - **Host Override**: A "Force Reveal Results" button allows active players to skip AFK/disconnected players.
  - **Leaderboards**: Real-time scoreboard and dynamic winner podiums with confetti celebrations.
* 🛡️ **Anti-Cheating Security Shield** – Built-in client-side restrictions designed for secure exam setups:
  - Disables right-clicks and custom context menus.
  - Disables developer tools inspect shortcuts (`F12`, `Ctrl+Shift+I`, `Cmd+Opt+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`).
  - Disables view page source (`Ctrl+U`, `Cmd+U`).
  - Blocks standard copy, cut, and paste shortcuts (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`).
  - Injects global CSS (`user-select: none`) to prevent text selection and highlight copying.
* 📱 **Native Android Ready** – Pre-wrapped with **Capacitor**, letting you open the project directly inside Android Studio and build a native mobile app in one click.
* 📊 **Device-Specific History** – Isolated local logs for both your Solo Quizzes (browser-based) and Arena Multiplayer Matches (Supabase-based) ensuring your history stays private to your own device.

---

## 🛠️ Tech Stack

| Layer | Technology | Hosting / Cost |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + Tailwind CSS + Framer Motion | Free |
| **Artificial Intelligence** | QuizMaster (Google Gemini API) | Environment Variables |
| **Realtime Sync / DB** | Supabase Realtime (Database pub/sub) | Free Tier |
| **Mobile Integration** | Ionic Capacitor | Free / Native APK |
| **Web Hosting** | Netlify or Vercel | Free Tier |

---

## 🚀 Quick Start (Local Development)

To run the web app on your local machine:

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/quizmaster-pro.git
cd quizmaster-pro

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
```

Open `.env` and fill in your keys:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Run the local development server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser!

---

## 📱 Building the Android App (.APK)

We have pre-configured the project with **Capacitor** to make native wrapping incredibly simple.

### Prerequisites:
1. Download and install **[Android Studio](https://developer.android.com/studio)**.

### Build Steps:
```bash
# 1. Compile the React Vite bundle
npm run build

# 2. Sync the compiled code to the Android platform
npx cap sync

# 3. Open the project in Android Studio
npx cap open android
```

* **To run on your connected phone**: Turn on **USB Debugging** in your phone's Developer Options, select your phone in the Android Studio top toolbar, and click the green **Play (▶)** button!
* **To generate a standalone APK**: In Android Studio, click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.

---

## ☁️ Deploying to the Web (100% Free)

Since the project features native router redirect setups (`netlify.toml` and `vercel.json`), deployment takes under 2 minutes.

### Option A: Netlify (Recommended)
1. Push your repository to **GitHub**.
2. Log into [Netlify.com](https://netlify.com) and click **Add New Site** → **Import from Git**.
3. Select your repository. Netlify will auto-detect the build details:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Under **Site Configuration → Environment Variables**, add your keys:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
5. Click **Deploy Site**!

### Option B: Vercel
1. Log into [Vercel.com](https://vercel.com) and click **New Project** → **Import** your GitHub repo.
2. Under **Environment Variables**, add the same three keys.
3. Click **Deploy**!

---

## ⚔️ Setting Up the Supabase Database (For Multiplayer)

If you are setting up your own Supabase project from scratch:
1. Create a free account at [Supabase.com](https://supabase.com).
2. Create a new database project.
3. Go to **SQL Editor** on the left dashboard, paste the SQL schema defined below, and click **Run**:

```sql
-- SQL Schema for QuizMaster Pro Multiplayer Arena

-- 1. Rooms Table
create table if not exists arena_rooms (
  id text primary key,
  host_name text not null,
  questions jsonb not null,
  status text default 'waiting',
  current_q int default 0,
  time_per_q int default 30,
  created_at timestamptz default now()
);

-- 2. Players Table  
create table if not exists arena_players (
  id uuid primary key default gen_random_uuid(),
  room_id text references arena_rooms(id) on delete cascade,
  name text not null,
  score int default 0,
  answers jsonb default '[]',
  joined_at timestamptz default now()
);

-- 3. Match History Table
create table if not exists arena_history (
  id uuid primary key default gen_random_uuid(),
  room_id text,
  players jsonb,
  questions_count int,
  played_at timestamptz default now()
);

-- Enable Realtime Pub/Sub for synchronization
alter publication supabase_realtime add table arena_rooms;
alter publication supabase_realtime add table arena_players;

-- Row Level Security (open for real-time play)
alter table arena_rooms enable row level security;
alter table arena_players enable row level security;
alter table arena_history enable row level security;
create policy "public_access" on arena_rooms for all using (true) with check (true);
create policy "public_access" on arena_players for all using (true) with check (true);
create policy "public_access" on arena_history for all using (true) with check (true);
```

4. Go to **Project Settings → API** to grab your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## 📂 Project Structure

```
src/
  components/
    Layout.jsx     # Navigation structure + Anti-cheating listeners
    UI.jsx         # Loading spinners, drop zones, timer bars
  lib/
    aiGenerator.js # Gemini MCQ Generator + Socratic Tutor
    fileParser.js  # Document parser (PDF/DOCX/PPTX)
    storage.js     # Isolated local storage engines
    supabase.js    # Supabase Client setup
    confetti.js    # Winner podium animations
  pages/
    Home.jsx       # Landing Page
    Quiz.jsx       # Solo quizzes
    Arena.jsx      # Synchronized Multiplayer Quiz
    History.jsx    # Device-isolated logs
  App.jsx          # Router
  main.jsx         # App mounting point
  index.css        # Styles + selection blockers
```
