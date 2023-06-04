import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.json({ error: "No input specified." });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
