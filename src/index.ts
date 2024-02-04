import express from "express";
import ytdl from "ytdl-core";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { Readable, Writable } from "stream";

const app = express();
app.use(express.json());

app.post("/yt/info", async (req, res) => {
  let info: ytdl.videoInfo = await ytdl.getInfo(req.body.url);
  let videoDetails: ytdl.MoreVideoDetails = info.videoDetails;
  let videoMetadata = {
    title: videoDetails.title,
    description: videoDetails.description,
    viewCount: videoDetails.viewCount,
    uploadDate: videoDetails.uploadDate,
    channelName: videoDetails.author.name,
    thumbnails: videoDetails.thumbnails,
  };
  let videoQualityInfo: Array<Object> = [];
  info.formats.forEach((i) => {
    if (
      i.mimeType?.includes("mp4") &&
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
    res.setHeader("Content-Type", "video/mp4");
    createVideo(req.body.url, req.body.itag, res);
  } else if (req.body.itag === undefined && req.body.quality !== undefined) {
    res.setHeader("Content-disposition", "attachment; filename=video.mp4");
    res.setHeader("Content-Type", "video/mp4");
    createVideo(req.body.url, req.body.quality, res);
  } else {
    res.status(400).json({ error: "Incorrect parameters." });
  }
});

function createVideo(url: string, quality: string, res: Writable) {
  let video: Readable = ytdl(url, { quality: quality, filter: "videoonly" });
  let audio: Readable = ytdl(url, {
    filter: "audioonly",
    highWaterMark: 1 << 25,
  });

  const ffmpegProcess: ChildProcessWithoutNullStreams = spawn(
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

  video.pipe(ffmpegProcess.stdio[3] as Writable);
  audio.pipe(ffmpegProcess.stdio[4] as Writable);
  ffmpegProcess.stdio[1].pipe(res);

  let ffmpegLogs = "";

  ffmpegProcess.stdio[2].on("data", (chunk: any) => {
    ffmpegLogs += chunk.toString();
  });

  ffmpegProcess.on("exit", (exitCode: number) => {
    if (exitCode === 1) {
      console.error(ffmpegLogs);
    }
  });
}

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
