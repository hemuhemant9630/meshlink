# MeshLink

A LinkedIn-style professional network for **MuleSoft & Salesforce** people. It has a Salesforce Lightning-inspired UI, and one **city filter** applies across the whole app.

## Features

| Area | What you can do |
|---|---|
| **Feed** | Post updates with topics (MuleSoft, Salesforce, Architecture, Careers, Certifications), like, comment, delete, and switch between Everyone and My network |
| **Network** | Discover people by name, company, skill, open-to-work or hiring; send, accept, ignore or withdraw connection requests; manage connections |
| **Profiles** | Headline, role, company, city, years of experience, skills, certifications, bio, open-to-work and hiring badges, activity |
| **Messaging** | 1:1 conversations with unread counts; the thread auto-refreshes every 4 seconds |
| **Groups** | Create city or global groups, join and leave them, post group discussions, see members |
| **Meetups** | Host in-person or online meetups (optionally under a group) with capacity; RSVP and see attendees |
| **Jobs** | Post jobs, filter by work mode or type, Easy apply with a note; posters move applicants through Applied → Shortlisted → Interviewing → Offered/Rejected |
| **Notifications** | Connection requests and acceptances, likes, comments, group joins, RSVPs, applications, status changes |
| **Search** | Global search across people, posts, jobs and groups |
| **City filter** | Header dropdown stored in a cookie; it filters the feed, people, groups, meetups (plus online) and jobs (plus remote) |

**Stack:** Next.js 15 (App Router and Server Actions) · Postgres on Neon (`@neondatabase/serverless` HTTP driver) · JWT session cookies (`jose`) · `bcryptjs` · plain CSS.

## Deploy (Vercel + Neon)

1. Import this repo in Vercel (**Add New → Project**).
2. In the project, open **Storage → Create Database → Neon** and connect it to the project. This sets `DATABASE_URL` automatically.
3. Optional: add an `AUTH_SECRET` environment variable (any long random string).
4. **Redeploy.** The build runs `scripts/migrate.mjs`, which creates the tables and seeds demo data on an empty database.

Demo login: `demo@meshlink.dev` / `demo1234`. All seeded users share the same password.

## Local development

```bash
cp .env.example .env.local   # point DATABASE_URL at Neon or a local Postgres
npm install
npm run db:migrate           # create tables and seed demo data
npm run dev
```

Set `SKIP_SEED=1` to create tables without demo data.
