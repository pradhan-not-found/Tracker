# Tracker landing page

The download site for Tracker: a static Next.js export (`output: 'export'`) with a live in-browser demo and a `/download/` page that detects the visitor's system and starts the right build automatically.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static site in out/
```

Download links point at the latest GitHub release (`releases/latest/download/<asset>`), so they keep working from any host. The version shown in copy, the file names and the approximate sizes live in `lib/downloads.ts`.

## Deploy

### Vercel (recommended)

1. In Vercel, **Add New → Project** and import the GitHub repository.
2. Set **Root Directory** to `landing`.
3. **Framework Preset**: Next.js (detected automatically). Keep the default build command (`npm run build`).
4. Click **Deploy**.

Canonical, Open Graph, sitemap and robots URLs use the production domain Vercel provides (`VERCEL_PROJECT_PRODUCTION_URL`). Preview deployments use their own preview URL.

Optional: for a custom domain, add the environment variable `NEXT_PUBLIC_SITE_URL=https://your-domain.com` (Production) and redeploy.

### Netlify

Base directory `landing`, build command `npm run build`, publish directory `landing/out`. Set `NEXT_PUBLIC_SITE_URL` to the site URL.

### Any static host

Run `npm run build` and upload the contents of `out/`. Set `NEXT_PUBLIC_SITE_URL` before building so canonical and social URLs are correct.

### Serving from a sub-path (e.g. GitHub Pages project site)

Build with both variables set, for example:

```bash
NEXT_PUBLIC_BASE_PATH=/Tracker NEXT_PUBLIC_SITE_URL=https://user.github.io/Tracker npm run build
```

All internal links and assets respect the base path; without it the site is served from the domain root.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Vercel production URL, then preview URL, then `http://localhost:3000` | Absolute URL used for canonical, Open Graph, sitemap, robots and JSON-LD |
| `NEXT_PUBLIC_BASE_PATH` | empty | Sub-path the site is served from |
