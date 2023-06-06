import express from "express";
import ytdl from "ytdl-core";
import { spawn } from "child_process";

const app = express();
app.use(express.json());

app.post("/yt/info", async (req, res) => {
  let info = await ytdl.getInfo(req.body.url);
  let videoDetails = info.videoDetails;
  let videoMetadata = {
    title: videoDetails.title,
    description: videoDetails.description,
    viewCount: videoDetails.viewCount,
    uploadDate: videoDetails.uploadDate,
    channelName: videoDetails.author.name,
    thumbnails: videoDetails.thumbnails,
  };
  let videoQualityInfo = [];
  info.formats.forEach((i) => {
    if (
      i.mimeType.includes("mp4") &&
      i.qualityLabel !== null &&
      i.itag !== 22 &&
      i.itag !== 18
    ) {
      videoQualityInfo.push({
        itag: i.itag,
        quality: i.qualityLabel,
      });
    }
  }); // sorts all itags and qualities available into a list
  res.send({
    videoMetadata: videoMetadata,
    videoQualityInfo: videoQualityInfo,
  });
});

app.post("/yt/dl", (req, res) => {
  if (req.body.url !== undefined || req.body.itag !== undefined) {
    res.setHeader("Content-disposition", "attachment; filename=video.mp4");
    res.writeHead(200, { "Content-Type": "video/mp4" });
    createVideo(req.body.url, req.body.itag, res);
  } else if (req.body.itag === undefined && req.body.quality !== undefined) {
    res.setHeader("Content-disposition", "attachment; filename=video.mp4");
    res.writeHead(200, { "Content-Type": "video/mp4" });
    createVideo(req.body.url, req.body.quality, res);
  } else {
    res.status(400).json({ error: "Incorrect parameters." });
  }
});

function createVideo(url, quality, res) {
  let video = ytdl(url, { quality: quality, filter: "videoonly" });
  let audio = ytdl(url, {
    filter: "audioonly",
    highWaterMark: 1 << 25,
  });

  const ffmpegProcess = spawn(
    "../util/ffmpeg",
    [
      "-i",
      "pipe:3",
      "-i",
      "pipe:4",
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-c:v",
      "copy",
      "-c:a",
      "libmp3lame",
      "-crf",
      "27",
      "-preset",
      "veryfast",
      "-movflags",
      "frag_keyframe+empty_moov",
      "-f",
      "mp4",
      "-loglevel",
      "error",
      "-",
    ],
    {
      stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
    }
  );

  video.pipe(ffmpegProcess.stdio[3]);
  audio.pipe(ffmpegProcess.stdio[4]);
  ffmpegProcess.stdio[1].pipe(res);

  let ffmpegLogs = "";

  ffmpegProcess.stdio[2].on("data", (chunk) => {
    ffmpegLogs += chunk.toString();
  });

  ffmpegProcess.on("exit", (exitCode) => {
    if (exitCode === 1) {
      console.error(ffmpegLogs);
    }
  });
}

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
