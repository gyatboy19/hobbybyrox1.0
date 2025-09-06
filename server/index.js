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
app.use(uploadRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Upload server listening on " + PORT));
