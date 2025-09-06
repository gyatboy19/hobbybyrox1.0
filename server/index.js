import express from "express";
import uploadRoute from "./upload-to-github.js";

const app = express();
app.use(uploadRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Upload server listening on " + PORT));
