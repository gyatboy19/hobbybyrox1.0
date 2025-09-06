# hobbybyrox1.0 — Persistent image uploads

This adds a tiny Node server that commits uploaded images to your GitHub repo so they persist and your site redeploys with the new assets.

## What changed
- **admin.js**: Now prefers uploading files to `/api/upload-image` and falls back to the original local dataURL behavior if the server is unavailable.
- **server/**: Small Node server exposing `/api/upload-image`, which writes images into `public/uploads/` in this repo via Git commits.
- **public/uploads/.keep**: Ensures the folder exists in the repo/site.

## Deploy (Render or Vercel)

1. **Create a Web Service** from this repo, with root set to `server/`.
2. **Environment variables** (see `.env.example`):
   - `GITHUB_TOKEN` — fine-grained PAT with Contents: Read & Write on this repo
   - `GITHUB_OWNER=gyatboy19`
   - `GITHUB_REPO=hobbybyrox1.0`
   - `GITHUB_BRANCH=main` (or your default)
   - `MEDIA_DIR=public/uploads`
3. Start command: `npm start`

If hosted on a different origin than your static site, set `UPLOAD_BASE` in `admin.js` to that server's URL (e.g., `https://hobbybyrox1.0-upload.onrender.com`).

## How it works
1. Admin selects a file → `admin.js` calls `/api/upload-image`.
2. The server creates a Git blob → tree → commit → updates the branch.
3. Your static host (GitHub Pages/Netlify/Vercel) redeploys on commit.
4. The endpoint returns a URL like `/uploads/<file>`, which the admin saves and your site uses.

## Optional
- Add another endpoint to persist your product catalog (e.g., write `data/products.json`) using the same commit flow.

---

## Quick Deploy

### Deploy on Vercel
1. In the Vercel dashboard, create a **New Project** → Import your repo.
2. Set the root directory to `server/`.
3. It will detect `package.json` and build automatically.
4. Add your environment variables in **Settings → Environment Variables** (see `.env.example`).
5. Ensure your `vercel.json` (included) is committed.

### Deploy on Render
1. Log into [Render](https://dashboard.render.com/).
2. Click **New → Web Service**, pick your repo.
3. Set root directory to `server/`.
4. Build command: `npm install`, Start command: `npm start`.
5. Add environment variables as per `.env.example`.
6. Optionally use `render.yaml` (included) for Infrastructure-as-Code.


## Hosting quickstart

### Render (recommended for simplicity)
- Click **New + → Blueprint** and select this repo (or use the Render Dashboard to create a Web Service with `rootDir: server`).
- Render will use `render.yaml` and set up the service. Add your `GITHUB_TOKEN` in the environment.

### Vercel
- Import the repo → set **Root Directory** to `/` (project root). Vercel will use `vercel.json` to run the server from `server/index.js`.
- In Project Settings → Environment Variables, add the same vars as above including `GITHUB_TOKEN`.

> If your static site is deployed elsewhere (GitHub Pages/Netlify), that's fine. The upload server can live on Render/Vercel; just set `UPLOAD_BASE` in `admin.js`.


> This bundle is pre-configured for the repository name **hobbybyrox1.0**.