# Elections

Election research is scattered across campaign sites, Ballotpedia, news articles, voting
records, and candidate statements — and most of it is noise relative to what a single voter
actually cares about. This tool centralizes that content into one place and filters it through
your own priorities, so a candidate's platform, background, past actions, and fundraising are
visible alongside how well they actually match what you value — not just what they say about
themselves.

It's built for one user (configurable via `DEFAULT_USER_ID`), with upcoming 2026 California
races and measures/propositions as the initial scope. Every fact shown is backed by a citation
back to its source; nothing is asserted without one.

## What it does

- **One page per race:** candidates for a position, side by side, filterable by party and topic.
- **One page per candidate:** platform, past policies and their effects, voting history, campaign
  finance, and background — each bullet cited back to where it came from (campaign sites,
  Ballotpedia, news coverage, government records).
- **Priorities, not just opinions:** rank the topics you care about (economy, housing, public
  safety, etc.) and pick a side on each. The app uses that ranking to compute an alignment score
  per candidate and to highlight which of their specific bullets match or conflict with your
  stated priorities — in place, right where you're reading them.
- **Ratings:** a per-topic read on where a candidate leans, derived from how their platform and
  past actions are tagged, independent of your own priorities.
- **Comparison view:** put 2–5 candidates in the same race side by side.
- **Sources list:** the set of sources data is pulled from, so you can see what's being relied on
  and exclude ones you don't trust.
- **AI summaries:** a short, citation-grounded summary per candidate, generated from the same
  sourced content already on their page (currently run as a reviewed job queue rather than a live
  API call, until an API key is wired up).

## Why

Most voters either skim a few headlines, rely on a party label, or give up and leave a race
blank. The information to make a better decision usually exists, but it's spread across a dozen
sources, inconsistent in depth, and not organized around what any particular voter actually
weighs most. This tool's job is to do that organizing work once — pull the scattered content
into one consistent structure, cite everything, and surface it through the lens of your own
stated priorities — so a few minutes of reading goes further than an hour of searching.

## Stack

Next.js (App Router) + Prisma + Postgres (Supabase), deployed to Vercel. Data is populated via
an offline ingestion pipeline (`ingestion/`), never scraped live in the request path.

## Local development

```bash
pnpm install
pnpm db:deploy   # apply migrations
pnpm db:seed     # seed topics + default user
pnpm dev         # http://localhost:3001
```

Requires a `.env` with `DATABASE_URL` / `DIRECT_URL` (Supabase Postgres) and `DEFAULT_USER_ID`.
See `.env.example`.
