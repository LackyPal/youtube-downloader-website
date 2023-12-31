const express = require("express");
const app = express();
const ytdl = require("ytdl-core");

const ffmpegPath = require("ffmpeg-static");
const cp = require("child_process");

// Set up the template engine
app.set("view engine", "ejs");

app.set("views", __dirname + "/views");
app.use(express.static(__dirname + "/public"));

// set up rate limiter: maximum of ten requests per minute
const RateLimit = require("express-rate-limit");
const limiter = RateLimit({
  windowMs: 1*60*1000, // 1 minute
  max: 10
});
// apply rate limiter to all requests
app.use(limiter);

// Routes
app.get("/", (req, res) => {
  res.render("index", { error: null });
});

app.get("/download", async (req, res) => {
  try {
    const videoItags = [160, 132, 133, 134, 135, 136, 137];
    const url = req.query.url;

    const info = await ytdl.getInfo(url);

    const title = info.videoDetails.title;
    const thumbnail = info.videoDetails.thumbnail.thumbnails.reduce(
      (prev, curr) => {
        return curr.width > prev.width ? curr : prev;
      }
    );
    const channel = info.videoDetails.ownerChannelName;
    const duration = info.videoDetails.lengthSeconds;

    const urlInfo = { title, thumbnail, channel, duration };

    const videoFormats = ytdl
      .filterFormats(info.formats, "videoonly")
      .filter((format) => videoItags.includes(format.itag));

    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");

    res.render("download", {
      url,
      urlInfo,
      videoFormats,
      audioFormats,
      error: null,
    });
  } catch (error) {
    res.render("index", { error: "Invalid YouTube URL" });
  }
});

app.get("/download/video", async (req, res) => {
  const { url, quality } = req.query;

  const info = await ytdl.getBasicInfo(url);
  res.header(
    "Content-Disposition",
    `attachment; filename="${info.videoDetails.title}_${quality}.mp4"`
  );
  res.header("Content-Type", "video/mp4");

  const videoStream = ytdl(url, { quality, format: "mp4" });
  const audioStream = ytdl(url, { quality: "highestaudio" });
  // create the ffmpeg process for muxing

  let ffmpegProcess = cp.spawn(
    ffmpegPath,
    [
      // supress non-crucial messages
      "-loglevel",
      "8",
      "-hide_banner",

      // input audio and video by pipe
      "-i",
      "pipe:3",
      "-i",
      "pipe:4",

      // map audio and video correspondingly
      "-map",
      "0:a",
      "-map",
      "1:v",

      // no need to change the codec
      "-c",
      "copy",

      // output mp4 and pipe
      "-f",
      "matroska",
      "pipe:5",
    ],
    {
      // no popup window for Windows users
      windowsHide: true,

      stdio: [
        "inherit",
        "inherit",
        "inherit",

        // and pipe audio, video, output
        "pipe",
        "pipe",
        "pipe",
      ],
    }
  );

  audioStream.pipe(ffmpegProcess.stdio[3]);
  videoStream.pipe(ffmpegProcess.stdio[4]);

  ffmpegProcess.stdio[5].pipe(res);
});

app.get("/download/audio", async (req, res) => {
  const { url, quality } = req.query;

  const info = await ytdl.getBasicInfo(url);

  res.header(
    "Content-Disposition",
    `attachment; filename="${info.videoDetails.title}_${quality}.mp3"`
  );
  res.header("Content-Type", "audio/mpeg");

  ytdl(url, { quality, format: "mp3" }).pipe(res);
});

const port = process.env.PORT || 3000;
// Start the server
app.listen(port, () => {
  console.log("Server is running");
});
