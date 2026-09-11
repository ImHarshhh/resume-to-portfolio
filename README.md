# ResumeCoded

Upload your resume (PDF or text) → get a full portfolio website → customize → get a **live deployed URL**.

## Run locally

```bash
cd resume-to-portfolio
npm install
npm run dev
# open http://localhost:3000
```

## Flow

1. **Upload** — PDF parsed in-browser with pdf.js, or paste text, or try sample.
   - Heuristic parser (`lib/resumeParser.ts`) extracts name, title, contact, summary, skills, experience, projects, education, awards. No API key needed.
2. **Customize** — 4 templates (aurora / editorial / terminal / pop), accent colors, fonts, dark mode, section toggles, full content editing with live preview.
3. **Deploy** — standalone `index.html` generated (`lib/staticExport.ts`):
   - **No token:** Download HTML → drag to `app.netlify.com/drop` → instant URL
   - **Netlify token:** one-click deploy via `/api/deploy/netlify` → returns `https://xxx.netlify.app`
   - **Vercel token:** one-click deploy via `/api/deploy/vercel` → returns `https://xxx.vercel.app`
   - Also: Download ZIP.

## Deploy this generator itself

```bash
npx vercel --prod
# or
npm run build && npm start
```
