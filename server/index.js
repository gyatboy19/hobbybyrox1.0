import express from "express";
import uploadRoute from "./upload-to-github.js";

const app = express();

// Allow cross-origin requests (so GitHub Pages can call Render)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Simple health check (also helps warm up the free instance)
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Upload routes (/api/upload-image, /api/save-products)
// Quick env check (does NOT expose the token)
app.get("/health/env", (req, res) => {
  res.json({
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH,
    mediaDir: process.env.MEDIA_DIR,
    hasToken: !!process.env.GITHUB_TOKEN
  });
});
app.use(uploadRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Upload server listening on " + PORT));
