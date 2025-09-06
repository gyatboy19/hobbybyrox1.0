import express from "express";
import multer from "multer";
import crypto from "crypto";
import { Octokit } from "octokit";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

// Required ENV: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
// Optional ENV: GITHUB_BRANCH (default: main), MEDIA_DIR (default: public/uploads)
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner   = process.env.GITHUB_OWNER;
const repo    = process.env.GITHUB_REPO;
const branch  = process.env.GITHUB_BRANCH || "main";
const mediaDir= process.env.MEDIA_DIR || "public/uploads";

function safeName(original) {
  const base = String(original || "upload").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "");
  const ext  = base.includes(".") ? "." + base.split(".").pop() : ".jpg";
  const stem = base.replace(/\.[^.]+$/, "");
  return `${stem}-${crypto.randomUUID().slice(0,8)}${ext}`;
}

router.post("/api/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok:false, error: "No file" });
    if (!owner || !repo || !process.env.GITHUB_TOKEN) {
      return res.status(500).json({ ok:false, error: "Server missing GitHub configuration" });
    }

    const path = `${mediaDir}/${safeName(req.file.originalname)}`;

    // 1) Get latest commit on branch
    const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const latestSha = ref.object.sha;
    const { data: headCommit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: latestSha });

    // 2) Create blob from uploaded file
    const { data: blob } = await octokit.rest.git.createBlob({
      owner, repo, content: req.file.buffer.toString("base64"), encoding: "base64"
    });

    // 3) Create tree with the new file
    const { data: tree } = await octokit.rest.git.createTree({
      owner, repo, base_tree: headCommit.tree.sha,
      tree: [{ path, mode: "100644", type: "blob", sha: blob.sha }]
    });

    // 4) Create commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner, repo,
      message: `content: upload image via admin → ${path}`,
      tree: tree.sha,
      parents: [latestSha],
      author: { name: "Admin Bot", email: "bot@local", date: new Date().toISOString() }
    });

    // 5) Update branch ref
    await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha, force: false });

    // Public URL assumption: site serves files under public/ at the root.
    const publicUrl = `/uploads/${path.split("/").pop()}`;
    res.json({ ok: true, url: publicUrl, path, commit: newCommit.sha });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: "Upload failed", details: String(e?.message || e) });
  }
});

export default router;

// ---- Save structured data (catalog/hero/inspiration) into repo as JSON files ----
router.post("/api/save-products", express.json({limit: "2mb"}), async (req, res) => {
  try {
    if (!owner || !repo || !process.env.GITHUB_TOKEN) {
      return res.status(500).json({ ok:false, error: "Server missing GitHub configuration" });
    }
    const payload = req.body || {};
    const files = [
      { path: "data/products.json", content: JSON.stringify(payload.products || [], null, 2) },
      { path: "data/hero.json", content: JSON.stringify(payload.heroSlides || [], null, 2) },
      { path: "data/inspiration.json", content: JSON.stringify(payload.inspirationItems || [], null, 2) }
    ];

    // 1) get latest commit
    const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const latestSha = ref.object.sha;
    const { data: headCommit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: latestSha });

    // 2) create blobs for each file
    const blobs = await Promise.all(files.map(f => octokit.rest.git.createBlob({ owner, repo, content: Buffer.from(f.content).toString("base64"), encoding: "base64" }).then(r => ({...f, sha: r.data.sha}))));

    // 3) create tree with files
    const { data: tree } = await octokit.rest.git.createTree({
      owner, repo, base_tree: headCommit.tree.sha,
      tree: blobs.map(b => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha }))
    });

    // 4) commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner, repo, message: "content: sync admin data → data/*.json", tree: tree.sha, parents: [latestSha]
    });

    // 5) update ref
    await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha, force: false });

    res.json({ ok: true, commit: newCommit.sha });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: "Save failed", details: String(e?.message || e) });
  }
});
