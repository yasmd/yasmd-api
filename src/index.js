import express from "express";
import ytdl from "ytdl-core";

const app = express();
app.use(express.json());

app.post("/", (req, res) => {
  if (req.body.url !== undefined) {
    res.setHeader("Content-disposition", "attachment; filename=video.mp4");
    res.writeHead(200, { "Content-Type": "video/mp4" });
    ytdl(req.body.url, {
      quality: "highestvideo",
      filter: "audioandvideo",
    }).pipe(res);
  } else {
    res.json({ error: "No video URL defined" });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
