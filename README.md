# Serenity — Vercel Edition

Serenity is a memory-aware AI emotional-support companion. This version removes the paid n8n dependency and runs the former workflow as TypeScript inside Vercel Functions.

Serenity is designed for emotional support and reflection. It is not a replacement for professional therapy, medical diagnosis, or emergency care.

## Architecture

```text
React + Vite frontend
        |
        v
Vercel /api/chat
        |
        +-- Crisis detection and safety response
        +-- Mood analysis
        +-- User profile / memory / history orchestration
        |
        +----> Groq (Llama 3.3 70B)
        |
        +----> Supabase
               +-- therapy_users
               +-- therapy_messages
               +-- therapy_memories
               +-- therapy_mood_logs
               +-- therapy_crisis_logs
```

## What replaced the n8n nodes

| Old n8n step | Vercel implementation |
| --- | --- |
| Chat trigger + Parse Input | `api/chat.ts` request handler |
| Crisis Detection + IF | `server/safety.ts` |
| Crisis Response | `server/safety.ts` + Supabase logging |
| Fetch profile / memories / history | `server/supabase.ts` |
| Build Context + Groq Therapist | `server/groq.ts` |
| Parse GPT Response | `server/memory.ts` |
| Save messages / mood / memories | `server/supabase.ts` |
| Forget expired memories | `deleteExpiredMemories()` |
| Output to User | `/api/chat` JSON response |
| Stored history webhook | `/api/history` |

The migration also separates `userId` from `sessionId`. A browser keeps one stable user ID while every new conversation receives a new session ID. This lets long-term memories survive across conversations.

## Deploy to Vercel

1. Create a new GitHub repository or replace the old Serenity repository contents with this folder.
2. Open Vercel and choose **Add New → Project**.
3. Import the GitHub repository.
4. Vercel should detect **Vite** automatically.
5. Leave **Root Directory** as the repository root.
6. Build command: `npm run build`.
7. Output directory: `dist`.
8. In **Project Settings → Environment Variables**, add:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile
```

10. Add the variables to Production, Preview and Development if you want all three environments to work.
11. Deploy.

There is no `N8N_WEBHOOK_URL` anymore.

## Supabase

If your existing Serenity tables already match the schema, keep them. If you are starting with a new Supabase project, open **SQL Editor**, paste `supabase/schema.sql`, and run it once.

The service-role key must remain server-side. It is used only by the Vercel Functions and is never sent to the browser.

## Run locally

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in your own keys. For testing the complete Vercel API routes locally, install the Vercel CLI and run:

```bash
npx vercel dev
```

For frontend-only development:

```bash
npm run dev
```

## Safety note

The keyword crisis filter is a prototype safety layer, not a clinically validated risk classifier. The supplied crisis response points Indian users to the Government of India Tele-MANAS service at `14416`. Before any real-world health deployment, add professional clinical review, authentication/authorization, privacy and data-retention controls, stronger safety evaluation, and a human escalation process.
