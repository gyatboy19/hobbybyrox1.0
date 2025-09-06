import express from "express";
import uploadRoute from "./upload-to-github.js";

const app = express();

// ----- CORS (GitHub Pages -> Render) -----
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ----- Health checks -----
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/health/env", (req, res) => {
  res.json({
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH,
    mediaDir: process.env.MEDIA_DIR,
    hasToken: !!process.env.GITHUB_TOKEN
  });
});

// ----- Upload APIs (/api/upload-image, /api/save-products) -----
app.use(uploadRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Upload server listening on " + PORT));
