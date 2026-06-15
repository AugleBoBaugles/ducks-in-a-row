# Developer Setup Guide

Everything you need to go from a fresh clone to a running local demo.

---

## Prerequisites

- **Node.js v18 or higher** (the project uses native `fetch` and ES modules — both require 18+)
  - Check yours: `node --version`
  - Download: https://nodejs.org
- A **Groq API key** (free) — for Whisper transcription and the LLM
- A **Google Cloud API key** with the Text-to-Speech API enabled (free tier: 1M characters/month)

---

## 1. Clone the repo

```bash
git clone <repo-url>
cd ducks-in-a-row
```

---

## 2. Install dependencies

```bash
npm install
```

This installs everything — Express, the Groq SDK, React, Vite, and dev tools.

---

## 3. Set up your API keys

Create a `.env` file in the project root (it's gitignored, so your keys stay local):

```bash
# .env
GROQ_API_KEY=your_groq_key_here
GOOGLE_TTS_KEY=your_google_tts_key_here
```

### Getting a Groq API key

1. Go to [console.groq.com](https://console.groq.com) and sign up / log in
2. Navigate to **API Keys** and create a new key
3. Copy the key into `.env` as `GROQ_API_KEY`

### Getting a Google Cloud TTS key

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project (or use an existing one)
2. Search for **"Cloud Text-to-Speech API"** and enable it
3. Go to **APIs & Services → Credentials → Create Credentials → API key**
4. Copy the key into `.env` as `GOOGLE_TTS_KEY`
5. (Optional but recommended) Restrict the key to only the Cloud Text-to-Speech API

---

## 4. Run the dev server

```bash
npm run dev
```

This starts two processes side by side:

| Process | Port | What it does |
|---------|------|--------------|
| Express backend | `3000` | Handles `/transcribe` and `/tts` API routes |
| Vite dev server | `5173` | Serves the React frontend, proxies API calls to Express |

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 5. Use the app

1. Click the duck to start speaking
2. Talk about what you need to get done today — the duck will ask follow-up questions
3. Click the duck again to stop recording
4. The duck's reply will appear as text and play as audio
5. After a few turns, the duck generates a schedule and the app switches to the plan view
6. On the plan view, you can keep talking to the duck in the right panel to refine the plan

> **Tip:** Allow microphone access when the browser prompts. If you accidentally deny it, go to your browser's site settings for `localhost` and reset permissions.

---

## Project structure

```
ducks-in-a-row/
├── server.js               Express server — API routes, session management
├── vite.config.js          Vite build config (root points to client/)
├── services/
│   ├── transcription.js    Groq Whisper — audio → text
│   ├── rubberDucky.js      Groq Llama — text + history → duck reply + schedule JSON
│   └── tts.js              Google Cloud TTS — text → base64 MP3 audio
├── client/
│   ├── index.html          HTML entry point for the React app
│   ├── public/
│   │   └── duck.svg        Duck illustration (SVG)
│   └── src/
│       ├── main.jsx        React entry point — mounts App into #root
│       ├── App.jsx         Top-level component — switches between pages
│       ├── index.css       Global dark theme CSS variables
│       ├── pages/
│       │   ├── ConversationPage.jsx    Opening screen — duck + recording
│       │   └── SchedulePage.jsx        Plan view — 3-column layout
│       ├── components/
│       │   ├── ScheduleCalendar.jsx    Hourly day-view timeline
│       │   ├── TodoList.jsx            Interactive task checklist
│       │   └── DuckPanel.jsx           Compact duck for schedule page edits
│       └── hooks/
│           ├── useRecorder.js          MediaRecorder wrapper
│           ├── useSession.js           Session ID persistence
│           └── useAudioPlayback.js     Base64 audio playback
└── .env                    API keys — DO NOT commit this file
```

---

## Available scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start Express + Vite together (use this for development) |
| `npm run start` | Start Express only (backend, port 3000) |
| `npm run client` | Start Vite only (frontend, port 5173) |
| `npm run build` | Build the React app to `client/dist/` for production |

---

## Troubleshooting

**"Microphone access denied"**
Go to your browser's address bar → click the lock/info icon → reset microphone permissions → reload.

**"GOOGLE_TTS_KEY environment variable is not set"**
You haven't created the `.env` file, or it's missing that key. The transcription and LLM still work — you just won't get audio playback.

**The duck never generates a schedule**
The LLM needs a few turns to gather information. Tell it your tasks, your available time, and your energy level. If it still doesn't produce a schedule after 5+ turns, check the server console for LLM errors.

**Port 3000 or 5173 already in use**
Something else is using that port. Kill it with `npx kill-port 3000` (or 5173), then re-run `npm run dev`.
